// Schizma – aplikace (lobby, deska, online hra)
import * as E from './engine.js?v=11';
import { pieceSVG, CHIP_SVG, HEAT_SVG, CRUSADE_CHIP_SVG, ICON } from './pieces.js?v=11';
import { FX } from './fx.js?v=11';
import { Channel, newRoomId, clientId, ROOM_RE } from './net.js?v=11';
import { RULES_HTML } from './rules.js?v=11';
import { sfx, playEvents, unlock, isMuted, setMuted, getCtx } from './sound.js?v=11';
import { MusicPlayer } from './music.js?v=11';

const music = new MusicPlayer(getCtx);
import { LEVELS } from './ai.js?v=11';

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
const SIDE_HR = { w: 'Bílé', b: 'Černé' };
const ACC = { K: 'Papeže', Q: 'Inkvizitora', R: 'Hranici', B: 'Kardinála', N: 'Misionáře', C: 'Křižáka', P: 'Poutníka' };
const GEN = { K: 'Papeže', B: 'Kardinála' };
const ACTION_RE = /^([a-h][1-8][a-h][1-8][qbn]?|@[a-h][1-8])$/;
const KEY = 'sz1-';
const inqWord = (n) => (n >= 1 && n <= 4 ? 'inkvizice' : 'inkvizic');
const cap1 = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const adj = (c, t) => (t === 'R' ? (c === 'w' ? 'bílá' : 'černá') : (c === 'w' ? 'bílý' : 'černý'));
const mini = (t, c) => `<span class="mini ${c}">${pieceSVG(t)}</span>`;
const params = new URLSearchParams(location.hash.slice(1));

const INFO = {
  K: 'Papež – táhne o 1 pole. Soupeřovu figurku smí odstranit jen Upálením (cíl v dosahu jeho Hranice) a sám padne jen Upálením v dosahu soupeřovy Hranice – Poutník ani Křižák ho odstranit nesmí. Pokání nepropadá. Zpovídá všechny (i diagonálně). Ohrožuje-li ho soupeřův Křižák skokem jezdce, je v zajetí: nesmí se pohnout ani zpovídat.',
  Q: 'Inkvizitor – po zabití mimo dosah Hranice propadá pokání. Každé jeho odstranění soupeře je inkvizice a rozpaluje Žár Hranic. Zpověď u Kardinála nebo Papeže.',
  R: 'Hranice – nebere a nelze ji odstranit. Skáče na volné pole v poloměru Žáru (1–3). Soupeřovy figurky v jejím dosahu lze upálit bez pokání (neplatí pro Poutníky).',
  B: 'Kardinál – zpovídá Poutníky, Misionáře a Inkvizitora (jen vodorovně a svisle), sám se zpovídá u Papeže. Čistý Kardinál může být zvolen Papežem.',
  N: 'Misionář – táhne jako jezdec, po zabití mimo dosah Hranice propadá pokání. Zpověď u Kardinála nebo Papeže. Když strana přijde o posledního Kardinála nebo o Inkvizitora, stane se Křižákem.',
  C: 'Křižák – táhne jako jezdec a díky papežskému odpustku nikdy nepropadá pokání. Papeže nebere, ale drží ho v zajetí, když ho ohrožuje skokem jezdce – zajatý Papež se nepohne ani nezpovídá.',
  P: 'Poutník – smí kdykoliv o 1 nebo 2 pole vpřed. Nikdy neupaluje: každé zabití znamená pokání (kromě tajného hříchu). Papeže odstranit nesmí. Zpověď u Kardinála nebo Papeže.',
};
const PEN_INFO = {
  P: 'Kaje se – nesmí brát (ani mimochodem), dokud nestojí vodorovně či svisle vedle Kardinála nebo kdekoliv vedle Papeže.',
  N: 'Kaje se – nesmí brát, dokud nestojí vodorovně či svisle vedle Kardinála nebo kdekoliv vedle Papeže.',
  Q: 'Kaje se – nesmí brát, dokud nestojí vodorovně či svisle vedle Kardinála nebo kdekoliv vedle Papeže.',
  B: 'Kaje se – nesmí brát a nemůže být zvolen Papežem, dokud se nevyzpovídá u Papeže.',
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
  $('hero-pieces').innerHTML = ['P', 'N', 'B', 'K', 'Q', 'R', 'C'].map((t, i) => `<span class="hp ${i % 2 ? 'b' : 'w'}">${pieceSVG(t)}</span>`).join('');
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
    store.set(KEY + 'seat-' + room, c);
    store.set(KEY + 'host-' + room, true);
    location.hash = 'hra=' + room;
  };
  $('btn-local').onclick = () => {
    store.del(KEY + 'local');
    location.hash = 'mistni' + (flip ? '&otacet=1' : '');
  };
  let aiColor = 'w', aiLevel = '2';
  seg('ai-color-seg', 'c', (v) => { aiColor = v; });
  seg('ai-level-seg', 'l', (v) => { aiLevel = v; });
  $('btn-ai').onclick = () => {
    const c = aiColor === 'r' ? (Math.random() < 0.5 ? 'w' : 'b') : aiColor;
    store.del(KEY + 'ai');
    location.hash = `stroj=${c}&uroven=${aiLevel}`;
  };
}

// ---------------- Deska ----------------
class BoardView {
  constructor() {
    this.el = $('board');
    this.sqLayer = $('squares');
    this.hintLayer = $('hints');
    this.pieceLayer = $('pieces');
    this.fx = new FX($('fx'), (sq) => this.posOf(sq), $('fx-under'));
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
    el.className = 'piece ' + p.c + (p.t === 'R' ? ' rook' : '');
    el.innerHTML = (p.t === 'R' ? HEAT_SVG + '<span class="rflame"><i></i><i></i><i></i></span>' : CHIP_SVG + CRUSADE_CHIP_SVG) + pieceSVG(p.t);
    el.classList.toggle('cru', p.t === 'C');
    el._shownT = p.t;
    el._t = p.t;
    el._pen = p.pen;
    el._heat = el._shownHeat = p.t === 'R' ? (this.heat ? this.heat[p.c] : 1) : 0;
    el.classList.toggle('pen', p.pen);
    if (p.t === 'R') el.dataset.heat = el._heat;
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
    el.classList.toggle('cru', el._t === 'C');
    if (el._t === 'R' && el._shownHeat !== el._heat) {
      el._shownHeat = el._heat;
      el.dataset.heat = el._heat;
    }
  }

