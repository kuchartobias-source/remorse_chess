// Síťová vrstva: veřejný relay ntfy.sh (HTTP POST + SSE, server drží zprávy ~12 h).
// Do zpráv se neposílají žádná jména ani osobní údaje – jen tahy a stav místnosti.

const BASE = 'https://ntfy.sh/';
// Kód místnosti: 12 znaků, mód Křižáci od začátku má příponu „-k“ (stará verze stránky ji nepozná)
export const ROOM_RE = /^[a-z0-9]{12}(-k)?$/;
export const variantOfRoom = (room) => (room && room.endsWith('-k') ? 'krizaci' : 'poutnici');
// Verze protokolu = verze pravidel (rc2: Poutníci, dosah Hranic skrz vlastní figurky)
const APP = 'rc2';

export function newRoomId() {
  const a = new Uint8Array(12);
  crypto.getRandomValues(a);
  const abc = 'abcdefghijklmnopqrstuvwxyz0123456789';
  return Array.from(a, (b) => abc[b % 36]).join('');
}

export function clientId() {
  let id = null;
  try { id = sessionStorage.getItem('rc-client'); } catch (e) { /* nic */ }
  if (!id) {
    id = newRoomId().slice(0, 8);
    try { sessionStorage.setItem('rc-client', id); } catch (e) { /* nic */ }
  }
  return id;
}

export class Channel {
  constructor(room, { onMessage, onStatus }) {
    this.topic = 'kajicne-sachy-' + room;
    this.onMessage = onMessage;
    this.onStatus = onStatus || (() => {});
    this.seen = new Set();
    this.lastId = null;
    this.queue = [];
    this.sending = false;
    this.es = null;
    this.closed = false;
    this.status = 'idle';
    this.unsent = 0;
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible' && !this.closed) this.catchUp();
    });
    window.addEventListener('online', () => this.catchUp());
  }

  setStatus(s) { this.status = s; this.onStatus(s, this.unsent); }

  // Načte historii (since=all) a pak otevře živý proud; při výpadku zkouší znovu
  async connect() {
    this.setStatus('connecting');
    let delay = 2000;
    while (!this.closed && !(await this.poll())) {
      await new Promise((r) => setTimeout(r, delay));
      delay = Math.min(delay * 2, 30000);
    }
    if (!this.closed) this.openStream();
  }

  async poll() {
    let batch;
    try {
      const res = await fetch(`${BASE}${this.topic}/json?poll=1&since=all`, { cache: 'no-store' });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const text = await res.text();
      batch = [];
      for (const line of text.split('\n')) {
        if (!line.trim()) continue;
        try {
          const m = JSON.parse(line);
          if (m.event === 'message') batch.push(m);
        } catch (e) { /* poškozený řádek ignorujeme */ }
      }
    } catch (e) {
      this.setStatus('offline');
      return false;
    }
    // řazení je stabilní – zprávy ve stejné sekundě zůstanou v pořadí serveru
    batch.sort((a, b) => a.time - b.time);
    for (const m of batch) this.handle(m, true);
    if (this.status !== 'online') this.setStatus('online');
    try { this.onMessage({ k: '_synced' }, true); } catch (e) { console.error(e); }
    return true;
  }

  openStream() {
    if (this.es) this.es.close();
    // since=all + odstranění duplicit podle id – nejrobustnější i po vypršení starého id
    const es = new EventSource(`${BASE}${this.topic}/sse?since=all`);
    this.es = es;
    es.onopen = () => this.setStatus('online');
    es.onmessage = (e) => {
      try {
        const m = JSON.parse(e.data);
        if (m.event === 'message') this.handle(m, false);
      } catch (err) { /* ignorujeme */ }
    };
    es.onerror = () => {
      if (this.closed) return;
      this.setStatus('reconnecting');
      if (es.readyState === 2) {
        setTimeout(() => { if (!this.closed && this.es === es) this.openStream(); }, 3000);
      }
    };
  }

  async catchUp() {
    if (this.closed) return;
    await this.poll();
    if (!this.es || this.es.readyState === 2) this.openStream();
  }

  handle(m, fromHistory) {
    if (!m || !m.id || this.seen.has(m.id)) return;
    this.seen.add(m.id);
    this.lastId = m.id;
    let data;
    try { data = JSON.parse(m.message); } catch (e) { return; }
    if (!data || typeof data !== 'object' || typeof data.k !== 'string') return;
    if (data.app !== APP) {
      // zpráva z jiné verze hry (stará pravidla nebo neobnovená stránka soupeře)
      if (typeof data.app === 'string' && /^rc\d+$/.test(data.app)) {
        try { this.onMessage({ k: '_version', app: data.app }, fromHistory); } catch (e) { /* nic */ }
      }
      return;
    }
    try { this.onMessage(data, fromHistory); } catch (e) { console.error('Chyba při zpracování zprávy', e); }
  }

  // Odešle zprávu (fronta, opakuje při chybě). Vrací Promise, který se splní po doručení.
  send(obj) {
    const body = JSON.stringify({ app: APP, ...obj });
    return new Promise((resolve) => {
      this.queue.push({ body, resolve });
      this.unsent = this.queue.length;
      this.onStatus(this.status, this.unsent);
      this.flush();
    });
  }

  async flush() {
    if (this.sending) return;
    this.sending = true;
    let delay = 1500;
    while (this.queue.length && !this.closed) {
      const item = this.queue[0];
      try {
        const res = await fetch(BASE + this.topic, { method: 'POST', body: item.body });
        if (res.status === 429) throw Object.assign(new Error('limit'), { limit: true });
        if (!res.ok) throw new Error('HTTP ' + res.status);
        this.queue.shift();
        this.unsent = this.queue.length;
        delay = 1500;
        if (this.status === 'sendfail' || this.status === 'limited') this.status = 'online';
        this.onStatus(this.status, this.unsent);
        item.resolve(true);
      } catch (e) {
        this.status = e.limit ? 'limited' : 'sendfail';
        this.onStatus(this.status, this.unsent);
        await new Promise((r) => setTimeout(r, delay));
        delay = Math.min(delay * 2, e.limit ? 60000 : 20000);
      }
    }
    this.sending = false;
  }

  close() {
    this.closed = true;
    if (this.es) this.es.close();
  }
}
