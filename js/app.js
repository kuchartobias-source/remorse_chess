// Kajícné šachy – aplikace (lobby, deska, online hra)
import * as E from './engine.js';
import { pieceSVG, CHIP_SVG, ICON } from './pieces.js';
import { FX } from './fx.js';
import { Channel, newRoomId, clientId, ROOM_RE } from './net.js';
import { RULES_HTML } from './rules.js';

const $ = (id) => document.getElementById(id);
const store = {
  get(k) { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* úložiště nedostupné */ } },
  del(k) { try { localStorage.removeItem(k); } catch (e) { /* nic */ } },
};
const other = E.other;
const NAME = E.NAMES;
const PLAYER = { w: 'Bílý', b: 'Černý' };
const SIDE = { w: 'bílé', b: 'černé' };
const ACC = { K: 'Papeže', Q: 'Inkvizitora', R: 'Hranici', B: 'Biskupa', N: 'Křižáka', P: 'Hříšníka' };
const GEN = { K: 'Papeže', B: 'Biskupa' };
const ACTION_RE = /^([a-h][1-8][a-h][1-8][qrbn]?|@[a-h][1-8])$/;
const cap1 = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const adj = (c, t) => (t === 'R' ? (c === 'w' ? 'bílá' : 'černá') : (c === 'w' ? 'bílý' : 'černý'));
const mini = (t, c) => `<span class="mini ${c}">${pieceSVG(t)}</span>`;
const params = new URLSearchParams(location.hash.slice(1));

const INFO = {
  K: 'Papež – bere živé figurky jen v dosahu své Hranice (poprava), soupeřovu Hranici strhne sám. Zpovídá Inkvizitora a Biskupy.',
  Q: 'Inkvizitor – po zabití propadá pokání (kromě upálení na hranici). Zpověď u Biskupa nebo Papeže.',
  R: 'Hranice – sama nikdy nebere. Soupeřovy figurky v jejím dosahu lze upálit bez pokání.',
  B: 'Biskup – zpovídá Hříšníky a Inkvizitora, sám se zpovídá u Papeže. Čistý Biskup může být zvolen Papežem.',
  N: 'Křižák – zabíjí bez pokání (odpustek), Hranici ale odstranit nesmí.',
  P: 'Hříšník – po zabití propadá pokání (i při upálení), kromě tajného hříchu. Zpověď u Biskupa.',
};
const PEN_INFO = {
  P: 'Kaje se – nesmí brát, dokud nestojí vodorovně či svisle vedle svého Biskupa.',
  Q: 'Kaje se – nesmí brát živé figurky, dokud nestojí vedle Biskupa nebo Papeže. Hranici strhnout smí.',
  B: 'Kaje se – nesmí brát živé figurky a nemůže být zvolen Papežem, dokud se nevyzpovídá u Papeže. Hranici strhnout smí.',
};

let toastTimer = null;
function toast(msg, ms = 3200) {
  let t = document.querySelector('.toast');
  if (!t) { t = document.createElement('div'); t.className = 'toast'; document.body.appendChild(t); }
  t.textContent = msg;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.remove(), ms);
}

// ---------------- Pravidla ----------------
function setupRules() {
  const dlg = $('rules');
  $('rules-body').innerHTML = RULES_HTML;
  const open = () => { if (dlg.showModal) dlg.showModal(); else dlg.setAttribute('open', ''); };
  $('btn-rules').onclick = open;
  $('btn-rules2').onclick = open;
  $('rules-close').onclick = () => dlg.close();
  dlg.addEventListener('click', (e) => { if (e.target === dlg) dlg.close(); });
}

// ---------------- Lobby ----------------
function showLobby() {
  $('lobby').hidden = false;
  $('hero-pieces').innerHTML = ['P', 'N', 'B', 'K', 'Q', 'R'].map((t, i) => `<span class="hp ${i % 2 ? 'b' : 'w'}">${pieceSVG(t)}</span>`).join('');
  let color = 'w', flip = false;
  const seg = (id, attr, cb) => {
    const el = $(id);
    el.querySelectorAll('button').forEach((b) => {
      b.onclick = () => {
        el.querySelectorAll('button').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
        cb(b.dataset[attr]);
      };
    });
  };
  seg('color-seg', 'c', (v) => { color = v; });
  seg('flip-seg', 'f', (v) => { flip = v === '1'; });
  $('btn-create').onclick = () => {
    const room = newRoomId();
    const c = color === 'r' ? (Math.random() < 0.5 ? 'w' : 'b') : color;
    store.set('rc-seat-' + room, c);
    store.set('rc-host-' + room, true);
    location.hash = 'hra=' + room;
  };
  $('btn-local').onclick = () => {
    store.del('rc-local');
    location.hash = 'mistni' + (flip ? '&otacet=1' : '');
  };
}

// ---------------- Deska ----------------
class BoardView {
  constructor() {
    this.el = $('board');
    this.sqLayer = $('squares');
    this.hintLayer = $('hints');
    this.pieceLayer = $('pieces');
    this.fx = new FX($('fx'), (sq) => this.posOf(sq));
    this.els = new Map();
    this.sqEls = new Array(64);
    this.orient = 'w';
    this.buildSquares();
  }

  posOf(sq) {
    const f = sq & 7, r = sq >> 3;
    return this.orient === 'w' ? { x: f, y: 7 - r } : { x: 7 - f, y: r };
  }

  sqAt(x, y) { return this.orient === 'w' ? (7 - y) * 8 + x : y * 8 + (7 - x); }

  sqFromPoint(cx, cy) {
    const r = this.el.getBoundingClientRect();
    const x = Math.floor(((cx - r.left) / r.width) * 8);
    const y = Math.floor(((cy - r.top) / r.height) * 8);
    if (x < 0 || x > 7 || y < 0 || y > 7) return -1;
    return this.sqAt(x, y);
  }