  // Srovná DOM se stavem; `events` (události posledního tahu) spustí animace
  sync(state, events = null) {
    const evs = events || [];
    const capEv = evs.find((e) => e.type === 'capture');
    const mvEv = evs.find((e) => e.type === 'move');
    this.heat = { w: E.heatOf(state, 'w'), b: E.heatOf(state, 'b') };
    const special = new Set(evs.filter((e) => ['promote', 'conclave', 'penance', 'absolve'].includes(e.type)).map((e) => e.id));
    for (const e of evs) if (e.type === 'crusade') e.ids.forEach((id) => special.add(id));
    for (const e of evs) {
      if (e.type === 'heat' || e.type === 'heatLost') {
        state.board.forEach((x) => { if (x && x.t === 'R' && x.c === e.color) special.add(x.id); });
      }
    }
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
          const leap = mvEv && mvEv.id === p.id && mvEv.piece.t === 'R';
          const hop = mvEv && mvEv.id === p.id && (mvEv.piece.t === 'N' || mvEv.piece.t === 'C');
          el.classList.add('moving');
          if (hop) el.classList.add('hop');
          if (leap) el.classList.add('leap');
          setTimeout(() => el.classList.remove('moving', 'hop', 'leap'), leap ? 560 : 360);
        }
      }
      el._t = p.t;
      el._pen = p.pen;
      el._heat = p.t === 'R' ? this.heat[p.c] : 0;
      if (!special.has(p.id)) this.applyLook(el);
    }
    for (const [id, el] of this.els) {
      if (present.has(id)) continue;
      this.els.delete(id);
      if (events && capEv && capEv.piece.id === id) this.kill(el, capEv.kind, capEv.piece.t === 'K');
      else el.remove();
    }
    if (events) {
      if (document.hidden) {
        for (const id of special) { const el = this.els.get(id); if (el) this.applyLook(el); }
      } else {
        this.animate(evs);
        playEvents(evs);
        music.react(evs);
      }
    }
  }

  kill(el, kind, pope = false) {
    const v = pope ? 'pope' : ({ penance: 'blood', burn: 'burn', execute: 'burn', crusade: 'fall', ep: 'quiet' }[kind] || 'quiet');
    el.classList.add('die');
    setTimeout(() => el.classList.add('die-' + v), 170);
    setTimeout(() => el.remove(), 1500);
  }

  animate(evs) {
    const later = (ms, fn) => setTimeout(fn, ms);
    const get = (id) => this.els.get(id);
    const popeFell = evs.some((e) => e.type === 'popeFall');
    const mv = evs.find((e) => e.type === 'move');
    if (mv && mv.piece.t === 'R') {
      later(40, () => this.fx.embers(mv.from));
      later(470, () => { this.fx.dust(mv.to); this.fx.sparks(mv.to); });
    } else if (mv && !evs.some((e) => e.type === 'capture')) later(270, () => this.fx.dust(mv.to));
    for (const e of evs) {
      switch (e.type) {
        case 'capture':
          if (e.kind === 'penance') later(200, () => this.fx.blood(e.sq));
          else if (e.kind === 'burn' || e.kind === 'execute') {
            // plamen běží od každé Hranice, která oběť viděla
            (e.rooks || []).forEach((r) => this.fx.fireLine(r, e.sq));
            later(280, () => this.fx.fire(e.sq, true));
            later(420, () => this.fx.scorch(e.sq));
            later(650, () => this.fx.ash(e.sq));
          } else if (e.kind === 'crusade') {
            later(160, () => this.fx.slash(e.sq));
            later(260, () => this.fx.blood(e.sq));
            const el = mv && get(mv.id);
            if (el) {
              const a = this.posOf(mv.from), b = this.posOf(mv.to);
              el.style.setProperty('--rx', Math.sign(b.x - a.x) * 14 + '%');
              el.style.setProperty('--ry', Math.sign(b.y - a.y) * 14 + '%');
              later(290, () => { el.classList.add('recoil'); later(380, () => el.classList.remove('recoil')); });
            }
          } else if (e.kind === 'ep') later(140, () => this.fx.shadow(e.sq));
          break;
        case 'penance': {
          const el = get(e.id);
          if (!el || evs.some((x) => x.type === 'promote' && x.id === e.id)) break;
          const absolved = evs.some((x) => x.type === 'absolve' && x.id === e.id);
          later(300, () => this.fx.bloodDrop(e.sq));
          later(680, () => {
            el.classList.add('pen', 'chip-in');
            later(650, () => el.classList.remove('chip-in'));
            if (!absolved) this.applyLook(el);
          });
          break;
        }
        case 'absolve': {
          const el = get(e.id);
          if (!el) break;
          const t0 = evs.some((x) => x.type === 'penance' && x.id === e.id) ? 1300 : 400;
          later(t0, () => this.fx.beam(e.by, e.sq));
          later(t0 + 150, () => { this.fx.halo(e.sq); this.fx.shards(e.sq); el.classList.add('chip-out', 'glow'); });
          later(t0 + 700, () => { el.classList.remove('chip-out'); this.applyLook(el); });
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
          const t0 = popeFell ? 1400 : 150;
          later(t0, () => this.fx.smoke(e.sq));
          later(t0 + 300, () => this.fx.tiaraDrop(e.sq));
          later(t0 + 450, () => this.fx.ribbon('HABEMUS PAPAM'));
          later(t0 + 1300, () => {
            this.applyLook(el);
            el.classList.add('morph');
            this.fx.halo(e.sq);
            later(800, () => el.classList.remove('morph'));
          });
          break;
        }
        case 'heat': {
          const t0 = 650;
          later(t0, () => this.fx.ribbon(`<i class="cross">${ICON.heat}</i>ŽÁR ${'I'.repeat(e.level)}<i class="cross">${ICON.heat}</i>`, 'heat', 2200));
          e.rooks.forEach((sq, i) => {
            later(t0 + 250 + i * 180, () => {
              this.fx.heatUp(sq, e.level);
              const x = this.pieceAt(sq);
              if (x) { this.applyLook(x); x.classList.add('heat-in'); later(900, () => x.classList.remove('heat-in')); }
            });
          });
          break;
        }
        case 'heatLost': {
          const t0 = 700;
          e.rooks.forEach((sq, i) => {
            later(t0 + i * 160, () => {
              this.fx.extinguish(sq);
              const x = this.pieceAt(sq);
              if (x) { x.classList.add('heat-out'); later(650, () => { x.classList.remove('heat-out'); this.applyLook(x); }); }
            });
          });
          break;
        }
        case 'captive': {
          e.by.forEach((from, i) => later(320 + i * 120, () => this.fx.chainLine(from, e.sq)));
          later(800, () => {
            this.fx.shackle(e.sq);
            this.fx.ribbon(`<i class="cross">${ICON.chain}</i>ZAJETÍ!<i class="cross">${ICON.chain}</i>`, 'captive', 1900);
            const x = this.pieceAt(e.sq);
            if (x) { x.classList.add('jolt'); later(500, () => x.classList.remove('jolt')); }
          });
          break;
        }
        case 'freed':
          later(380, () => this.fx.breakChains(e.sq));
          break;
        case 'monitum': {
          const t0 = popeFell ? 3000 : 700;
          later(t0, () => { this.fx.ribbon(`<i class="cross">${ICON.monitum}</i>MONITUM!<i class="cross">${ICON.monitum}</i>`, 'monitum', 2000); this.fx.warn(e.sq); });
          break;
        }
        case 'crusade': {
          const t0 = popeFell ? 3000 : 600;
          later(t0, () => this.fx.ribbon(`<i class="cross">${ICON.cross}</i>DEUS VULT<i class="cross">${ICON.cross}</i>`, 'crusade', 2400));
          e.ids.forEach((id, i) => {
            const el = get(id);
            if (!el) return;
            const t1 = t0 + 350 + i * 160;
            later(t1, () => el.classList.add('shed'));
            later(t1 + 380, () => {
              el.classList.remove('shed');
              this.applyLook(el);
              el.classList.add('slam');
              this.fx.dust(el._sq);
              later(520, () => el.classList.remove('slam'));
            });
          });
          break;
        }
        default: break;
      }
    }
  }

  pieceAt(sq) {
    for (const el of this.els.values()) if (el._sq === sq) return el;
    return null;
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
      for (const cls of ['last', 'sel', 'reach', 'reach2', 'choice', 'danger', 'pre', 'captor']) el.classList.toggle(cls, !!(map[cls] && map[cls].has(sq)));
    }
  }
}

