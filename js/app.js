// Schizma – aplikace (lobby, deska, online hra)
import * as E from './engine.js?v=29';
import { pieceSVG, CHIP_SVG, HEAT_SVG, CRUSADE_CHIP_SVG, ICON } from './pieces.js?v=29';
import { FX } from './fx.js?v=29';
import { Channel, newRoomId, clientId, ROOM_RE } from './net.js?v=29';
import { RULES_HTML } from './rules.js?v=29';
import { sfx, playEvents, unlock, isMuted, setMuted, getCtx } from './sound.js?v=29';
import { MusicPlayer } from './music.js?v=29';

const music = new MusicPlayer(getCtx);
import { LEVELS } from './ai.js?v=29';

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
const SIDE_GEN = { w: 'bílé', b: 'černé' };
const ACC = { K: 'Papeže', Q: 'Inkvizitora', R: 'Hranici', B: 'Kardinála', N: 'Misionáře', C: 'Křižáka', P: 'Poutníka' };
const GEN = { K: 'Papeže', B: 'Kardinála' };
const ACTION_RE = /^([a-h][1-8][a-h][1-8][qbn]?(>[a-h][1-8])?|@[a-h][1-8])$/;
const KEY = 'sz2-';
const inqWord = (n) => (n >= 1 && n <= 4 ? 'inkvizice' : 'inkvizic');
const cap1 = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const adj = (c, t) => (t === 'R' ? (c === 'w' ? 'bílá' : 'černá') : (c === 'w' ? 'bílý' : 'černý'));
const mini = (t, c) => `<span class="mini ${c}">${pieceSVG(t)}</span>`;
const params = new URLSearchParams(location.hash.slice(1));

const INFO = {
  K: 'Papež – táhne o 1 pole. Soupeřovu figurku smí odstranit jen Upálením (cíl v dosahu jeho Hranice) a sám padne jen Upálením v dosahu soupeřovy Hranice – Poutník ho neodstraní nikdy. Pokání nepropadá. Zpovídá všechny (i diagonálně). Ohrožuje-li ho soupeřův Křižák skokem jezdce, je v Zajetí: nesmí se pohnout ani zpovídat.',
  Q: 'Inkvizitor – má odpustky a nikdy nepropadá Pokání. V dosahu Hranice upaluje. Mimo dosah zahájí Inkvizici: dostane červený žeton a nesmí brát, dokud nedojde vedle své Hranice – žeton se pak přesune pod ni a její Žár stoupne na 2. úroveň (maximum; u dvou Hranic si vybereš).',
  R: 'Hranice – nebere a nelze ji odstranit. Skáče na volné pole v poloměru svého Žáru (1–2). Soupeřovy figurky v jejím dosahu lze upálit bez Pokání (neplatí pro Poutníky).',
  B: 'Kardinál – zpovídá Poutníky a Misionáře (jen vodorovně a svisle), sám se zpovídá u Papeže. Bezúhonný Kardinál padne jen Upálením a může být zvolen Papežem. Ohrožuje-li ho soupeřův Křižák skokem jezdce, je v Zajetí.',
  N: 'Misionář – táhne jako jezdec, po zabití mimo dosah Hranice propadá Pokání. Zpověď u Kardinála nebo Papeže. Když strana přijde o posledního Kardinála nebo Inkvizitora, stane se Křižákem.',
  C: 'Křižák – táhne jako jezdec a díky papežskému odpustku nikdy nepropadá Pokání. Papeže a bezúhonného Kardinála smí jen upálit (v dosahu Hranice); ohrožuje-li je skokem jezdce, drží je v Zajetí.',
  P: 'Poutník – smí kdykoliv o 1 nebo 2 pole vpřed. Nikdy neupaluje: každé Krveprolití znamená Pokání (kromě Svedení a přepadení Inkvizitora). Papeže ani bezúhonného Kardinála odstranit nesmí. Zpověď u Kardinála nebo Papeže.',
};
const PEN_INFO = {
  P: 'Kaje se – nesmí brát (Svedení en passant ale smí), dokud nestojí vodorovně či svisle vedle Kardinála nebo kdekoliv vedle Papeže.',
  N: 'Kaje se – nesmí brát, dokud nestojí vodorovně či svisle vedle Kardinála nebo kdekoliv vedle Papeže.',
  Q: 'Probíhá Inkvizice – nesmí brát, dokud nestojí vedle své Hranice (i diagonálně).',
  B: 'Kaje se – přišel o imunitu (padne i běžným zabitím), nesmí brát a nemůže být zvolen Papežem, dokud se nevyzpovídá u Papeže.',
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
  setupHistory();
  setupContinue();
}

// Rozehrané partie, ve kterých lze pokračovat (z historie v tomto prohlížeči)
function resumeHash(x) {
  if (x.res) return null;
  if (x.kind === 'online') return ROOM_RE.test(x.id) ? 'hra=' + x.id : null;
  if (x.kind === 'ai') {
    const s = store.get(KEY + 'ai');
    return s && s.id === x.id && !s.ext ? `stroj=${other(s.color)}&uroven=${s.level}` : null;
  }
  const s = store.get(KEY + 'local');
  return s && s.id === x.id && !s.ext ? 'mistni' + (s.flip ? '&otacet=1' : '') : null;
}

function setupContinue() {
  const list = (store.get(KEY + 'archive') || []).map((x) => ({ x, h: resumeHash(x) })).filter((r) => r.h).slice(0, 5);
  const card = $('continue-card');
  card.hidden = !list.length;
  if (!list.length) return;
  $('continue-list').innerHTML = list.map(({ x, h }, i) => {
    const side = x.me ? ` · hraješ za ${x.me === 'w' ? 'bílé' : 'černé'}` : '';
    return `<div class="hrow"><div class="hinfo"><b>${escapeHTML(x.desc)}</b>${side}<br><small>${fmtDate(x.u || x.t)} · ${x.a.length} půltahů</small></div>`
      + `<button class="btn small${i === 0 ? ' primary' : ''}" data-go="${escapeHTML(h)}" type="button">Pokračovat</button></div>`;
  }).join('');
  $('continue-list').querySelectorAll('[data-go]').forEach((b) => { b.onclick = () => { location.hash = b.dataset.go; }; });
}