  buildSquares() {
    this.sqLayer.innerHTML = '';
    for (let y = 0; y < 8; y++) {
      for (let x = 0; x < 8; x++) {
        const sq = this.sqAt(x, y);
        const d = document.createElement('div');
        const light = ((sq & 7) + (sq >> 3)) % 2 === 1;
        d.className = 'sq ' + (light ? 'l' : 'd');
        if (y === 7) d.insertAdjacentHTML('beforeend', `<span class="coord f">${E.FILES[sq & 7]}</span>`);
        if (x === 0) d.insertAdjacentHTML('beforeend', `<span class="coord r">${(sq >> 3) + 1}</span>`);
        this.sqLayer.appendChild(d);
        this.sqEls[sq] = d;
      }
    }
  }

  setOrient(o) {
    if (o === this.orient) return;
    this.orient = o;
    this.el.classList.add('noanim');
    this.buildSquares();
    for (const el of this.els.values()) this.place(el, el._sq);
    this.fx.clear();
    requestAnimationFrame(() => requestAnimationFrame(() => this.el.classList.remove('noanim')));
  }

  place(el, sq) {
    const { x, y } = this.posOf(sq);
    el._sq = sq;
    el.style.setProperty('--x', x);
    el.style.setProperty('--y', y);
  }

  createPiece(p, sq) {
    const el = document.createElement('div');
    el.className = 'piece ' + p.c;
    el.innerHTML = CHIP_SVG + pieceSVG(p.t);
    el._shownT = p.t;
    el._t = p.t;
    el._pen = p.pen;
    el.classList.toggle('pen', p.pen);
    this.place(el, sq);
    this.pieceLayer.appendChild(el);
    this.els.set(p.id, el);
    return el;
  }

  applyLook(el) {
    if (el._shownT !== el._t) {
      const pc = el.querySelector('.pc');
      if (pc) pc.outerHTML = pieceSVG(el._t);
      el._shownT = el._t;
    }
    el.classList.toggle('pen', el._pen);
  }

  // Srovná DOM se stavem; `events` (události posledního tahu) spustí animace
  sync(state, events = null) {
    const evs = events || [];
    const capEv = evs.find((e) => e.type === 'capture');
    const special = new Set(evs.filter((e) => ['promote', 'conclave', 'penance', 'absolve'].includes(e.type)).map((e) => e.id));
    const present = new Set();
    for (let sq = 0; sq < 64; sq++) {
      const p = state.board[sq];
      if (!p) continue;
      present.add(p.id);
      let el = this.els.get(p.id);
      if (!el) { this.createPiece(p, sq); continue; }
      if (el._sq !== sq) {
        this.place(el, sq);
        if (events) {
          el.classList.add('moving');
          setTimeout(() => el.classList.remove('moving'), 330);
        }
      }
      el._t = p.t;
      el._pen = p.pen;
      if (!special.has(p.id)) this.applyLook(el);
    }
    for (const [id, el] of this.els) {
      if (present.has(id)) continue;
      this.els.delete(id);
      if (events && capEv && capEv.piece.id === id) this.kill(el, capEv.kind);
      else el.remove();
    }
    if (events) this.animate(evs);
  }

  kill(el, kind) {
    const v = { penance: 'blood', burn: 'burn', execute: 'burn', crusade: 'fall', pyre: 'pyre', ep: 'quiet' }[kind] || 'quiet';
    el.classList.add('die');
    setTimeout(() => el.classList.add('die-' + v), 170);
    setTimeout(() => el.remove(), 1500);
  }

  animate(evs) {
    const later = (ms, fn) => setTimeout(fn, ms);
    const get = (id) => this.els.get(id);
    const popeFell = evs.some((e) => e.type === 'popeFall');
    for (const e of evs) {
      switch (e.type) {
        case 'capture':
          if (e.kind === 'penance') later(200, () => this.fx.blood(e.sq));
          else if (e.kind === 'burn' || e.kind === 'execute') later(120, () => this.fx.fire(e.sq, true));
          else if (e.kind === 'crusade') { later(160, () => this.fx.slash(e.sq)); later(260, () => this.fx.blood(e.sq)); }
          else if (e.kind === 'pyre') later(220, () => this.fx.fire(e.sq, false));
          break;
        case 'penance': {
          const el = get(e.id);
          if (!el || evs.some((x) => x.type === 'promote' && x.id === e.id)) break;
          const absolved = evs.some((x) => x.type === 'absolve' && x.id === e.id);
          later(300, () => {
            el.classList.add('pen', 'chip-in');
            later(650, () => el.classList.remove('chip-in'));
            if (!absolved) this.applyLook(el);
          });
          break;
        }
        case 'absolve': {
          const el = get(e.id);
          if (!el) break;
          const t0 = evs.some((x) => x.type === 'penance' && x.id === e.id) ? 1000 : 380;
          later(t0, () => this.fx.beam(e.by, e.sq));
          later(t0 + 150, () => { this.fx.halo(e.sq); el.classList.add('chip-out', 'glow'); });
          later(t0 + 850, () => { el.classList.remove('chip-out'); this.applyLook(el); });
          later(t0 + 1500, () => el.classList.remove('glow'));
          break;
        }
        case 'promote': {
          const el = get(e.id);
          if (!el) break;
          later(280, () => this.fx.pillar(e.sq));
          later(520, () => { this.applyLook(el); el.classList.add('morph'); later(700, () => el.classList.remove('morph')); });
          break;
        }
        case 'popeFall':
          later(260, () => {
            this.el.classList.remove('shake');
            void this.el.offsetWidth;
            this.el.classList.add('shake');
            later(650, () => this.el.classList.remove('shake'));
          });
          break;
        case 'conclave': {
          const el = get(e.id);
          if (!el) break;
          const t0 = popeFell ? 900 : 150;
          later(t0, () => this.fx.smoke(e.sq));
          later(t0 + 1300, () => {
            this.applyLook(el);
            el.classList.add('morph');
            this.fx.halo(e.sq);
            later(800, () => el.classList.remove('morph'));
          });
          break;
        }
        default: break;
      }
    }
  }

  showHints(list) {
    this.hintLayer.innerHTML = list.map((h) => {
      const { x, y } = this.posOf(h.sq);
      return `<div class="${h.cls}" style="left:${x * 12.5}%;top:${y * 12.5}%">${h.inner}</div>`;
    }).join('');
  }