// ---------------- Hra ----------------
class Game {
  constructor({ mode, room = null, autoFlip = false, ai = null }) {
    this.mode = mode;
    this.ai = ai; // { color: barva stroje, level: 1..3 } v režimu proti stroji
    this.thinking = false;
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
    this.premove = null;
    this.selMode = 'play';
    this.view = new BoardView();
    this.bindBoard();
    this.bindControls();
    document.addEventListener('visibilitychange', () => { if (!document.hidden) document.title = 'Schizma'; });
  }

  result() { return this.state.result || this.ext; }

  canAct() {
    if (this.result() || !this.synced) return false;
    if (this.mode === 'local') return !this.ai || (this.state.turn !== this.ai.color && !this.thinking);
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
    try { r = E.applyAction(this.state, a); } catch (e) { sfx.error(); toast('Tento tah není podle pravidel povolen.'); return; }
    this.hist.push({ a, color: this.state.turn, events: r.events, after: r.state });
    this.actions.push(a);
    this.state = r.state;
    this.clearSel();
    this.refresh(r.events);
    this.persist();
    if (this.mode === 'online') this.sendState();
    if (this.ai) this.aiTurn(r.events);
    if (this.mode === 'local' && this.autoFlip && !this.result()) {
      const ply = this.state.ply;
      const slow = r.events.some((e) => e.type === 'popeFall' || e.type === 'conclave');
      setTimeout(() => { if (this.state.ply === ply) { this.view.setOrient(this.state.turn); this.refresh(); } }, slow ? 2700 : 1100);
    }
  }

  persist() {
    if (this.ai) store.set(KEY + 'ai', { a: this.actions, ext: this.ext, color: this.ai.color, level: this.ai.level });
    else if (this.mode === 'local') store.set(KEY + 'local', { a: this.actions, ext: this.ext, flip: this.autoFlip });
    else store.set(KEY + 'game-' + this.room, { a: this.actions, ext: this.ext });
  }

  // ---------- vykreslení ----------
  refresh(events = null) {
    this.legal = this.canAct() ? E.legalMoves(this.state) : [];
    if (this.sel >= 0) this.recomputeSel();
    this.view.sync(this.state, events);
    this.refreshPanels();
    this.prompts(!!events);
    this.tryPremove();
  }

  // ---------- výběr figurky, tahy soupeře a předtahy ----------
  // Barva, za kterou smím zadat předtah (online a proti stroji), jinak null
  premoveColor() {
    if (this.result() || !this.synced || !this.me) return null;
    if (this.mode === 'online' || this.ai) return this.me;
    return null;
  }

  // Tahy figurky na poli sq, jako by byla na tahu její strana (pro náhled a předtahy)
  ghostMoves(sq) {
    const p = this.state.board[sq];
    if (!p || this.result()) return [];
    const st = { ...this.state, turn: p.c, conclave: null, result: null, ep: p.c === this.state.turn ? this.state.ep : -1 };
    return E.legalMoves(st).filter((m) => m.from === sq);
  }