// ---------------- Historie partií ----------------
const escapeHTML = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmtDate = (t) => {
  try { return new Date(t).toLocaleString('cs-CZ', { day: 'numeric', month: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }); } catch (e) { return ''; }
};

function historyResult(x) {
  const r = x.res;
  if (!r) return 'rozehraná';
  if (r.reason === 'draw') return 'remíza';
  const why = { anathema: 'Exstirpatio', interdict: 'Abjuratio', resign: 'vzdání' }[r.reason] || '';
  const who = x.me ? (r.winner === x.me ? 'výhra' : 'prohra') : `vítězí ${PLAYER[r.winner].toLowerCase()}`;
  return why ? `${who} · ${why}` : who;
}

function setupHistory() {
  const dlg = $('history');
  const render = () => {
    const list = store.get(KEY + 'archive') || [];
    $('history-count').textContent = list.length ? `Uložených partií: ${list.length}` : 'Zatím žádné odehrané partie.';
    $('history-body').innerHTML = list.length ? list.map((x) => {
      const side = x.me ? ` · ${x.me === 'w' ? 'bílé' : 'černé'}` : '';
      const res = historyResult(x);
      const cls = x.res && x.me ? (x.res.winner === x.me ? 'win' : x.res.winner ? 'loss' : '') : '';
      return `<div class="hrow"><div class="hinfo"><b>${escapeHTML(x.desc)}</b>${side}<br><small>${fmtDate(x.t)} · ${x.a.length} půltahů · <span class="hres ${cls}">${res}</span></small></div>`
        + `<div class="row"><button class="btn small primary" data-play="${escapeHTML(x.id)}">Přehrát</button><button class="btn small ghost" data-del="${escapeHTML(x.id)}" title="Smazat záznam">✕</button></div></div>`;
    }).join('') : '<p class="note">Odehrané partie se ukládají jen v tomto prohlížeči.</p>';
    $('history-body').querySelectorAll('[data-play]').forEach((b) => { b.onclick = () => { location.hash = 'zaznam=' + b.dataset.play; }; });
    $('history-body').querySelectorAll('[data-del]').forEach((b) => {
      b.onclick = () => {
        store.set(KEY + 'archive', (store.get(KEY + 'archive') || []).filter((x) => x.id !== b.dataset.del));
        render();
      };
    });
  };
  render();
  $('btn-history').onclick = () => { render(); if (dlg.showModal) dlg.showModal(); else dlg.setAttribute('open', ''); };
  $('history-close').onclick = () => dlg.close();
  dlg.addEventListener('click', (e) => { if (e.target === dlg) dlg.close(); });
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
    this.timers = new Set();
    this.busyUntil = 0;
    this.state = null;
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
    el.className = 'piece ' + p.c + (p.t === 'R' ? ' rook' : '') + (p.t === 'Q' ? ' inq' : '');
    el.innerHTML = p.t === 'R'
      ? HEAT_SVG + '<span class="rflame"><i></i><i></i><i></i><i></i><i></i></span>' + pieceSVG(p.t) + '<span class="rfront"><i></i><i></i><i></i></span><span class="rembers"><u></u><b></b><b></b><b></b><b></b></span>'
      : CHIP_SVG + CRUSADE_CHIP_SVG + pieceSVG(p.t);
    el.classList.toggle('cru', p.t === 'C');
    el._shownT = p.t;
    el._t = p.t;
    el._pen = p.pen;
    el._heat = el._shownHeat = p.t === 'R' ? E.rookHeat(p) : 0;
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
    el.classList.toggle('inq', el._t === 'Q');
    if (el._t === 'R' && el._shownHeat !== el._heat) {
      el._shownHeat = el._heat;
      el.dataset.heat = el._heat;
    }
  }

  // Srovná DOM se stavem; `events` (události posledního tahu) spustí animace
  sync(state, events = null) {
    const evs = events || [];
    if (events) this.flush();
    this.state = state;
    const capEv = evs.find((e) => e.type === 'capture');
    const mvEv = evs.find((e) => e.type === 'move');
    const special = new Set(evs.filter((e) => ['promote', 'conclave', 'penance', 'absolve', 'inqStart', 'inqDone'].includes(e.type)).map((e) => e.id));
    for (const e of evs) if (e.type === 'crusade') e.ids.forEach((id) => special.add(id));
    for (const e of evs) if (e.type === 'inqDone') special.add(e.rookId);
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
      el._heat = p.t === 'R' ? E.rookHeat(p) : 0;
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
    const v = pope ? 'pope' : ({ penance: 'blood', burn: 'burn', execute: 'burn', crusade: 'fall', ambush: 'blood', inquisition: 'seized', ep: 'astray' }[kind] || 'quiet');
    el.classList.add('die');
    setTimeout(() => el.classList.add('die-' + v), 170);
    setTimeout(() => el.remove(), 1500);
  }

  animate(evs) {
    const later = (ms, fn) => this.later(ms, fn);
    const Q = []; // fronta ohlášení { ms, run }
    let end = null;
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
          } else if (e.kind === 'inquisition') {
            later(120, () => this.fx.seize(e.sq));
          } else if (e.kind === 'ambush') {
            later(160, () => this.fx.slash(e.sq));
            later(240, () => this.fx.blood(e.sq));
          } else if (e.kind === 'ep') later(140, () => this.fx.astray(e.sq, mv && E.fileOf(mv.to) < E.fileOf(e.sq) ? 1 : -1));
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
        case 'popeFall': {
          later(260, () => {
            this.el.classList.remove('shake');
            void this.el.offsetWidth;
            this.el.classList.add('shake');
            later(650, () => this.el.classList.remove('shake'));
          });
          if (evs.some((x) => x.type === 'gameover')) break; // Exstirpatio – ohlásí ji konec partie
          const auto = evs.some((x) => x.type === 'conclave');
          Q.push({ ms: auto ? 1700 : 2300, run: () => {
            this.fx.proclaim({ title: 'SEDE VACANTE', cls: 'sede', icon: ICON.crown, ms: auto ? 1700 : 2300,
              sub: auto ? `${PLAYER[e.color]} Papež padl – na stolec usedá jediný bezúhonný Kardinál`
                : `${PLAYER[e.color]} Papež padl – Konkláve volí nástupce` });
            this.fx.fumata(false, auto ? 1500 : 2600);
            if (auto) this.fx.wash('sede', 1800);
            sfx.sede(0);
          } });
          break;
        }
        case 'conclave': {
          const el = get(e.id);
          Q.push({ ms: 2500, run: () => {
            this.fx.proclaim({ title: 'HABEMUS PAPAM', sub: `Nový Papež na ${E.sqName(e.sq)}`, cls: 'habemus', icon: ICON.crown, ms: 2500 });
            this.fx.fumata(true, 2600);
            this.fx.wash('habemus', 2400);
            this.fx.smoke(e.sq);
            sfx.conclave(0.15);
            later(250, () => this.fx.tiaraDrop(e.sq));
            later(650, () => this.fx.heaven(e.sq));
            later(1050, () => {
              if (!el) return;
              this.applyLook(el);
              el.classList.add('morph');
              later(800, () => el.classList.remove('morph'));
            });
          } });
          break;
        }
        case 'inqStart': {
          const el = get(e.id);
          Q.push({ ms: 1700, run: () => {
            this.fx.proclaim({ title: 'INKVIZICE', sub: 'Zajatec čeká na Hranici – Inkvizitor do té doby nesmí brát', cls: 'inquisition', icon: ICON.seal, ms: 1700 });
            if (el) { this.applyLook(el); el.classList.add('chip-in'); later(650, () => el.classList.remove('chip-in')); }
          } });
          break;
        }
        case 'inqDone': {
          const el = get(e.id);
          later(300, () => this.fx.chipFly(e.sq, e.rook));
          later(350, () => this.fx.fireLine(e.sq, e.rook, 320));
          later(650, () => {
            this.fx.fire(e.sq, false);
            if (el) { el.classList.add('chip-out'); later(650, () => { el.classList.remove('chip-out'); this.applyLook(el); }); }
          });
          if (!e.raised) later(900, () => { const x = this.pieceAt(e.rook); if (x) this.applyLook(x); });
          break;
        }
        case 'inqFoiled':
          later(380, () => this.fx.sealBreak(e.sq));
          later(520, () => this.fx.extinguish(e.sq));
          break;
        case 'heat': {
          Q.push({ ms: 1800, run: () => {
            this.fx.proclaim({ title: `ŽÁR ${'I'.repeat(e.level)}`, sub: `Hranice teď sahá do ${e.level} ${e.level > 1 ? 'polí' : 'pole'} a skáče dál`, cls: 'heat', icon: ICON.heat, ms: 1800 });
            sfx.heat(0, e.level);
            e.rooks.forEach((sq, i) => {
              later(200 + i * 180, () => {
                this.fx.heatUp(sq, e.level);
                const x = this.pieceAt(sq);
                if (x) { this.applyLook(x); x.classList.add('heat-in'); later(900, () => x.classList.remove('heat-in')); }
              });
            });
          } });
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
          // více zajatých v jednom tahu (vidlička) = jedno ohlášení
          if (evs.find((x) => x.type === 'captive') !== e) break;
          const all = evs.filter((x) => x.type === 'captive');
          const who = all.map((x) => `${NAME[x.t]} na ${E.sqName(x.sq)}`).join(' a ');
          Q.push({ ms: 1900, run: () => {
            all.forEach((x) => x.by.forEach((from, i) => later(i * 120, () => this.fx.chainLine(from, x.sq))));
            later(450, () => {
              all.forEach((x) => {
                this.fx.shackle(x.sq);
                const el = this.pieceAt(x.sq);
                if (el) { el.classList.add('jolt'); later(500, () => el.classList.remove('jolt')); }
              });
              this.fx.proclaim({ title: 'ZAJETÍ', sub: `${PLAYER[e.color]} ${who} – nesmí se pohnout ani zpovídat`, cls: 'captive', icon: ICON.chain, ms: 1500 });
            });
            sfx.clank(0.15);
          } });
          break;
        }
        case 'freed':
          later(380, () => { this.fx.breakChains(e.sq); this.fx.freed(e.sq); });
          break;
        case 'monitum': {
          const rooks = [];
          const st = this.state;
          if (st) {
            st.board.forEach((p, sq) => {
              if (p && p.t === 'R' && p.c === e.by
                && Math.max(Math.abs(E.fileOf(sq) - E.fileOf(e.sq)), Math.abs(E.rankOf(sq) - E.rankOf(e.sq))) <= E.rookHeat(p)) rooks.push(sq);
            });
          }
          Q.push({ ms: 1900, run: () => {
            this.fx.proclaim({ title: 'IGNIS!', sub: `${PLAYER[e.color]} Papež na ${E.sqName(e.sq)} je v dosahu Hranice – hrozí mu poprava`, cls: 'ignis', icon: ICON.fire, ms: 1900 });
            this.fx.wash('ignis', 1800);
            rooks.forEach((r) => this.fx.fireLine(r, e.sq, 420));
            later(300, () => { this.fx.ignite(e.sq); this.fx.warn(e.sq); });
            sfx.ignis(0);
          } });
          break;
        }
        case 'crusade': {
          const lost = e.cause === 'inquisitor' ? 'Inkvizitora' : 'posledního Kardinála';
          Q.push({ ms: 2600, run: () => {
            this.fx.proclaim({ title: 'DEUS VULT!', cls: 'crusade', icon: ICON.cross, ms: 2600,
              sub: `${PLAYER[e.color]} přišel o ${lost} – ${e.ids.length ? 'Misionáři se stávají Křižáky' : 'Křížová výprava je vyhlášena'}` });
            this.fx.wash('crusade', 2300);
            this.fx.crosses(2000);
            sfx.deusVult(0);
            e.ids.forEach((id, i) => {
              const el = get(id);
              if (!el) return;
              const t1 = 500 + i * 180;
              later(t1, () => el.classList.add('shed'));
              later(t1 + 380, () => {
                el.classList.remove('shed');
                this.applyLook(el);
                el.classList.add('slam');
                this.fx.dust(el._sq);
                later(520, () => el.classList.remove('slam'));
              });
            });
          } });
          break;
        }
        case 'gameover': {
          const r = e.result;
          if (!r || !r.winner) break;
          const loser = other(r.winner);
          const anathema = r.reason === 'anathema';
          end = { ms: 2800, run: () => {
            if (anathema) {
              this.fx.proclaim({ title: 'EXSTIRPATIO', sub: `${PLAYER[loser]} nemá koho dosadit na papežský stolec – prohra extirpací`, cls: 'anathema', icon: ICON.fire, ms: 2800 });
              this.fx.wash('anathema', 2800);
              const sqs = [];
              this.state.board.forEach((p, sq) => { if (p && p.c === loser) sqs.push(sq); });
              later(500, () => this.fx.snuff(sqs));
              sfx.anathema(0);
            } else {
              this.fx.proclaim({ title: 'ABJURATIO', sub: `${PLAYER[loser]} nemá tah aktivní figurkou – prohra abjurací`, cls: 'interdict', icon: ICON.chain, ms: 2800 });
              this.fx.wash('interdict', 2800);
              this.fx.sealStamp(2600);
              later(420, () => {
                this.el.classList.remove('shake');
                void this.el.offsetWidth;
                this.el.classList.add('shake');
                later(650, () => this.el.classList.remove('shake'));
              });
              sfx.interdict(0);
            }
          } };
          break;
        }
        default: break;
      }
    }
    // Ohlášení jdou za sebou, nikdy přes sebe; konec partie vždy jako poslední
    if (end) Q.push(end);
    let t = popeFell ? 1350 : evs.some((x) => x.type === 'inqDone') ? 950 : 520;
    for (const it of Q) { later(t, it.run); t += it.ms + 140; }
    this.busyUntil = performance.now() + (Q.length ? t : 700);
  }

  pieceAt(sq) {
    for (const el of this.els.values()) if (el._sq === sq) return el;
    return null;
  }

  // časovač animace, který lze zrušit (další tah, listování historií)
  later(ms, fn) {
    const t = setTimeout(() => { this.timers.delete(t); fn(); }, ms);
    this.timers.add(t);
    return t;
  }

  // kolik ms ještě běží animace a ohlášení posledního tahu
  busyMs() { return Math.max(0, this.busyUntil - performance.now()); }

  // ukončí rozehrané animace a ohlášení (vzhled figurek pak srovná sync)
  flush() {
    for (const t of this.timers) clearTimeout(t);
    this.timers.clear();
    this.busyUntil = 0;
    this.fx.clearProclaims();
    for (const el of this.els.values()) el.classList.remove('shed', 'slam', 'morph', 'chip-in', 'chip-out', 'heat-in', 'heat-out', 'jolt', 'glow', 'recoil');
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
  constructor({ mode, room = null, autoFlip = false, ai = null, replay = null }) {
    this.mode = mode;
    this.replay = replay; // záznam partie z historie (jen prohlížení)
    this.viewPly = null;  // null = živá pozice, jinak počet půltahů zobrazené pozice
    this.gameId = null;
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
    this.bindKeys();
    document.addEventListener('visibilitychange', () => { if (!document.hidden) document.title = 'Schizma'; });
  }

  result() { return this.state.result || this.ext; }

  canAct() {
    if (this.replay || this.viewPly != null) return false;
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
      setTimeout(() => { if (this.state.ply === ply) { this.view.setOrient(this.state.turn); this.refresh(); } }, Math.max(1100, this.view.busyMs() + 300));
    }
  }

  persist() {
    if (this.replay) return;
    if (!this.gameId) this.gameId = this.room || newRoomId();
    if (this.ai) store.set(KEY + 'ai', { a: this.actions, ext: this.ext, color: this.ai.color, level: this.ai.level, id: this.gameId });
    else if (this.mode === 'local') store.set(KEY + 'local', { a: this.actions, ext: this.ext, flip: this.autoFlip, id: this.gameId });
    else store.set(KEY + 'game-' + this.room, { a: this.actions, ext: this.ext });
    this.archive();
  }

  // Uloží partii do historie v tomto prohlížeči (nejvýš 60 posledních partií)
  archive() {
    if (this.actions.length < 2) return;
    const list = store.get(KEY + 'archive') || [];
    const i = list.findIndex((x) => x.id === this.gameId);
    const old = i >= 0 ? list[i] : null;
    const kind = this.ai ? 'ai' : this.mode;
    const desc = this.ai ? `Proti stroji (${LEVELS[this.ai.level].name})` : this.mode === 'online' ? 'Online' : 'Na jednom zařízení';
    const entry = {
      id: this.gameId, kind, desc, me: this.me || null, t: old ? old.t : Date.now(), u: Date.now(),
      a: this.actions.slice(), ext: this.ext || null, res: this.result() ? { ...this.result() } : null,
    };
    if (i >= 0) list.splice(i, 1);
    list.unshift(entry);
    store.set(KEY + 'archive', list.slice(0, 60));
  }

  // ---------- procházení předchozích pozic (šipky) ----------
  shownState() {
    if (this.viewPly == null) return this.state;
    return this.viewPly === 0 ? E.initialState() : this.hist[this.viewPly - 1].after;
  }

  showPly(k, animate = false) {
    const n = this.hist.length;
    k = Math.max(0, Math.min(n, k));
    const prev = this.viewPly == null ? n : this.viewPly;
    if (k === n && !this.replay) {
      if (this.viewPly == null) return;
      this.viewPly = null;
    } else {
      this.viewPly = k;
    }
    this.clearSel();
    if (this.overlayEl && !this.overlayEl.classList.contains('final')) this.closeOverlay();
    const step = animate && k === prev + 1 && k > 0 ? this.hist[k - 1].events : null;
    this.view.flush();
    this.view.sync(this.shownState(), step);
    this.legal = this.canAct() ? E.legalMoves(this.state) : [];
    this.refreshPanels();
    if (this.viewPly == null) this.prompts(false);
  }

  navigate(cmd) {
    const n = this.hist.length;
    const cur = this.viewPly == null ? n : this.viewPly;
    if (cmd === 'prev') this.showPly(cur - 1);
    else if (cmd === 'next') this.showPly(cur + 1, true);
    else if (cmd === 'first') this.showPly(0);
    else if (cmd === 'last') this.showPly(n);
  }

  bindKeys() {
    document.addEventListener('keydown', (e) => {
      const tag = (e.target && e.target.tagName) || '';
      if (tag === 'INPUT' || tag === 'TEXTAREA' || e.altKey || e.ctrlKey || e.metaKey) return;
      const cmd = { ArrowLeft: 'prev', ArrowRight: 'next', Home: 'first', End: 'last', Escape: 'last' }[e.key];
      if (!cmd || document.querySelector('dialog[open]')) return;
      e.preventDefault();
      if (this.autoTimer && cmd !== 'next') this.stopAuto();
      this.navigate(cmd);
    });
    $('nav-bar').querySelectorAll('[data-nav]').forEach((b) => {
      b.onclick = () => { if (this.autoTimer) this.stopAuto(); this.navigate(b.dataset.nav); };
    });
    $('btn-auto').onclick = () => (this.autoTimer ? this.stopAuto() : this.startAuto());
    $('moves-list').addEventListener('click', (e) => {
      const el = e.target.closest('[data-ply]');
      if (el) { if (this.autoTimer) this.stopAuto(); this.showPly(+el.dataset.ply); }
    });
  }

  startAuto() {
    if (this.viewPly == null || this.viewPly >= this.hist.length) this.showPly(0);
    let wait = 0;
    this.autoTimer = setInterval(() => {
      if ((wait -= 250) > 0) return;
      const cur = this.viewPly == null ? this.hist.length : this.viewPly;
      if (cur >= this.hist.length) { this.stopAuto(); return; }
      this.showPly(cur + 1, true);
      wait = Math.max(1500, this.view.busyMs() + 400);
    }, 250);
    this.renderNav();
  }

  stopAuto() {
    clearInterval(this.autoTimer);
    this.autoTimer = null;
    this.renderNav();
  }

  renderNav() {
    const n = this.hist.length;
    const k = this.viewPly == null ? n : this.viewPly;
    $('nav-pos').textContent = `${k} / ${n}`;
    $('btn-auto').hidden = !this.replay;
    $('btn-auto').textContent = this.autoTimer ? '❚❚ Pauza' : '▶ Přehrát';
    $('nav-bar').querySelector('[data-nav="prev"]').disabled = k === 0;
    $('nav-bar').querySelector('[data-nav="first"]').disabled = k === 0;
    $('nav-bar').querySelector('[data-nav="next"]').disabled = k === n;
    $('nav-bar').querySelector('[data-nav="last"]').disabled = k === n;
  }

  // ---------- vykreslení ----------
  refresh(events = null) {
    if (events && this.viewPly != null && !this.replay) this.viewPly = null; // nový tah → zpět na živou pozici
    this.legal = this.canAct() ? E.legalMoves(this.state) : [];
    if (this.sel >= 0) this.recomputeSel();
    this.view.sync(this.shownState(), this.viewPly == null ? events : null);
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

  // Cíle předtahu: tahy, které figurka může udělat teď, a navíc všechna pole, kam by mohla dojít
  // nebo brát, až soupeř táhne (přes figurky, které se mohou pohnout, i na pole vlastních figurek,
  // které může soupeř sebrat – typicky braní zpět). Povolenost se ověří až při zahrání.
  premoveTargets(sq) {
    const p = this.state.board[sq];
    const out = this.ghostMoves(sq);
    const have = new Set(out.map((m) => m.to));
    const f0 = E.fileOf(sq), r0 = E.rankOf(sq);
    const add = (f, r) => {
      if (f < 0 || f > 7 || r < 0 || r > 7) return;
      const to = r * 8 + f;
      if (to === sq || have.has(to)) return;
      have.add(to);
      const last = p.t === 'P' && r === (p.c === 'w' ? 7 : 0);
      out.push({ from: sq, to, kind: null, promo: last ? 'Q' : undefined, pre: true });
    };
    const ray = (dirs) => { for (const [df, dr] of dirs) for (let k = 1; k < 8; k++) add(f0 + df * k, r0 + dr * k); };
    const O = [[1, 0], [-1, 0], [0, 1], [0, -1]], D = [[1, 1], [1, -1], [-1, 1], [-1, -1]];
    if (p.t === 'P') {
      const d = p.c === 'w' ? 1 : -1;
      add(f0, r0 + d); add(f0, r0 + 2 * d); add(f0 - 1, r0 + d); add(f0 + 1, r0 + d);
    } else if (p.t === 'N' || p.t === 'C') {
      for (const [df, dr] of [[1, 2], [2, 1], [-1, 2], [-2, 1], [1, -2], [2, -1], [-1, -2], [-2, -1]]) add(f0 + df, r0 + dr);
    } else if (p.t === 'B') ray(D);
    else if (p.t === 'Q') ray([...O, ...D]);
    else if (p.t === 'K') for (const [df, dr] of [...O, ...D]) add(f0 + df, r0 + dr);
    else if (p.t === 'R') {
      const rad = E.rookHeat(p);
      for (let df = -rad; df <= rad; df++) for (let dr = -rad; dr <= rad; dr++) add(f0 + df, r0 + dr);
    }
    return out;
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
      this.selMoves = this.selMode === 'pre' ? this.premoveTargets(this.sel) : this.ghostMoves(this.sel);
    }
  }

  setPremove(from, to) {
    const ms = this.selMoves.filter((m) => m.from === from && m.to === to);
    if (!ms.length) return;
    const m = ms.find((x) => x.promo === 'Q') || ms[0];
    this.premove = { from, to, a: E.sqName(from) + E.sqName(to) + (m.promo ? m.promo.toLowerCase() : '') };
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

  // přesný tah předtahu, nebo jeho varianta s volbou Hranice (rozpálí se ta s nižším Žárem)
  premoveAction(a) {
    const la = E.legalActions(this.state);
    if (la.includes(a)) return a;
    return la.find((x) => x.startsWith(a + '>')) || null;
  }

  tryPremove() {
    const pm = this.premove;
    if (!pm || !this.canAct() || this.state.conclave) return;
    if (this.result()) { this.premove = null; return; }
    if (!this.premoveAction(pm.a)) {
      this.cancelPremove('Předtah už není povolený – zrušen.');
      return;
    }
    const ply = this.state.ply;
    setTimeout(() => {
      if (this.premove !== pm) return;
      this.premove = null;
      const a = this.state.ply === ply && this.canAct() ? this.premoveAction(pm.a) : null;
      if (a) this.act(a);
      else this.refreshPanels();
    }, 280);
  }

  refreshPanels() {
    music.setMood(this.state.crusade.w || this.state.crusade.b ? 'crusade' : 'normal');
    this.renderNav();
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
    const st = this.shownState();
    const live = this.viewPly == null || this.viewPly === this.hist.length;
    const res = live ? this.result() : null;
    const sede = !res && !!st.conclave;
    b.classList.toggle('sede', sede);
    b.classList.toggle('viewing', this.viewPly != null && !this.replay);
    let smoke = b.querySelector('.sede-smoke');
    if (sede && !smoke) {
      smoke = document.createElement('div');
      smoke.className = 'sede-smoke';
      smoke.innerHTML = '<b class="chimney"></b><i></i><i></i><i></i>';
      b.appendChild(smoke);
    } else if (!sede && smoke) smoke.remove();
    const loser = res && res.winner ? other(res.winner) : null;
    b.classList.toggle('damned', !!loser);
    b.classList.toggle('lose-w', loser === 'w');
    b.classList.toggle('lose-b', loser === 'b');
  }

  renderMarks() {
    const st = this.shownState();
    const last = new Set();
    const upto = this.viewPly == null ? this.hist.length : this.viewPly;
    for (let i = upto - 1; i >= 0; i--) {
      const a = this.hist[i].a;
      if (a[0] === '@') continue;
      last.add(E.sqIndex(a.slice(0, 2)));
      last.add(E.sqIndex(a.slice(2, 4)));
      break;
    }
    const map = { last, sel: new Set(this.sel >= 0 ? [this.sel] : []) };
    if (this.premove) map.pre = new Set([this.premove.from, this.premove.to]);
    if (this.reach) {
      const c = this.mode === 'online' && this.me ? this.me : st.turn;
      map.reach = new Set(E.rookReachSquares(st, c));
      map.reach2 = new Set(E.rookReachSquares(st, other(c)));
    }
    // Papež v Zajetí Křižáka (řetěz) a Papež v dosahu soupeřových Hranic (hrozí mu poprava)
    if (!st.result) {
      map.captive = new Set();
      map.captor = new Set();
      for (const c of ['w', 'b']) {
        for (const x of E.captives(st, c)) { map.captive.add(x.sq); x.by.forEach((j) => map.captor.add(j)); }
      }
      map.danger = new Set();
      for (const c of ['w', 'b']) {
        const ps = E.popeSquare(st, c);
        if (ps >= 0 && E.inRookReach(st, other(c), ps)) map.danger.add(ps);
      }
    }
    if (this.state.conclave && this.canAct()) map.choice = new Set(this.state.conclave.options);
    this.view.mark(map);
    for (const el of this.view.els.values()) el.classList.toggle('chained', !!(map.captive && map.captive.has(el._sq) && (el._t === 'K' || el._t === 'B')));
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
    for (const h of this.hist.slice(0, this.viewPly == null ? this.hist.length : this.viewPly)) {
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
    const st = this.shownState();
    const res = st.result || (this.viewPly == null ? this.result() : null);
    const put = (el, c) => {
      const turn = !res && st.turn === c;
      el.className = 'player' + (turn ? ' turn' : '');
      const conclave = st.conclave && st.conclave.color === c;
      const mark = turn ? `<span class="turnmark">${conclave ? 'KONKLÁVE' : 'NA TAHU'}</span>` : '';
      const pres = this.presence(c);
      const caps = this.captured(c).map((p) => mini(p.t, p.c)).join('');
      const lvs = st.board.filter((p) => p && p.c === c && p.t === 'R').map((p) => E.rookHeat(p));
      const lv = Math.max(1, ...lvs);
      const heat = `<span class="heatbadge lv${lv}" title="Žár Hranic (každá Hranice zvlášť): ${lvs.join(' a ')}">${ICON.heat}Žár ${lvs.join('·')}</span>`;
      const cru = st.crusade[c] ? `<span class="crubadge" title="Křížová výprava vyhlášena">${ICON.cross}</span>` : '';
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
    if (cap) s += { penance: ICON.blood, burn: ICON.fire, execute: ICON.fire, crusade: ICON.sword, inquisition: ICON.seal, ambush: ICON.sword, ep: '' }[cap.kind] || '';
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
    this.hist.forEach((h, i) => {
      const last = entries[entries.length - 1];
      if (last && last.color === h.color) { last.html.push(this.moveHTML(h)); last.ply = i + 1; } else entries.push({ color: h.color, html: [this.moveHTML(h)], ply: i + 1 });
    });
    const shownPly = this.viewPly == null ? this.hist.length : this.viewPly;
    const rows = [];
    for (const e of entries) {
      const cur = rows[rows.length - 1];
      if (e.color === 'b' && cur && !cur.b) cur.b = e;
      else rows.push(e.color === 'w' ? { w: e } : { w: null, b: e });
    }
    const lastEntry = entries[entries.length - 1];
    const cell = (e) => (e ? `<span class="mv${e.ply === shownPly ? ' last' : ''}" data-ply="${e.ply}">${e.html.join(', ')}</span>` : '<span class="mv">…</span>');
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
        inquisition: `${A} zajal ${V} na ${at} a zahajuje Inkvizici – musí k Hranici, než bude smět znovu brát.`,
        ambush: `${A} přepadl Inkvizitora na ${at} během Inkvizice – bez pokání, zajatec je předčasně popraven.`,
        ep: `${A} svedl soupeřova Poutníka na ${at} ze správné cesty – Svedení, bez pokání.`,
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
      if (e.type === 'inqDone') {
        out.push(e.raised
          ? `Inkvizice dokončena – zajatec je upálen u ${SIDE_GEN[e.color]} Hranice na ${E.sqName(e.rook)}, její Žár stoupá na ${e.level}. úroveň.`
          : `Inkvizice dokončena u Hranice na ${E.sqName(e.rook)} – její Žár už je na maximu.`);
      }
      if (e.type === 'inqFoiled') out.push(`Inkvizitor padl uprostřed Inkvizice – zajatec je předčasně popraven, Žár se nezvýší.`);
      if (e.type === 'captive') out.push(`<b>Zajetí!</b> ${PLAYER[e.color]} ${NAME[e.t]} na ${E.sqName(e.sq)} je v Zajetí ${e.by.length > 1 ? 'Křižáků' : 'Křižáka'} – nesmí se pohnout ani zpovídat${e.t === 'B' ? ' a nemůže do Konkláve' : ''}.`);
      if (e.type === 'freed') out.push(`${PLAYER[e.color]} ${NAME[e.t] || 'hodnostář'} na ${E.sqName(e.sq)} je opět volný.`);
      if (e.type === 'monitum') out.push(`<b>Ignis!</b> ${PLAYER[e.color]} Papež na ${E.sqName(e.sq)} stojí v dosahu soupeřovy Hranice – hrozí mu poprava.`);
    }
    return out;
  }

  resultText(r) {
    if (r.reason === 'draw') return 'Remíza dohodou.';
    const L = PLAYER[other(r.winner)], W = PLAYER[r.winner];
    return {
      anathema: `Exstirpatio! ${L} Papež padl a není žádný způsobilý Kardinál (bezúhonný a mimo Zajetí), kterého by šlo dosadit na papežský stolec. Vítězí ${W}.`,
      interdict: `Abjuratio! ${L} nemá žádný tah aktivní figurkou (Hranice se nepočítají) a prohrává abjurací. Vítězí ${W}.`,
      resign: `${L} se vzdal. Vítězí ${W}.`,
    }[r.reason] || `Vítězí ${W}.`;
  }

  renderStory() {
    const upto = this.viewPly == null ? this.hist.length : this.viewPly;
    const last = this.hist[upto - 1];
    const lines = last ? this.narrate(last.events) : ['Hra začíná. Ať je vaše svědomí čisté.'];
    const res = upto === this.hist.length ? this.result() : null;
    let status;
    if (this.viewPly != null && upto < this.hist.length) {
      status = `<b>${this.replay ? 'Záznam partie' : 'Prohlížíš starší pozici'}</b> – půltah ${upto} z ${this.hist.length}. ← → listuje, `
        + (this.replay ? 'Home/End skočí na začátek či konec.' : 'Esc vrátí živou partii.');
    } else if (res) status = `<b>${this.resultText(res)}</b>`;
    else if (this.state.conclave) {
      const c = this.state.conclave.color;
      status = `<b>Konkláve!</b> ${PLAYER[c]}${c === this.me ? ' (ty)' : ''} volí nového Papeže z bezúhonných Kardinálů mimo Zajetí.`;
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
    const fresh = this.storyLen !== upto;
    this.storyLen = upto;
    const cls = fresh ? 'ev new' : 'ev';
    $('story').innerHTML = lines.map((l) => `<div class="${cls}">${l}</div>`).join('')
      + `<div class="ev">${status}</div>` + (hint ? `<div class="tip">${hint}</div>` : '') + extra;
  }

  pieceTip(p) {
    let s = INFO[p.t] + (p.pen ? ' <b>' + PEN_INFO[p.t] + '</b>' : '');
    const sq = this.state.board.indexOf(p);
    if ((p.t === 'K' || p.t === 'B') && sq >= 0 && E.isCaptiveAt(this.state, sq)) {
      s += ` <b>Je v Zajetí Křižáka – nesmí se pohnout ani zpovídat${p.t === 'B' ? ' a nemůže do Konkláve' : ''}, dokud Křižák neodskočí nebo nepadne.</b>`;
    }
    if (p.t === 'R') {
      const lv = E.rookHeat(p);
      s += ` <b>Žár ${lv}. úrovně – dosah i skok ${lv} pole${lv < E.MAX_HEAT ? '' : ' (maximum)'}.</b>`;
    }
    return s;
  }

  renderControls() {
    const res = this.result();
    const online = this.mode === 'online';
    const seated = (!online || !!this.me) && !this.replay;
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
    const delay = animated ? Math.max(1500, this.view.busyMs() + 200) : 0;
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
        this.openOverlay(`<div class="box"><h2>Papež padl!</h2><p>Konkláve: vyber jednoho ze svých ${n} bezúhonných Kardinálů – stane se novým Papežem.</p>`
          + '<div class="row"><button class="btn primary" data-close>Vybrat na šachovnici</button></div></div>', (ov) => {
          ov.querySelector('[data-close]').onclick = () => this.closeOverlay();
        });
      }, animated ? Math.max(1800, this.view.busyMs() + 150) : 0);
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

  // dokončení Inkvizice vedle dvou Hranic: hráč vybere, kterou rozpálí
  askHeat(ms) {
    const opts = ms.map((m) => {
      const r = this.state.board[m.heatRook];
      const lv = E.rookHeat(r);
      return `<button type="button" data-h="${m.heatRook}">${mini('R', r.c)}<small>Hranice ${E.sqName(m.heatRook)}<br>Žár ${lv} → ${lv + 1}</small></button>`;
    }).join('');
    this.view.mark({ choice: new Set(ms.map((m) => m.heatRook)) });
    this.openOverlay(`<div class="box"><h2>Dokončení Inkvizice</h2><p>Inkvizitor stojí u dvou Hranic. Kterou rozpálíš?</p>`
      + `<div class="promo-opts">${opts}</div><div class="row" style="margin-top:12px"><button class="btn small ghost" data-x>Zpět</button></div></div>`, (ov) => {
      ov.querySelectorAll('[data-h]').forEach((b) => {
        b.onclick = () => {
          this.closeOverlay();
          const m = ms.find((x) => x.heatRook === +b.dataset.h);
          if (m) this.act(E.moveToString(m));
        };
      });
      ov.querySelector('[data-x]').onclick = () => { this.closeOverlay(); this.renderMarks(); };
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
    const title = { anathema: 'Exstirpatio', interdict: 'Abjuratio', resign: 'Kapitulace', draw: 'Remíza' }[r.reason] || 'Konec hry';
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
    if (this.viewPly != null) {
      if (!this.replay) toast('Prohlížíš starší pozici – Esc nebo → tě vrátí do hry.');
      return;
    }
    if (this.state.conclave && this.canAct()) {
      if (this.state.conclave.options.includes(sq)) this.act('@' + E.sqName(sq));
      else toast('Vyber jednoho ze zvýrazněných bezúhonných Kardinálů (mimo Zajetí).');
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
    if (ms.length > 1 && ms[0].heatRook != null) { this.askHeat(ms); return; }
    this.act(E.moveToString(ms[0]));
  }

  // ---------- hra proti stroji ----------
  startAI() {
    const saved = store.get(KEY + 'ai');
    if (saved && Array.isArray(saved.a) && saved.color === this.ai.color && saved.level === this.ai.level) {
      this.gameId = saved.id || null;
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
      this.worker = new Worker(new URL('./ai-worker.js?v=29', import.meta.url), { type: 'module' });
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
    return import('./ai.js?v=29').then(async (A) => {
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
    // stroj počká, až doběhnou ohlášení (Ignis, Konkláve, Deus vult…)
    const delay = events ? Math.max(800, this.view.busyMs() + 250) : 500;
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
      this.gameId = saved.id || null;
      this.actions = saved.a.filter((x) => typeof x === 'string' && ACTION_RE.test(x));
      this.ext = saved.ext || null;
      this.rebuild();
    }
    if (this.autoFlip) this.view.setOrient(this.state.turn);
    this.refresh();
  }

  // ---------- záznam partie z historie ----------
  startReplay() {
    const r = this.replay;
    this.actions = r.a.filter((x) => typeof x === 'string' && ACTION_RE.test(x));
    this.ext = r.ext || null;
    this.rebuild();
    this.me = r.me || null;
    this.view.setOrient(r.me === 'b' ? 'b' : 'w');
    this.viewPly = 0;
    $('mode-replay').hidden = false;
    $('mode-replay').innerHTML = `<b>Záznam partie</b> · ${escapeHTML(r.desc)} · ${fmtDate(r.t)}`;
    this.view.sync(this.shownState());
    this.refreshPanels();
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
    const quick = ['Dobrý tah!', 'Kaj se!', 'Ignis!', 'Deus vult!', 'ViniKAJÍCNĚ!'];
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
  document.addEventListener('touchend', wake, { passive: true });
  // hudba: nahrávky se stahují hned a zvuk se zkusí spustit už při načtení stránky (prohlížeč ho
  // případně pustí až po prvním kliknutí či klávese – do té doby je hudba připravená a čeká)
  music.prefetch();
  if (music.isOn()) { unlock(); music.autostart(); }
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
    const g = new Game({ mode: 'local', ai: { color: other(human), level: [1, 2, 3, 4].includes(lv) ? lv : 2 } });
    window.__game = g;
    g.startAI();
  } else if (params.has('zaznam')) {
    const rec = (store.get(KEY + 'archive') || []).find((x) => x.id === params.get('zaznam'));
    if (!rec) { location.hash = ''; return; }
    $('game').hidden = false;
    const g = new Game({ mode: 'local', replay: rec });
    window.__game = g;
    g.startReplay();
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