  mark(map) {
    for (let sq = 0; sq < 64; sq++) {
      const el = this.sqEls[sq];
      for (const cls of ['last', 'sel', 'reach', 'choice']) el.classList.toggle(cls, !!(map[cls] && map[cls].has(sq)));
    }
  }
}

// ---------------- Hra ----------------
class Game {
  constructor({ mode, room = null, autoFlip = false }) {
    this.mode = mode;
    this.room = room;
    this.autoFlip = autoFlip;
    this.me = null;
    this.actions = [];
    this.state = E.initialState();
    this.hist = [];
    this.legal = [];
    this.ext = null;
    this.sel = -1;
    this.selMoves = [];
    this.reach = false;
    this.drag = null;
    this.overlayEl = null;
    this.finalShownFor = null;
    this.conclavePromptPly = -1;
    this.synced = mode === 'local';
    this.view = new BoardView();
    this.bindBoard();
    this.bindControls();
    document.addEventListener('visibilitychange', () => { if (!document.hidden) document.title = 'Kajícné šachy'; });
  }

  result() { return this.state.result || this.ext; }

  canAct() {
    if (this.result() || !this.synced) return false;
    if (this.mode === 'local') return true;
    return !!this.me && this.state.turn === this.me;
  }

  // Přepočítá stav a historii z this.actions (neplatný konec zahodí)
  rebuild() {
    let s = E.initialState();
    const hist = [];
    const good = [];
    for (const a of this.actions) {
      try {
        const r = E.applyAction(s, a);
        hist.push({ a, color: s.turn, events: r.events, after: r.state });
        s = r.state;
        good.push(a);
      } catch (e) { break; }
    }
    this.actions = good;
    this.state = s;
    this.hist = hist;
  }

  act(a) {
    let r;
    try { r = E.applyAction(this.state, a); } catch (e) { toast('Tento tah není podle pravidel povolen.'); return; }
    this.hist.push({ a, color: this.state.turn, events: r.events, after: r.state });
    this.actions.push(a);
    this.state = r.state;
    this.clearSel();
    this.refresh(r.events);
    this.persist();
    if (this.mode === 'online') this.sendState();
    if (this.mode === 'local' && this.autoFlip && !this.result()) {
      const ply = this.state.ply;
      const slow = r.events.some((e) => e.type === 'popeFall' || e.type === 'conclave');
      setTimeout(() => { if (this.state.ply === ply) { this.view.setOrient(this.state.turn); this.refresh(); } }, slow ? 2700 : 1100);
    }
  }

  persist() {
    if (this.mode === 'local') store.set('rc-local', { a: this.actions, ext: this.ext, flip: this.autoFlip });
    else store.set('rc-game-' + this.room, { a: this.actions, ext: this.ext });
  }

  // ---------- vykreslení ----------
  refresh(events = null) {
    this.legal = this.canAct() ? E.legalMoves(this.state) : [];
    if (this.sel >= 0) this.selMoves = this.legal.filter((m) => m.from === this.sel);
    this.view.sync(this.state, events);
    this.refreshPanels();
    this.prompts(!!events);
  }

  refreshPanels() {
    this.renderMarks();
    this.renderHints();
    this.renderPlayers();
    this.renderMoves();
    this.renderStory();
    this.renderControls();
    this.renderBanners();
    this.renderNet();
  }

  renderMarks() {
    const last = new Set();
    for (let i = this.hist.length - 1; i >= 0; i--) {
      const a = this.hist[i].a;
      if (a[0] === '@') continue;
      last.add(E.sqIndex(a.slice(0, 2)));
      last.add(E.sqIndex(a.slice(2, 4)));
      break;
    }
    const map = { last, sel: new Set(this.sel >= 0 ? [this.sel] : []) };
    if (this.reach) {
      const c = this.mode === 'online' && this.me ? this.me : this.state.turn;
      map.reach = new Set(E.rookReachSquares(this.state.board, c));
    }
    if (this.state.conclave && this.canAct()) map.choice = new Set(this.state.conclave.options);
    this.view.mark(map);
  }

  renderHints() {
    const list = [];
    if (this.sel >= 0) {
      const byTo = new Map();
      for (const m of this.selMoves) if (!byTo.has(m.to)) byTo.set(m.to, m);
      for (const [to, m] of byTo) {
        let absolve = false;
        try { absolve = E.applyAction(this.state, E.moveToString(m)).events.some((e) => e.type === 'absolve'); } catch (e) { /* nic */ }
        let cls = 'hint';
        let inner = '';
        if (m.kind) {
          cls += ' cap ' + (m.kind === 'penance' ? 'pen' : 'clean');
          inner += '<div class="ring"></div>';
          const ic = { penance: ICON.blood, burn: ICON.fire, execute: ICON.fire, crusade: ICON.sword, pyre: ICON.logs }[m.kind];
          if (ic) inner += `<div class="badge">${ic}</div>`;
        } else inner += '<div class="dotm"></div>';
        if (absolve) inner += `<div class="badge2">${ICON.halo}</div>`;
        else if (m.promo) inner += `<div class="badge2">${ICON.crown}</div>`;
        list.push({ sq: to, cls, inner });
      }
    }
    this.view.showHints(list);
  }

  captured(byColor) {
    const out = [];
    for (const h of this.hist) {
      for (const e of h.events) if (e.type === 'capture' && e.by.c === byColor) out.push(e.piece);
    }
    return out;
  }

  presence(c) {
    if (this.mode !== 'online') return '';
    if (c === this.me) return 'ty';
    if (!this.synced) return 'načítám…';
    if (!this.seats || !this.seats[c]) return this.me ? 'čeká se na soupeře…' : 'volné místo';
    if (this.opp && this.opp.seen) return 've hře';
    return 'připojen';
  }