  recomputeSel() {
    const p = this.state.board[this.sel];
    if (!p) { this.clearSel(); return; }
    if (this.canAct() && p.c === this.state.turn && !this.state.conclave) {
      this.selMode = 'play';
      this.selMoves = this.legal.filter((m) => m.from === this.sel);
    } else {
      const pc = this.premoveColor();
      this.selMode = pc && p.c === pc && !this.canAct() ? 'pre' : 'view';
      this.selMoves = this.ghostMoves(this.sel);
    }
  }

  setPremove(from, to) {
    const ms = this.selMoves.filter((m) => m.from === from && m.to === to);
    if (!ms.length) return;
    const m = ms.find((x) => x.promo === 'Q') || ms[0];
    this.premove = { from, to, a: E.moveToString(m) };
    sfx.select();
    toast(`Předtah ${E.sqName(from)}–${E.sqName(to)}${m.promo ? ' (Spása v Inkvizitora)' : ''} – zahraje se, až budeš na tahu, pokud bude povolený.`, 3500);
    this.clearSel();
    this.renderMarks();
    this.renderHints();
    this.renderStory();
  }

  cancelPremove(msg) {
    if (!this.premove) return;
    this.premove = null;
    if (msg) toast(msg);
    this.renderMarks();
    this.renderStory();
  }

  tryPremove() {
    const pm = this.premove;
    if (!pm || !this.canAct() || this.state.conclave) return;
    if (this.result()) { this.premove = null; return; }
    if (!E.legalActions(this.state).includes(pm.a)) {
      this.cancelPremove('Předtah už není povolený – zrušen.');
      return;
    }
    const ply = this.state.ply;
    setTimeout(() => {
      if (this.premove !== pm) return;
      this.premove = null;
      if (this.state.ply === ply && this.canAct() && E.legalActions(this.state).includes(pm.a)) this.act(pm.a);
      else this.refreshPanels();
    }, 280);
  }

  refreshPanels() {
    this.renderBoardMood();
    this.renderMarks();
    this.renderHints();
    this.renderPlayers();
    this.renderMoves();
    this.renderStory();
    this.renderControls();
    this.renderBanners();
    this.renderNet();
  }

  // Potemnělá deska během konkláve, rudá viněta a zešedlé figurky poraženého
  renderBoardMood() {
    const b = this.view.el;
    const res = this.result();
    const sede = !res && !!this.state.conclave;
    b.classList.toggle('sede', sede);
    let smoke = b.querySelector('.sede-smoke');
    if (sede && !smoke) {
      smoke = document.createElement('div');
      smoke.className = 'sede-smoke';
      smoke.innerHTML = '<i></i><i></i><i></i>';
      b.appendChild(smoke);
    } else if (!sede && smoke) smoke.remove();
    const loser = res && res.winner ? other(res.winner) : null;
    b.classList.toggle('damned', !!loser);
    b.classList.toggle('lose-w', loser === 'w');
    b.classList.toggle('lose-b', loser === 'b');
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
    if (this.premove) map.pre = new Set([this.premove.from, this.premove.to]);
    if (this.reach) {
      const c = this.mode === 'online' && this.me ? this.me : this.state.turn;
      map.reach = new Set(E.rookReachSquares(this.state, c));
      map.reach2 = new Set(E.rookReachSquares(this.state, other(c)));
    }
    // Papež v zajetí Křižáka (řetěz) a Papež v dosahu soupeřových Hranic (hrozí mu poprava)
    if (!this.result()) {
      map.captive = new Set();
      map.captor = new Set();
      for (const c of ['w', 'b']) {
        const by = E.captors(this.state, c);
        if (by.length) { map.captive.add(E.popeSquare(this.state, c)); by.forEach((j) => map.captor.add(j)); }
      }
      map.danger = new Set();
      for (const c of ['w', 'b']) {
        const ps = E.popeSquare(this.state, c);
        if (ps >= 0 && E.inRookReach(this.state, other(c), ps)) map.danger.add(ps);
      }
    }
    if (this.state.conclave && this.canAct()) map.choice = new Set(this.state.conclave.options);
    this.view.mark(map);
    for (const el of this.view.els.values()) el.classList.toggle('chained', !!(map.captive && map.captive.has(el._sq) && el._t === 'K'));
  }