  renderPlayers() {
    const res = this.result();
    const put = (el, c) => {
      const turn = !res && this.state.turn === c;
      el.className = 'player' + (turn ? ' turn' : '');
      const conclave = this.state.conclave && this.state.conclave.color === c;
      const mark = turn ? `<span class="turnmark">${conclave ? 'KONKLÁVE' : 'NA TAHU'}</span>` : '';
      const pres = this.presence(c);
      const caps = this.captured(c).map((p) => mini(p.t, p.c)).join('');
      el.innerHTML = `<span class="disc ${c}"></span><div><div class="who">${PLAYER[c]}${pres === 'ty' ? ' (ty)' : ''}</div>`
        + `<div class="meta">${pres && pres !== 'ty' ? pres + ' ' : ''}${mark}</div></div><div class="caps">${caps}</div>`;
    };
    put($('pl-top'), other(this.view.orient));
    put($('pl-bottom'), this.view.orient);
  }

  moveHTML(h) {
    if (h.a[0] === '@') return `${ICON.crown} konkláve ${h.a.slice(1)}`;
    const mv = h.events.find((e) => e.type === 'move');
    const cap = h.events.find((e) => e.type === 'capture');
    if (h.events.some((e) => e.type === 'castle')) return `${mini('K', mv.piece.c)} Azyl ${mv.to % 8 === 6 ? 'krátký' : 'dlouhý'}`;
    let s = `${mini(mv.piece.t, mv.piece.c)}${E.sqName(mv.from)}${cap ? '×' : '–'}${E.sqName(mv.to)}`;
    if (cap) s += { penance: ICON.blood, burn: ICON.fire, execute: ICON.fire, crusade: ICON.sword, pyre: ICON.logs, ep: '' }[cap.kind] || '';
    const pr = h.events.find((e) => e.type === 'promote');
    if (pr) s += `${ICON.crown}${mini(pr.t, mv.piece.c)}`;
    if (h.events.some((e) => e.type === 'absolve')) s += ICON.halo;
    if (h.events.some((e) => e.type === 'popeFall')) s += ' †';
    return s;
  }

  renderMoves() {
    const entries = [];
    for (const h of this.hist) {
      const last = entries[entries.length - 1];
      if (last && last.color === h.color) last.html.push(this.moveHTML(h));
      else entries.push({ color: h.color, html: [this.moveHTML(h)] });
    }
    const rows = [];
    for (const e of entries) {
      const cur = rows[rows.length - 1];
      if (e.color === 'b' && cur && !cur.b) cur.b = e;
      else rows.push(e.color === 'w' ? { w: e } : { w: null, b: e });
    }
    const lastEntry = entries[entries.length - 1];
    const cell = (e) => (e ? `<span class="mv${e === lastEntry ? ' last' : ''}">${e.html.join(', ')}</span>` : '<span class="mv">…</span>');
    $('moves-list').innerHTML = rows.map((r) => `<li>${cell(r.w)}${r.b ? cell(r.b) : '<span></span>'}</li>`).join('');
    const box = $('moves');
    box.scrollTop = box.scrollHeight;
  }

  narrate(evs) {
    const out = [];
    const mv = evs.find((e) => e.type === 'move');
    const cap = evs.find((e) => e.type === 'capture');
    if (cap) {
      const A = cap1(`${adj(cap.by.c, cap.by.t)} ${NAME[cap.by.t]}`);
      const V = ACC[cap.piece.t];
      const at = E.sqName(cap.sq);
      out.push({
        penance: `${A} zabil ${V} na ${at} a propadá pokání.`,
        burn: `${A} upálil ${V} na ${at} – v dosahu Hranice, bez pokání.`,
        execute: `${A} nechal na ${at} popravit ${V} na hranici.`,
        crusade: `${A} pobil ${V} na ${at}. Odpustek ho chrání před pokáním.`,
        pyre: `${A} strhl soupeřovu Hranici na ${at}.`,
        ep: `${A} spáchal tajný hřích – mimochodem sebral Hříšníka na ${at}, bez pokání.`,
      }[cap.kind]);
    } else if (evs.some((e) => e.type === 'castle')) {
      out.push(`${cap1(adj(mv.piece.c, 'K'))} Papež nalezl Azyl u své Hranice.`);
    } else if (mv) {
      out.push(`${cap1(adj(mv.piece.c, mv.piece.t))} ${NAME[mv.piece.t]} táhne ${E.sqName(mv.from)}–${E.sqName(mv.to)}.`);
    }
    for (const e of evs) {
      if (e.type === 'promote') out.push(`Spása! Hříšník se na ${E.sqName(e.sq)} proměnil v ${ACC[e.t]}${e.cleansed ? ' a je očištěn od pokání' : ''}.`);
      if (e.type === 'absolve') out.push(`${NAME[e.t]} na ${E.sqName(e.sq)} se vyzpovídal u ${GEN[e.byT]} a získal rozhřešení.`);
      if (e.type === 'popeFall') out.push(`${PLAYER[e.color]} Papež padl!`);
      if (e.type === 'conclave') out.push(`Habemus papam! ${cap1(adj(e.color, 'B'))} Biskup na ${E.sqName(e.sq)} usedá na papežský stolec.`);
    }
    return out;
  }

  resultText(r) {
    if (r.reason === 'draw') return 'Remíza dohodou.';
    const L = PLAYER[other(r.winner)], W = PLAYER[r.winner];
    return {
      damnation: `Zatracení! ${L} už nemá čistého Biskupa, kterého by dosadil na papežský stolec. Vítězí ${W}.`,
      nomoves: `${L} nemá žádný povolený tah a prohrává. Vítězí ${W}.`,
      resign: `${L} se vzdal. Vítězí ${W}.`,
    }[r.reason] || `Vítězí ${W}.`;
  }

  renderStory() {
    const last = this.hist[this.hist.length - 1];
    const lines = last ? this.narrate(last.events) : ['Hra začíná. Ať je vaše svědomí čisté.'];
    const res = this.result();
    let status;
    if (res) status = `<b>${this.resultText(res)}</b>`;
    else if (this.state.conclave) {
      const c = this.state.conclave.color;
      status = `<b>Konkláve!</b> ${PLAYER[c]}${c === this.me ? ' (ty)' : ''} volí nového Papeže z čistých Biskupů.`;
    } else {
      const t = this.state.turn;
      status = `Na tahu: <b>${PLAYER[t]}</b>${t === this.me ? ' (ty)' : ''}.`;
    }
    let hint = '';
    if (this.sel >= 0) {
      const p = this.state.board[this.sel];
      if (p) hint = `${INFO[p.t]}${p.pen ? ' <b>' + PEN_INFO[p.t] + '</b>' : ''}`;
    }
    const fresh = this.storyLen !== this.hist.length;
    this.storyLen = this.hist.length;
    const cls = fresh ? 'ev new' : 'ev';
    $('story').innerHTML = lines.map((l) => `<div class="${cls}">${l}</div>`).join('')
      + `<div class="ev">${status}</div>` + (hint ? `<div class="tip">${hint}</div>` : '');
  }

  renderControls() {
    const res = this.result();
    const online = this.mode === 'online';
    const seated = !online || !!this.me;
    $('btn-draw').hidden = !seated;
    $('btn-resign').hidden = !seated;
    $('btn-draw').disabled = !!res || (online && (!this.synced || (this.offer && this.offer.c === this.me)));
    $('btn-resign').disabled = !!res || (online && !this.synced);
    $('btn-reach').classList.toggle('on', this.reach);
    $('btn-new').hidden = false;
  }

  renderBanners() {
    const b = [];
    if (this.mode === 'online') {
      if (this.offer && !this.result() && this.offer.n === this.actions.length) {
        if (this.offer.c !== this.me && this.me) {
          b.push(`<div class="banner">Soupeř nabízí <b>remízu</b>.<div class="row"><button class="btn small primary" data-act="accept">Přijmout</button><button class="btn small" data-act="decline">Odmítnout</button></div></div>`);
        } else if (this.offer.c === this.me) {
          b.push('<div class="banner">Nabídka remízy odeslána, čeká se na odpověď soupeře.</div>');
        }
      }
      if (this.rematch && this.me) {
        b.push(`<div class="banner">Soupeř tě vyzývá k <b>odvetě</b> – budeš hrát za ${SIDE[this.rematch.c]}.<div class="row"><button class="btn small primary" data-act="rematch-yes">Přijmout odvetu</button></div></div>`);
      }
      if (this.seatClash) b.push('<div class="banner warn">Za tvou barvu je přihlášeno ještě jiné okno nebo zařízení. Hraj prosím jen z jednoho.</div>');
      if (this.synced && !this.me && !this.overlayEl) {
        const takeover = ['w', 'b'].map((c) => `<button class="btn small" data-act="seat-${c}">Hrát za ${SIDE[c]}</button>`).join('');
        b.push(`<div class="banner">Sleduješ hru jako divák.<div class="row">${takeover}</div></div>`);
      }
    }
    const el = $('banners');
    el.innerHTML = b.join('');
    el.querySelectorAll('[data-act]').forEach((btn) => { btn.onclick = () => this.onBanner(btn.dataset.act); });
  }

  onBanner(act) {
    if (act === 'accept' && this.offer) this.net.send({ k: 'accept', id: this.cid, c: this.me, n: this.offer.n });
    if (act === 'decline' && this.offer) { this.net.send({ k: 'decline', id: this.cid, c: this.me, n: this.offer.n }); this.offer = null; this.refreshPanels(); }
    if (act === 'rematch-yes' && this.rematch) {
      store.set('rc-seat-' + this.rematch.room, this.rematch.c);
      location.hash = 'hra=' + this.rematch.room;
    }
    if (act === 'seat-w' || act === 'seat-b') {
      const c = act.slice(5);
      const taken = this.seats && this.seats[c];
      this.confirm('Převzít místo', taken
        ? `Za ${SIDE[c]} už někdo hraje. Převezmi místo jen tehdy, když jsi to ty na jiném zařízení.`
        : `Budeš hrát za ${SIDE[c]}.`, 'Převzít', () => this.claim(c));
    }
  }

  renderNet() {
    const panel = $('net-text').closest('.panel');
    if (this.mode !== 'online') { panel.hidden = true; return; }
    panel.hidden = false;
    const s = this.netStatus || 'connecting';
    const txt = {
      connecting: ['warn', 'Připojování k herní místnosti…'],
      online: ['ok', 'Připojeno k herní místnosti'],
      reconnecting: ['warn', 'Obnovuji spojení…'],
      offline: ['bad', 'Bez spojení se serverem – zkouším znovu…'],
      sendfail: ['bad', 'Tah se nepodařilo odeslat – zkouším znovu…'],
      limited: ['bad', 'Server dočasně omezil počet zpráv – čekám a zkusím to znovu.'],
    }[s] || ['warn', s];
    $('net-dot').className = 'dot ' + txt[0];
    $('net-text').textContent = txt[1] + (this.unsent ? ` (neodesláno: ${this.unsent})` : '');
    const inv = $('invite');
    const showInvite = this.synced && this.me && this.seats && !this.seats[other(this.me)];
    inv.hidden = !showInvite;
  }

  // ---------- výzvy a překryvy ----------
  prompts(animated) {
    const res = this.result();
    const delay = animated ? 1500 : 0;
    const key = this.actions.length + ':' + (res ? res.reason : '');
    if (res && this.finalShownFor !== key) {
      this.finalShownFor = key;
      setTimeout(() => { if (this.result()) this.showFinal(this.result()); }, delay);
      return;
    }
    if (!res && this.state.conclave && this.canAct() && this.conclavePromptPly !== this.state.ply) {
      this.conclavePromptPly = this.state.ply;
      const n = this.state.conclave.options.length;
      setTimeout(() => {
        if (!this.state.conclave) return;
        this.openOverlay(`<div class="box"><h2>Papež padl!</h2><p>Konkláve: vyber jednoho ze svých ${n} čistých Biskupů – stane se novým Papežem.</p>`
          + '<div class="row"><button class="btn primary" data-close>Vybrat na šachovnici</button></div></div>', (ov) => {
          ov.querySelector('[data-close]').onclick = () => this.closeOverlay();
        });
      }, animated ? 1800 : 0);
    }
  }