  renderHints() {
    const list = [];
    if (this.sel >= 0) {
      const byTo = new Map();
      for (const m of this.selMoves) if (!byTo.has(m.to)) byTo.set(m.to, m);
      for (const [to, m] of byTo) {
        let absolve = false;
        try { absolve = E.applyAction(this.state, E.moveToString(m)).events.some((e) => e.type === 'absolve'); } catch (e) { /* nic */ }
        let cls = 'hint' + (this.selMode === 'play' ? '' : this.selMode === 'pre' ? ' pre' : ' ghost');
        let inner = '';
        if (m.kind) {
          cls += ' cap ' + (m.kind === 'penance' ? 'pen' : 'clean');
          inner += '<div class="ring"></div>';
          const ic = { penance: ICON.blood, burn: ICON.fire, execute: ICON.fire, crusade: ICON.sword }[m.kind];
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
    if (this.mode !== 'online') {
      if (!this.ai) return '';
      if (c !== this.ai.color) return 'ty';
      return `stroj · ${LEVELS[this.ai.level].name}${this.thinking ? ' · přemýšlí…' : ''}`;
    }
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
      const lv = E.heatOf(this.state, c);
      const inq = this.state.inq[c];
      const heat = `<span class="heatbadge lv${lv}" title="Žár Hranic: úroveň ${lv} (dosah ${lv} pole), ${inq} ${inqWord(inq)}">${ICON.heat}Žár ${lv}<small>${inq >= 3 ? 'max' : inq + '/' + (inq >= 1 ? 3 : 1)}</small></span>`;
      const cru = this.state.crusade[c] ? `<span class="crubadge" title="Křížová výprava vyhlášena">${ICON.cross}</span>` : '';
      el.innerHTML = `<span class="disc ${c}"></span><div><div class="who">${PLAYER[c]}${pres === 'ty' ? ' (ty)' : ''} ${heat}${cru}</div>`
        + `<div class="meta">${pres && pres !== 'ty' ? pres + ' ' : ''}${mark}</div></div><div class="caps">${caps}</div>`;
    };
    put($('pl-top'), other(this.view.orient));
    put($('pl-bottom'), this.view.orient);
  }

  moveHTML(h) {
    if (h.a[0] === '@') return `${ICON.crown} konkláve ${h.a.slice(1)}`;
    const mv = h.events.find((e) => e.type === 'move');
    const cap = h.events.find((e) => e.type === 'capture');
    let s = `${mini(mv.piece.t, mv.piece.c)}${E.sqName(mv.from)}${cap ? '×' : '–'}${E.sqName(mv.to)}`;
    if (cap) s += { penance: ICON.blood, burn: ICON.fire, execute: ICON.fire, crusade: ICON.sword, ep: '' }[cap.kind] || '';
    const pr = h.events.find((e) => e.type === 'promote');
    if (pr) {
      const cr = h.events.find((e) => e.type === 'crusade' && e.ids.includes(pr.id));
      s += `${ICON.crown}${mini(cr ? 'C' : pr.t, mv.piece.c)}`;
    }
    if (h.events.some((e) => e.type === 'absolve')) s += ICON.halo;
    if (h.events.some((e) => e.type === 'popeFall')) s += ' †';
    if (h.events.some((e) => e.type === 'crusade')) s += ICON.cross;
    if (h.events.some((e) => e.type === 'heat')) s += ICON.heat;
    if (h.events.some((e) => e.type === 'monitum')) s += ICON.monitum;
    if (h.events.some((e) => e.type === 'captive')) s += ICON.chain;
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
        crusade: `${A} pobil ${V} na ${at}. Papežský odpustek ho chrání před pokáním.`,
        ep: `${A} spáchal tajný hřích – mimochodem sebral Poutníka na ${at}, bez pokání.`,
      }[cap.kind]);
    } else if (mv && mv.piece.t === 'R') {
      out.push(`${cap1(adj(mv.piece.c, 'R'))} Hranice se přenesla ${E.sqName(mv.from)}–${E.sqName(mv.to)}.`);
    } else if (mv) {
      out.push(`${cap1(adj(mv.piece.c, mv.piece.t))} ${NAME[mv.piece.t]} táhne ${E.sqName(mv.from)}–${E.sqName(mv.to)}.`);
    }
    const crusadeOf = (id) => evs.find((x) => x.type === 'crusade' && x.ids.includes(id));
    const promoted = evs.find((x) => x.type === 'promote');
    for (const e of evs) {
      if (e.type === 'promote') out.push(`Spása! Poutník se na ${E.sqName(e.sq)} proměnil v ${crusadeOf(e.id) ? ACC.C : ACC[e.t]}${e.cleansed ? ' a je očištěn od pokání' : ''}.`);
      if (e.type === 'crusade' && promoted && e.ids.length === 1 && e.ids[0] === promoted.id) continue;
      if (e.type === 'absolve') out.push(`${NAME[e.t]} na ${E.sqName(e.sq)} se vyzpovídal u ${GEN[e.byT]} a získal rozhřešení.`);
      if (e.type === 'popeFall') out.push(`${PLAYER[e.color]} Papež padl!`);
      if (e.type === 'conclave') out.push(`Habemus papam! ${cap1(adj(e.color, 'B'))} Kardinál na ${E.sqName(e.sq)} usedá na papežský stolec.`);
      if (e.type === 'crusade') {
        const lost = e.cause === 'inquisitor' ? 'Inkvizitora' : 'posledního Kardinála';
        out.push(e.ids.length
          ? `${PLAYER[e.color]} přišel o ${lost} – Křížová výprava! Misionáři se natrvalo stávají Křižáky. Deus vult!`
          : `${PLAYER[e.color]} přišel o ${lost} – vyhlašuje Křížovou výpravu. Deus vult!`);
      }
      if (e.type === 'inquisition' && !evs.some((x) => x.type === 'heat')) out.push(`Inkvizice! ${PLAYER[e.color]} Inkvizitor má na kontě ${e.inq >= 3 ? '3 a více' : e.inq} ${inqWord(e.inq)}.`);
      if (e.type === 'heat') out.push(`${SIDE_HR[e.color]} Hranice planou: Žár ${e.level}. úrovně – dosah i skok ${e.level} pole.`);
      if (e.type === 'heatLost') out.push(`${PLAYER[e.color]} přišel o posledního Inkvizitora – Žár jeho Hranic uhasl na 1. úroveň.`);
      if (e.type === 'captive') out.push(`<b>Zajetí!</b> ${PLAYER[e.color]} Papež na ${E.sqName(e.sq)} je v zajetí ${e.by.length > 1 ? 'Křižáků' : 'Křižáka'} – nesmí se pohnout ani zpovídat.`);
      if (e.type === 'freed') out.push(`${PLAYER[e.color]} Papež na ${E.sqName(e.sq)} je opět volný.`);
      if (e.type === 'monitum') out.push(`<b>Monitum!</b> ${PLAYER[e.color]} Papež na ${E.sqName(e.sq)} stojí v dosahu soupeřovy Hranice.`);
    }
    return out;
  }

  resultText(r) {
    if (r.reason === 'draw') return 'Remíza dohodou.';
    const L = PLAYER[other(r.winner)], W = PLAYER[r.winner];
    return {
      anathema: `Anathema – Vymýcení! ${L} Papež padl a není čistý Kardinál, kterého by šlo dosadit na papežský stolec. Vítězí ${W}.`,
      interdict: `Interdikt – Podrobení! ${L} nemá žádný povolený tah${this.state.result && E.isCaptive(this.state, other(r.winner)) ? ' (Papež je v zajetí Křižáka)' : ''} a prohrává. Vítězí ${W}.`,
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
      status = `<b>Konkláve!</b> ${PLAYER[c]}${c === this.me ? ' (ty)' : ''} volí nového Papeže z čistých Kardinálů.`;
    } else {
      const t = this.state.turn;
      const machine = this.ai && t === this.ai.color;
      status = `Na tahu: <b>${PLAYER[t]}</b>${t === this.me ? ' (ty)' : ''}${machine ? (this.thinking ? ' – stroj přemýšlí…' : ' (stroj)') : ''}.`;
    }
    let hint = '';
    if (this.sel >= 0) {
      const p = this.state.board[this.sel];
      if (p) hint = this.pieceTip(p);
    }
    let extra = '';
    if (this.premove) extra = `<div class="tip pre">Předtah: <b>${E.sqName(this.premove.from)}–${E.sqName(this.premove.to)}</b> – zruší se kliknutím na prázdné pole.</div>`;
    else if (this.sel >= 0 && this.selMode === 'pre') extra = '<div class="tip pre">Není tvůj tah – klikni na cílové pole a zadáš <b>předtah</b>.</div>';
    const fresh = this.storyLen !== this.hist.length;
    this.storyLen = this.hist.length;
    const cls = fresh ? 'ev new' : 'ev';
    $('story').innerHTML = lines.map((l) => `<div class="${cls}">${l}</div>`).join('')
      + `<div class="ev">${status}</div>` + (hint ? `<div class="tip">${hint}</div>` : '') + extra;
  }

  pieceTip(p) {
    let s = INFO[p.t] + (p.pen ? ' <b>' + PEN_INFO[p.t] + '</b>' : '');
    if (p.t === 'K' && E.isCaptive(this.state, p.c)) s += ' <b>Je v zajetí Křižáka – nesmí se pohnout ani zpovídat, dokud Křižák neodskočí nebo nepadne.</b>';
    if (p.t === 'R') {
      const lv = E.heatOf(this.state, p.c);
      const n = this.state.inq[p.c];
      s += ` <b>Žár ${lv}. úrovně – dosah ${lv} pole (${n} ${inqWord(n)}).</b>`;
    }
    return s;
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
      if (this.oldVersion) b.push('<div class="banner warn">Do místnosti přišla zpráva ze starší verze hry (jiná pravidla). Obnovte prosím oba stránku (Ctrl+F5); starou rozehranou partii nelze dohrát – založte novou.</div>');
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
      store.set(KEY + 'seat-' + this.rematch.room, this.rematch.c);
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
        this.openOverlay(`<div class="box"><h2>Papež padl!</h2><p>Konkláve: vyber jednoho ze svých ${n} čistých Kardinálů – stane se novým Papežem.</p>`
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
    const crusade = this.state.crusade[c];
    const opts = E.PROMOS.map((t) => {
      const shown = t === 'N' && crusade ? 'C' : t;
      return `<button type="button" data-t="${t}">${mini(shown, c)}<small>${NAME[shown]}</small></button>`;
    }).join('');
    this.openOverlay(`<div class="box"><h2>Spása!</h2><p>Poutník došel na konec cesty a je vykoupen. V co se promění?</p>`
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
    music.react([{ type: 'gameover' }]);
    if (r.reason === 'draw') sfx.draw();
    else if (!this.me || r.winner === this.me) sfx.win();
    else sfx.lose();
    const title = { anathema: 'Anathema · Vymýcení', interdict: 'Interdikt · Podrobení', resign: 'Kapitulace', draw: 'Remíza' }[r.reason] || 'Konec hry';
    let me = '';
    if (this.me && r.winner) me = r.winner === this.me ? '<p><b>Vítězíš! Tvé svědomí je čisté.</b></p>' : '<p><b>Prohráváš. Čas na pokání.</b></p>';
    const canRematch = this.mode === 'local' || !!this.me;
    this.openOverlay(`<div class="box"><h2>${title}</h2><p>${this.resultText(r)}</p>${me}<div class="row">`
      + (canRematch ? `<button class="btn primary" data-re>${this.rematch ? 'Přijmout odvetu' : 'Odveta'}</button>` : '')
      + '<button class="btn" data-x>Prohlédnout desku</button></div></div>', (ov) => {
      const re = ov.querySelector('[data-re]');
      if (re) re.onclick = () => this.rematchNow();
      ov.querySelector('[data-x]').onclick = () => this.closeOverlay();
    }, 'final');
  }

  async rematchNow() {
    if (this.ai) {
      store.del(KEY + 'ai');
      location.hash = `stroj=${this.ai.color}&uroven=${this.ai.level}`;
      return;
    }
    if (this.mode === 'local') {
      store.del(KEY + 'local');
      location.reload();
      return;
    }
    // Soupeř už odvetu navrhl → připojíme se k jeho místnosti, nezakládáme novou
    if (this.rematch) {
      store.set(KEY + 'seat-' + this.rematch.room, this.rematch.c);
      location.hash = 'hra=' + this.rematch.room;
      return;
    }
    const room = newRoomId();
    const c = other(this.me);
    store.set(KEY + 'seat-' + room, c);
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
      if (this.ai) {
        this.confirm('Nabídnout remízu', 'Nabídnout stroji remízu?', 'Nabídnout', () => {
          this.aiCall({ type: 'draw' }).then((r) => {
            if (r.ok && r.accept && !this.result()) {
              this.ext = { winner: null, reason: 'draw' };
              this.persist();
              this.refresh();
              toast('Stroj remízu přijal.');
            } else toast('Stroj remízu odmítá – věří si.');
          });
        });
      } else if (this.mode === 'local') {
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
      const loser = this.mode === 'local' && !this.ai ? this.state.turn : this.me;
      if (!loser) return;
      this.confirm('Vzdát se', this.mode === 'local' && !this.ai ? `Opravdu se ${PLAYER[loser]} vzdává?` : 'Opravdu se chceš vzdát?', 'Vzdát se', () => {
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
      $('btn-share').onclick = () => navigator.share({ title: 'Schizma', text: 'Zahraj si se mnou Schizma – šachovou variantu!', url: $('invite-url').value }).catch(() => {});
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

  clearSel() { this.sel = -1; this.selMoves = []; this.selMode = 'play'; }

  select(sq) {
    if (this.sel !== sq) sfx.select();
    this.sel = sq;
    this.recomputeSel();
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
      else toast('Vyber jednoho ze zvýrazněných čistých Kardinálů.');
      return;
    }
    if (this.sel >= 0 && this.selMoves.some((m) => m.to === sq)) {
      if (this.selMode === 'play') { this.tryMove(this.sel, sq); return; }
      if (this.selMode === 'pre') { this.setPremove(this.sel, sq); return; }
    }
    const p = this.state.board[sq];
    if (p) {
      const again = this.sel === sq;
      this.select(sq);
      const el = this.view.els.get(p.id);
      if (el && (this.selMode === 'play' || this.selMode === 'pre')) {
        this.drag = { sq, el, x: e.clientX, y: e.clientY, moved: false, again, id: e.pointerId };
        try { this.view.el.setPointerCapture(e.pointerId); } catch (err) { /* nic */ }
      } else if (again) this.deselect();
      return;
    }
    if (this.premove) this.cancelPremove('Předtah zrušen.');
    else if (!this.canAct() && this.mode === 'online' && this.me && !this.result() && this.synced) toast('Teď je na tahu soupeř.');
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
      if (sq >= 0 && sq !== d.sq && this.selMoves.some((m) => m.to === sq)) {
        if (this.selMode === 'pre') this.setPremove(d.sq, sq);
        else if (this.selMode === 'play') this.tryMove(d.sq, sq);
      }
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

  // ---------- hra proti stroji ----------
  startAI() {
    const saved = store.get(KEY + 'ai');
    if (saved && Array.isArray(saved.a) && saved.color === this.ai.color && saved.level === this.ai.level) {
      this.actions = saved.a.filter((x) => typeof x === 'string' && ACTION_RE.test(x));
      this.ext = saved.ext || null;
      this.rebuild();
    }
    this.me = other(this.ai.color);
    this.view.setOrient(this.me);
    this.initAI();
    this.refresh();
    this.aiTurn(null);
  }

  initAI() {
    this.aiReq = 0;
    this.aiWait = new Map();
    this.aiBases = [new URL('../model/', import.meta.url).href];
    try {
      this.worker = new Worker(new URL('./ai-worker.js?v=11', import.meta.url), { type: 'module' });
      this.worker.onmessage = (e) => {
        const cb = this.aiWait.get(e.data.id);
        if (cb) { this.aiWait.delete(e.data.id); cb(e.data); }
      };
      this.worker.onerror = () => { this.worker = null; };
    } catch (e) {
      this.worker = null;
    }
    this.aiCall({ type: 'load' }).then((r) => {
      if (r.ok && r.kind !== 'net') toast('Neuronová síť pro Schizma se ještě učí – stroj zatím hraje jen podle materiálu.', 5000);
    });
  }

  // Dotaz na stroj (ve Web Workeru, záložně v hlavním vlákně)
  aiCall(msg) {
    const id = ++this.aiReq;
    const payload = { ...msg, id, actions: this.actions.slice(), level: this.ai.level, bases: this.aiBases, aiColor: this.ai.color };
    if (this.worker) {
      const viaWorker = new Promise((res) => { this.aiWait.set(id, res); this.worker.postMessage(payload); });
      const fallback = new Promise((res) => setTimeout(() => res(null), 20000));
      return Promise.race([viaWorker, fallback]).then((r) => {
        if (r) return r;
        this.worker = null;
        return this.aiCall(msg);
      });
    }
    return import('./ai.js?v=11').then(async (A) => {
      if (!this.aiModel) {
        this.aiKind = 'material';
        this.aiModel = A.materialModel;
        for (let i = 0; i < this.aiBases.length; i++) {
          try { this.aiModel = await A.loadModel(this.aiBases[i]); this.aiKind = i === 0 ? 'net' : 'net-fallback'; break; } catch (e) { /* další */ }
        }
      }
      if (msg.type === 'load') return { ok: true, kind: this.aiKind };
      if (msg.type === 'move') return { ok: true, action: A.chooseAction(this.aiModel, this.state, this.ai.level) };
      if (msg.type === 'draw') return { ok: true, accept: A.acceptsDraw(this.aiModel, this.state, this.ai.color) };
      return { ok: false };
    });
  }

  aiTurn(events) {
    if (!this.ai || this.result() || this.state.turn !== this.ai.color || this.thinking) return;
    this.thinking = true;
    this.refreshPanels();
    const slow = events && events.some((e) => ['popeFall', 'conclave', 'crusade', 'heat', 'monitum', 'captive'].includes(e.type));
    const delay = events ? (slow ? 2600 : 800) : 500;
    const len = this.actions.length;
    const t0 = Date.now();
    this.aiCall({ type: 'move' }).then((r) => {
      setTimeout(() => {
        this.thinking = false;
        if (this.actions.length !== len || this.result()) { this.refreshPanels(); return; }
        if (r && r.ok && r.action) this.act(r.action);
        else { toast('Stroj nenašel tah.'); this.refreshPanels(); }
      }, Math.max(0, delay - (Date.now() - t0)));
    });
  }

  // ---------- místní hra ----------
  startLocal() {
    const saved = store.get(KEY + 'local');
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
    this.chat = [];
    this.chatSeen = new Set();
    this.setupChat();
    $('invite-url').value = location.origin + location.pathname + '#hra=' + this.room;

    const saved = store.get(KEY + 'game-' + this.room);
    if (saved && Array.isArray(saved.a)) {
      this.actions = saved.a.filter((x) => typeof x === 'string' && ACTION_RE.test(x));
      this.ext = saved.ext || null;
      this.rebuild();
    }
    const urlSeat = params.get('barva');
    const seat = store.get(KEY + 'seat-' + this.room);
    if (urlSeat === 'w' || urlSeat === 'b') { this.me = urlSeat; store.set(KEY + 'seat-' + this.room, urlSeat); }
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
  setupChat() {
    $('chat').hidden = false;
    const quick = ['Dobrý tah!', 'Kaj se!', 'Monitum!', 'Deus vult!'];
    $('chat-quick').innerHTML = '';
    for (const q of quick) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'btn small ghost';
      b.textContent = q;
      b.onclick = () => this.sendChat(q);
      $('chat-quick').appendChild(b);
    }
    $('chat-form').onsubmit = (e) => {
      e.preventDefault();
      const inp = $('chat-input');
      if (this.sendChat(inp.value)) inp.value = '';
    };
  }

  sendChat(text) {
    const t = String(text || '').trim().slice(0, 300);
    if (!t || !this.net) return false;
    const ts = Date.now();
    this.chatSeen.add(this.cid + ':' + ts);
    this.chat.push({ c: this.me, text: t, mine: true });
    this.renderChat();
    this.net.send({ k: 'chat', id: this.cid, c: this.me, t, ts });
    return true;
  }

  renderChat() {
    const log = $('chat-log');
    log.innerHTML = '';
    if (!this.chat.length) {
      const e = document.createElement('div');
      e.className = 'chat-empty';
      e.textContent = 'Zatím žádné zprávy.';
      log.appendChild(e);
    }
    for (const msg of this.chat) {
      const row = document.createElement('div');
      row.className = 'msg' + (msg.mine ? ' mine' : '');
      const who = document.createElement('span');
      who.className = 'who ' + (msg.c || 'x');
      who.textContent = (msg.c ? PLAYER[msg.c] : 'Divák') + (msg.mine ? ' (ty)' : '') + ': ';
      const txt = document.createElement('span');
      txt.textContent = msg.text;
      row.append(who, txt);
      log.appendChild(row);
    }
    log.scrollTop = log.scrollHeight;
  }

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
    store.set(KEY + 'seat-' + this.room, c);
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
    if (m.k === '_version') { if (!this.oldVersion) { this.oldVersion = true; if (!fromHistory) this.renderBanners(); } return; }
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
      case 'chat': {
        const text = typeof m.t === 'string' ? m.t.trim().slice(0, 300) : '';
        const uid = m.id + ':' + m.ts;
        if (!text || this.chatSeen.has(uid)) break;
        this.chatSeen.add(uid);
        this.chat.push({ c, text, mine });
        if (this.chat.length > 200) this.chat.shift();
        this.renderChat();
        if (!fromHistory && !mine) {
          sfx.chat();
          if (document.activeElement !== $('chat-input')) toast(`${c ? PLAYER[c] : 'Divák'}: ${text}`, 4500);
        }
        break;
      }
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
      if (this.sel >= 0) this.recomputeSel();
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
    if (grow >= 1 && document.hidden && this.canAct()) { document.title = '● Tvůj tah – Schizma'; sfx.notify(); }
  }
}

// ---------------- Start ----------------
const SOUND_ON = '<svg viewBox="0 0 24 24"><path d="M4 9h4l5-4v14l-5-4H4z" fill="currentColor"/><path d="M16 8.5a5 5 0 0 1 0 7M18.5 6a8.5 8.5 0 0 1 0 12" stroke="currentColor" stroke-width="1.8" fill="none" stroke-linecap="round"/></svg>';
const SOUND_OFF = '<svg viewBox="0 0 24 24"><path d="M4 9h4l5-4v14l-5-4H4z" fill="currentColor"/><path d="M16.5 9.5l5 5M21.5 9.5l-5 5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>';

const MUSIC_ON = '<svg viewBox="0 0 24 24"><path d="M9 17.5V6l10-2.5v11.5" stroke="currentColor" stroke-width="1.8" fill="none" stroke-linejoin="round"/><circle cx="6.5" cy="17.5" r="2.6" fill="currentColor"/><circle cx="16.5" cy="15" r="2.6" fill="currentColor"/></svg>';
const MUSIC_OFF = '<svg viewBox="0 0 24 24"><path d="M9 17.5V6l10-2.5v11.5" stroke="currentColor" stroke-width="1.8" fill="none" stroke-linejoin="round" opacity=".45"/><circle cx="6.5" cy="17.5" r="2.6" fill="currentColor" opacity=".45"/><circle cx="16.5" cy="15" r="2.6" fill="currentColor" opacity=".45"/><path d="M4 4l16 16" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>';

function setupSound() {
  const btn = $('btn-sound');
  const paint = () => {
    btn.innerHTML = isMuted() ? SOUND_OFF : SOUND_ON;
    btn.title = isMuted() ? 'Zapnout zvuk' : 'Vypnout zvuk';
    btn.setAttribute('aria-label', btn.title);
  };
  paint();
  btn.onclick = () => { setMuted(!isMuted()); paint(); if (!isMuted()) sfx.select(); };
  const mbtn = $('btn-music');
  const paintMusic = () => {
    mbtn.innerHTML = music.isOn() ? MUSIC_ON : MUSIC_OFF;
    mbtn.title = music.isOn() ? 'Vypnout hudbu' : 'Zapnout hudbu';
    mbtn.setAttribute('aria-label', mbtn.title);
  };
  paintMusic();
  mbtn.onclick = () => { unlock(); music.setOn(!music.isOn()); paintMusic(); };
  const wake = () => { unlock(); music.autostart(); };
  document.addEventListener('pointerdown', wake, { passive: true });
  document.addEventListener('keydown', wake);
}

function main() {
  window.__music = music;
  setupRules();
  setupSound();
  addEventListener('hashchange', () => location.reload());
  $('home-link').onclick = (e) => { e.preventDefault(); location.hash = ''; if (!location.hash) location.reload(); };
  const room = params.get('hra');
  if (room && ROOM_RE.test(room)) {
    $('game').hidden = false;
    const g = new Game({ mode: 'online', room });
    window.__game = g;
    g.startOnline();
  } else if (params.has('stroj')) {
    $('game').hidden = false;
    const human = params.get('stroj') === 'b' ? 'b' : 'w';
    const lv = parseInt(params.get('uroven'), 10);
    const g = new Game({ mode: 'local', ai: { color: other(human), level: [1, 2, 3].includes(lv) ? lv : 2 } });
    window.__game = g;
    g.startAI();
  } else if (params.has('mistni')) {
    $('game').hidden = false;
    const saved = store.get(KEY + 'local');
    const g = new Game({ mode: 'local', autoFlip: params.get('otacet') === '1' || !!(saved && saved.flip) });
    window.__game = g;
    g.startLocal();
  } else {
    showLobby();
  }
}

main();