  openOverlay(html, bind, cls = '') {
    this.closeOverlay();
    const ov = document.createElement('div');
    ov.className = 'overlay ' + cls;
    ov.innerHTML = html;
    document.querySelector('.frame').appendChild(ov);
    this.overlayEl = ov;
    if (bind) bind(ov);
  }

  closeOverlay() {
    if (this.overlayEl) { this.overlayEl.remove(); this.overlayEl = null; }
  }

  confirm(title, text, ok, cb) {
    this.openOverlay(`<div class="box"><h2>${title}</h2><p>${text}</p><div class="row">`
      + `<button class="btn primary" data-ok>${ok}</button><button class="btn" data-x>Zpět</button></div></div>`, (ov) => {
      ov.querySelector('[data-ok]').onclick = () => { this.closeOverlay(); cb(); };
      ov.querySelector('[data-x]').onclick = () => this.closeOverlay();
    });
  }

  askPromo(ms) {
    const c = this.state.turn;
    const opts = ['Q', 'R', 'B', 'N'].map((t) => `<button type="button" data-t="${t}">${mini(t, c)}<small>${NAME[t]}</small></button>`).join('');
    this.openOverlay(`<div class="box"><h2>Spása!</h2><p>Hříšník došel na konec cesty a je vykoupen. V co se promění?</p>`
      + `<div class="promo-opts">${opts}</div><div class="row" style="margin-top:12px"><button class="btn small ghost" data-x>Zpět</button></div></div>`, (ov) => {
      ov.querySelectorAll('[data-t]').forEach((b) => {
        b.onclick = () => {
          this.closeOverlay();
          const m = ms.find((x) => x.promo === b.dataset.t);
          if (m) this.act(E.moveToString(m));
        };
      });
      ov.querySelector('[data-x]').onclick = () => this.closeOverlay();
    });
  }

  showFinal(r) {
    const title = { damnation: 'Zatracení', nomoves: 'Bez tahu', resign: 'Kapitulace', draw: 'Remíza' }[r.reason] || 'Konec hry';
    let me = '';
    if (this.me && r.winner) me = r.winner === this.me ? '<p><b>Vítězíš! Tvé svědomí je čisté.</b></p>' : '<p><b>Prohráváš. Čas na pokání.</b></p>';
    const canRematch = this.mode === 'local' || !!this.me;
    this.openOverlay(`<div class="box"><h2>${title}</h2><p>${this.resultText(r)}</p>${me}<div class="row">`
      + (canRematch ? '<button class="btn primary" data-re>Odveta</button>' : '')
      + '<button class="btn" data-x>Prohlédnout desku</button></div></div>', (ov) => {
      const re = ov.querySelector('[data-re]');
      if (re) re.onclick = () => this.rematchNow();
      ov.querySelector('[data-x]').onclick = () => this.closeOverlay();
    }, 'final');
  }

  async rematchNow() {
    if (this.mode === 'local') {
      store.del('rc-local');
      location.reload();
      return;
    }
    const room = newRoomId();
    const c = other(this.me);
    store.set('rc-seat-' + room, c);
    this.closeOverlay();
    toast('Zakládám odvetu…');
    await Promise.race([this.net.send({ k: 'rematch', id: this.cid, c, room }), new Promise((r) => setTimeout(r, 8000))]);
    location.hash = 'hra=' + room;
  }

  // ---------- ovládání ----------
  bindControls() {
    $('btn-flip').onclick = () => { this.view.setOrient(other(this.view.orient)); this.refresh(); };
    $('btn-reach').onclick = () => { this.reach = !this.reach; this.renderMarks(); this.renderControls(); };
    $('btn-new').onclick = () => {
      if (this.result() || this.actions.length === 0) { location.hash = ''; return; }
      this.confirm('Nová hra', 'Opustit tuto hru a vrátit se na úvod? Rozehranou online hru můžeš později znovu otevřít stejným odkazem.', 'Na úvod', () => { location.hash = ''; });
    };
    $('btn-draw').onclick = () => {
      if (this.mode === 'local') {
        this.confirm('Remíza', 'Uzavřít remízu dohodou?', 'Remíza', () => { this.ext = { winner: null, reason: 'draw' }; this.persist(); this.refresh(); });
      } else if (this.me) {
        this.confirm('Nabídnout remízu', 'Poslat soupeři nabídku remízy?', 'Nabídnout', () => {
          this.offer = { c: this.me, n: this.actions.length };
          this.net.send({ k: 'offer', id: this.cid, c: this.me, n: this.actions.length });
          this.refreshPanels();
        });
      }
    };
    $('btn-resign').onclick = () => {
      const loser = this.mode === 'local' ? this.state.turn : this.me;
      if (!loser) return;
      this.confirm('Vzdát se', this.mode === 'local' ? `Opravdu se ${PLAYER[loser]} vzdává?` : 'Opravdu se chceš vzdát?', 'Vzdát se', () => {
        this.ext = { winner: other(loser), reason: 'resign' };
        this.persist();
        if (this.mode === 'online') this.net.send({ k: 'resign', id: this.cid, c: loser });
        this.clearSel();
        this.refresh();
      });
    };
    $('btn-copy').onclick = async () => {
      const inp = $('invite-url');
      try { await navigator.clipboard.writeText(inp.value); toast('Odkaz zkopírován – pošli ho soupeři.'); } catch (e) { inp.select(); document.execCommand('copy'); toast('Odkaz zkopírován.'); }
    };
    if (navigator.share) {
      $('btn-share').hidden = false;
      $('btn-share').onclick = () => navigator.share({ title: 'Kajícné šachy', text: 'Zahraj si se mnou Kajícné šachy!', url: $('invite-url').value }).catch(() => {});
    }
  }

  bindBoard() {
    const b = this.view.el;
    b.addEventListener('pointerdown', (e) => this.onDown(e));
    b.addEventListener('pointermove', (e) => this.onMove(e));
    b.addEventListener('pointerup', (e) => this.onUp(e));
    b.addEventListener('pointercancel', () => this.cancelDrag());
    b.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  clearSel() { this.sel = -1; this.selMoves = []; }

  select(sq) {
    this.sel = sq;
    this.selMoves = this.legal.filter((m) => m.from === sq);
    this.renderMarks();
    this.renderHints();
    this.renderStory();
  }

  deselect() { this.clearSel(); this.renderMarks(); this.renderHints(); this.renderStory(); }

  onDown(e) {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    if (this.overlayEl) return;
    const sq = this.view.sqFromPoint(e.clientX, e.clientY);
    if (sq < 0) return;
    if (this.state.conclave && this.canAct()) {
      if (this.state.conclave.options.includes(sq)) this.act('@' + E.sqName(sq));
      else toast('Vyber jednoho ze zvýrazněných čistých Biskupů.');
      return;
    }
    if (!this.canAct()) {
      const p = this.state.board[sq];
      if (p) { this.sel = -1; this.renderStory(); const t = $('story'); t.insertAdjacentHTML('beforeend', `<div class="tip">${INFO[p.t]}${p.pen ? ' <b>' + PEN_INFO[p.t] + '</b>' : ''}</div>`); }
      if (this.mode === 'online' && this.me && !this.result() && this.synced) toast('Teď je na tahu soupeř.');
      return;
    }
    if (this.sel >= 0 && this.selMoves.some((m) => m.to === sq)) { this.tryMove(this.sel, sq); return; }
    const p = this.state.board[sq];
    if (p && p.c === this.state.turn) {
      const again = this.sel === sq;
      this.select(sq);
      const el = this.view.els.get(p.id);
      if (el) {
        this.drag = { sq, el, x: e.clientX, y: e.clientY, moved: false, again, id: e.pointerId };
        try { this.view.el.setPointerCapture(e.pointerId); } catch (err) { /* nic */ }
      }
      return;
    }
    if (p && p.c !== this.state.turn) {
      this.deselect();
      $('story').insertAdjacentHTML('beforeend', `<div class="tip">${INFO[p.t]}${p.pen ? ' <b>' + PEN_INFO[p.t] + '</b>' : ''}</div>`);
      return;
    }
    this.deselect();
  }

  onMove(e) {
    const d = this.drag;
    if (!d || e.pointerId !== d.id) return;
    if (!d.moved && Math.hypot(e.clientX - d.x, e.clientY - d.y) < 6) return;
    d.moved = true;
    const r = this.view.el.getBoundingClientRect();
    const cell = r.width / 8;
    d.el.classList.add('dragging');
    d.el.style.transform = `translate(${e.clientX - r.left - cell / 2}px, ${e.clientY - r.top - cell / 2}px)`;
  }

  onUp(e) {
    const d = this.drag;
    if (!d || e.pointerId !== d.id) return;
    this.drag = null;
    d.el.classList.remove('dragging');
    d.el.style.transform = '';
    if (d.moved) {
      const sq = this.view.sqFromPoint(e.clientX, e.clientY);
      if (sq >= 0 && sq !== d.sq && this.selMoves.some((m) => m.to === sq)) this.tryMove(d.sq, sq);
    } else if (d.again) this.deselect();
  }

  cancelDrag() {
    if (!this.drag) return;
    this.drag.el.classList.remove('dragging');
    this.drag.el.style.transform = '';
    this.drag = null;
  }

  tryMove(from, to) {
    const ms = this.selMoves.filter((m) => m.to === to && m.from === from);
    if (!ms.length) return;
    if (ms.length > 1 && ms[0].promo) { this.askPromo(ms); return; }
    this.act(E.moveToString(ms[0]));
  }

  // ---------- místní hra ----------
  startLocal() {
    const saved = store.get('rc-local');
    if (saved && Array.isArray(saved.a)) {
      this.actions = saved.a.filter((x) => typeof x === 'string' && ACTION_RE.test(x));
      this.ext = saved.ext || null;
      this.rebuild();
    }
    if (this.autoFlip) this.view.setOrient(this.state.turn);
    this.refresh();
  }

  // ---------- online hra ----------
  startOnline() {
    this.cid = clientId();
    this.server = { actions: [], state: E.initialState() };
    this.seats = { w: null, b: null };
    this.opp = { seen: false };
    this.offer = null;
    this.rematch = null;
    this.replied = new Set();
    $('invite-url').value = location.origin + location.pathname + '#hra=' + this.room;

    const saved = store.get('rc-game-' + this.room);
    if (saved && Array.isArray(saved.a)) {
      this.actions = saved.a.filter((x) => typeof x === 'string' && ACTION_RE.test(x));
      this.ext = saved.ext || null;
      this.rebuild();
    }
    const urlSeat = params.get('barva');
    const seat = store.get('rc-seat-' + this.room);
    if (urlSeat === 'w' || urlSeat === 'b') { this.me = urlSeat; store.set('rc-seat-' + this.room, urlSeat); }
    else if (seat === 'w' || seat === 'b') this.me = seat;
    this.view.setOrient(this.me === 'b' ? 'b' : 'w');
    this.refresh();

    this.net = new Channel(this.room, {
      onMessage: (m, h) => this.onMsg(m, h),
      onStatus: (s, u) => { this.netStatus = s; this.unsent = u; this.renderNet(); },
    });
    this.net.connect();
  }

  // Celý seznam akcí (~5 znaků na tah) – i partie o 600 půltazích se vejde do limitu zprávy ntfy (4 kB)
  statePayload() {
    return { o: 0, a: this.actions.join(' ') };
  }

  sendState() {
    if (!this.me) return;
    this.net.send({ k: 's', id: this.cid, ...this.statePayload() });
  }

  announce() {
    this.net.send({ k: 'hi', id: this.cid, c: this.me, ...this.statePayload() });
  }

  claim(c) {
    this.me = c;
    store.set('rc-seat-' + this.room, c);
    this.seats[c] = this.cid;
    this.closeOverlay();
    this.view.setOrient(c);
    this.announce();
    this.refresh();
  }

  serverResult() { return this.server.state.result || this.ext; }

  // Přijme seznam akcí ze serveru (od offsetu o). První verze na serveru vyhrává.
  mergeServer(o, str) {
    const S = this.server.actions;
    if (typeof str !== 'string' || str.length > 8000) return;
    const a = str ? str.split(' ') : [];
    if (!Number.isInteger(o) || o < 0 || o > S.length) return;
    for (let i = o; i < Math.min(S.length, o + a.length); i++) if (a[i - o] !== S[i]) return;
    if (o + a.length <= S.length || this.ext) return;
    let st = this.server.state;
    for (let i = S.length - o; i < a.length; i++) {
      if (!ACTION_RE.test(a[i])) break;
      try { st = E.applyAction(st, a[i]).state; S.push(a[i]); } catch (e) { break; }
    }
    this.server.state = st;
    if (this.offer && this.offer.n !== S.length) this.offer = null;
  }

  onMsg(m, fromHistory) {
    if (m.k === '_synced') { this.onSynced(); return; }
    const mine = m.id === this.cid;
    const c = m.c === 'w' || m.c === 'b' ? m.c : null;
    if (typeof m.a === 'string') this.mergeServer(Number.isInteger(m.o) ? m.o : 0, m.a);
    switch (m.k) {
      case 'hi':
        if (c) this.seats[c] = m.id || '?';
        if (!mine && !fromHistory) {
          if (c && c !== this.me) this.opp.seen = true;
          if (c && this.me && c === this.me) this.seatClash = true;
          if (this.me && this.synced && !this.replied.has(m.id)) {
            this.replied.add(m.id);
            this.net.send({ k: 'here', id: this.cid, c: this.me, ...this.statePayload() });
          }
        }
        break;
      case 'here':
        if (c && !this.seats[c]) this.seats[c] = m.id || '?';
        if (!mine && !fromHistory && c && c !== this.me) this.opp.seen = true;
        break;
      case 'offer':
        if (c && m.n === this.server.actions.length && !this.serverResult()) this.offer = { c, n: m.n };
        break;
      case 'decline':
        if (this.offer && c && c !== this.offer.c) {
          if (!fromHistory && this.offer.c === this.me) toast('Soupeř nabídku remízy odmítl.');
          this.offer = null;
        }
        break;
      case 'accept':
        if (this.offer && c && c !== this.offer.c && m.n === this.offer.n && m.n === this.server.actions.length && !this.serverResult()) {
          this.ext = { winner: null, reason: 'draw' };
          this.offer = null;
        }
        break;
      case 'resign':
        if (c && !this.serverResult()) this.ext = { winner: other(c), reason: 'resign' };
        break;
      case 'rematch':
        if (!mine && c && typeof m.room === 'string' && ROOM_RE.test(m.room)) this.rematch = { room: m.room, c: other(c) };
        break;
      default: break;
    }
    if (!fromHistory) this.reconcile(true);
  }

  onSynced() {
    const first = !this.synced;
    this.synced = true;
    this.reconcile(false);
    if (first) {
      if (this.me) this.announce();
      else this.askSeat();
    } else if (this.me && this.actions.length > this.server.actions.length) {
      this.sendState();
    }
  }

  askSeat() {
    const free = ['w', 'b'].filter((c) => !this.seats[c]);
    if (!free.length) { this.refreshPanels(); return; }
    const btns = free.map((c, i) => `<button class="btn ${i === 0 ? 'primary' : ''}" data-c="${c}">Hrát za ${SIDE[c]}</button>`).join('');
    const text = free.length === 1
      ? `Soupeř už sedí za ${SIDE[other(free[0])]} a čeká na tebe.`
      : 'Vyber si barvu.';
    this.openOverlay(`<div class="box"><h2>Vstup do hry</h2><p>${text}</p><div class="row">${btns}<button class="btn ghost" data-x>Jen se dívat</button></div></div>`, (ov) => {
      ov.querySelectorAll('[data-c]').forEach((b) => { b.onclick = () => this.claim(b.dataset.c); });
      ov.querySelector('[data-x]').onclick = () => { this.closeOverlay(); this.refreshPanels(); };
    });
    this.renderBanners();
  }

  reconcile(animate) {
    const S = this.server.actions;
    const L = this.actions;
    const isPrefix = (a, b) => a.length <= b.length && a.every((x, i) => b[i] === x);
    if (isPrefix(S, L) && !(this.ext && L.length > S.length)) {
      // lokální stav je stejný nebo napřed – desku neměníme, jen panely
      this.persist();
      this.legal = this.canAct() ? E.legalMoves(this.state) : [];
      if (!this.canAct()) this.clearSel();
      this.refreshPanels();
      this.prompts(false);
      return;
    }
    const grow = isPrefix(L, S) ? S.length - L.length : -1;
    this.actions = S.slice();
    this.rebuild();
    this.clearSel();
    if (this.overlayEl && !this.overlayEl.classList.contains('final')) this.closeOverlay();
    const evs = animate && grow >= 1 ? this.hist[this.hist.length - 1].events : null;
    this.persist();
    this.refresh(evs);
    if (grow >= 1 && document.hidden && this.canAct()) document.title = '● Tvůj tah – Kajícné šachy';
  }
}

// ---------------- Start ----------------
function main() {
  setupRules();
  addEventListener('hashchange', () => location.reload());
  $('home-link').onclick = (e) => { e.preventDefault(); location.hash = ''; if (!location.hash) location.reload(); };
  const room = params.get('hra');
  if (room && ROOM_RE.test(room)) {
    $('game').hidden = false;
    const g = new Game({ mode: 'online', room });
    window.__game = g;
    g.startOnline();
  } else if (params.has('mistni')) {
    $('game').hidden = false;
    const saved = store.get('rc-local');
    const g = new Game({ mode: 'local', autoFlip: params.get('otacet') === '1' || !!(saved && saved.flip) });
    window.__game = g;
    g.startLocal();
  } else {
    showLobby();
  }
}

main();
