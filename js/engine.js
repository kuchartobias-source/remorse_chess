// Schizma – herní pravidla (čistý modul bez DOM)
//
// Výklad nejasných míst pravidel (viz také RULES-NOTES.md):
//  - Pořadí na konci tahu: tah → pokání → proměna ruší pokání → Žár (inkvizice / ztráta Inkvizitora)
//    → zpověď všech kajících figurek hráče na tahu → pád Papeže (konkláve / Anathema)
//    → Křížová výprava (strana bez Kardinálů) → Monitum → kontrola, zda má soupeř legální tah (Interdikt).
//  - Dosah Hranice = čtverec o poloměru úrovně Žáru (1–3) kolem Hranice; překážky ho neblokují.
//  - Hranice se přemisťuje skokem na libovolné volné pole ve svém poloměru, nikdy nebere a nelze ji odstranit.
//  - Kající se figurka nesmí odstranit žádnou soupeřovu figurku (ani upálením, ani mimochodem).
//  - Papež bere jen upálením (cíl v dosahu jeho Hranice) a padne jen upálením (je v dosahu soupeřovy
//    Hranice) – i Křižákem; Poutník ho odstranit nesmí. Papež nikdy nepropadá pokání.
//  - Zajetí Papeže: stojí-li soupeřův Křižák na poli, odkud Papeže ohrožuje skokem jezdce, je Papež
//    v zajetí – nesmí táhnout a nemůže zpovídat (posuzuje se v pozici na konci tahu).
//  - Křižák v dosahu Hranice upaluje, mimo něj bere s odpustkem – v obou případech bez pokání.
//  - Křížová výprava se vyhlásí, jakmile strana nemá žádného Kardinála (i když se poslední stal Papežem)
//    nebo žádného Inkvizitora;
//    je to trvalý příznak strany – proměna v jezdce pak dává vždy Křižáka.
//  - Kající se Kardinál zpovídat smí, ale nesmí být zvolen Papežem.

export const FILES = 'abcdefgh';
export const NAMES = {
  K: 'Papež', Q: 'Inkvizitor', R: 'Hranice', B: 'Kardinál', N: 'Misionář', C: 'Křižák', P: 'Poutník',
};
export const other = (c) => (c === 'w' ? 'b' : 'w');
export const fileOf = (i) => i & 7;
export const rankOf = (i) => i >> 3;
export const sqName = (i) => FILES[i & 7] + ((i >> 3) + 1);
export function sqIndex(s) {
  const f = FILES.indexOf(s[0]);
  const r = parseInt(s[1], 10) - 1;
  if (f < 0 || !(r >= 0 && r < 8) || s.length !== 2) throw new Error('Neplatné pole ' + s);
  return r * 8 + f;
}

const KNIGHT = [[1, 2], [2, 1], [-1, 2], [-2, 1], [1, -2], [2, -1], [-1, -2], [-2, -1]];
const KING = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];
const ORTHO = [[1, 0], [-1, 0], [0, 1], [0, -1]];
const DIAG = [[1, 1], [1, -1], [-1, 1], [-1, -1]];

// Kdo může zpovídat koho. Kardinál zpovídá jen „kardinálně“ (vodorovně/svisle), Papež i diagonálně.
export const CONFESSORS = { P: ['B', 'K'], N: ['B', 'K'], Q: ['B', 'K'], B: ['K'] };
export const PROMOS = ['Q', 'B', 'N'];

function at(f, r) { return f >= 0 && f < 8 && r >= 0 && r < 8 ? r * 8 + f : -1; }
const cheb = (a, b) => Math.max(Math.abs(fileOf(a) - fileOf(b)), Math.abs(rankOf(a) - rankOf(b)));

// Úroveň Žáru podle počtu inkvizic: 0 → 1, 1–2 → 2, 3 → 3 (maximum)
export const heatLevel = (inq) => (inq >= 3 ? 3 : inq >= 1 ? 2 : 1);
export const heatOf = (state, color) => heatLevel(state.inq[color]);

export function initialState() {
  const board = Array(64).fill(null);
  const back = 'RNBQKBNR';
  let id = 0;
  const mk = (t, c) => ({ id: ++id, t, c, pen: false });
  for (let f = 0; f < 8; f++) {
    board[f] = mk(back[f], 'w');
    board[8 + f] = mk('P', 'w');
  }
  for (let f = 0; f < 8; f++) {
    board[48 + f] = mk('P', 'b');
    board[56 + f] = mk(back[f], 'b');
  }
  return {
    board, turn: 'w', ep: -1, conclave: null, result: null, ply: 0, history: [],
    inq: { w: 0, b: 0 }, crusade: { w: false, b: false },
  };
}

export function cloneState(s) {
  return {
    board: s.board.map((p) => (p ? { ...p } : null)),
    turn: s.turn, ep: s.ep,
    conclave: s.conclave ? { ...s.conclave, options: [...s.conclave.options] } : null,
    result: s.result ? { ...s.result } : null,
    ply: s.ply, history: [...s.history],
    inq: { ...s.inq }, crusade: { ...s.crusade },
  };
}

// Pole Hranic barvy `color`, v jejichž dosahu leží `target`
export function rookSources(state, color, target) {
  const rad = heatOf(state, color);
  const out = [];
  state.board.forEach((p, i) => {
    if (p && p.c === color && p.t === 'R' && cheb(i, target) <= rad) out.push(i);
  });
  return out;
}

export function inRookReach(state, color, target) {
  const rad = heatOf(state, color);
  const { board } = state;
  for (let i = 0; i < 64; i++) {
    const p = board[i];
    if (p && p.c === color && p.t === 'R' && cheb(i, target) <= rad) return true;
  }
  return false;
}

export function rookReachSquares(state, color) {
  const out = [];
  for (let i = 0; i < 64; i++) if (inRookReach(state, color, i)) out.push(i);
  return out;
}

// Smí figurka `p` odstranit figurku `victim` na poli `to`? Vrací druh braní, nebo null.
//  kind: 'penance' (bere a propadá pokání), 'burn' (upálení na hranici – bez pokání),
//        'crusade' (Křižák mimo dosah Hranice), 'execute' (Papež upaluje), 'ep' (tajný hřích)
export function captureKind(state, p, victim, to) {
  if (victim.t === 'R' || p.t === 'R' || p.pen) return null;
  const reach = inRookReach(state, p.c, to);
  if (p.t === 'P') return victim.t === 'K' ? null : 'penance';
  if (p.t === 'K') return reach ? 'execute' : null;
  if (victim.t === 'K') return reach ? 'burn' : null;
  if (reach) return 'burn';
  return p.t === 'C' ? 'crusade' : 'penance';
}

function pushRay(board, from, dirs, slide, out) {
  const f0 = fileOf(from), r0 = rankOf(from);
  for (const [df, dr] of dirs) {
    let f = f0 + df, r = r0 + dr;
    while (f >= 0 && f < 8 && r >= 0 && r < 8) {
      const j = r * 8 + f;
      out.push(j);
      if (board[j] || !slide) break;
      f += df; r += dr;
    }
  }
}

// Geometricky dosažitelná pole (bez ohledu na pravidla braní)
function targets(state, from) {
  const { board } = state;
  const p = board[from];
  const out = [];
  switch (p.t) {
    case 'N':
    case 'C': pushRay(board, from, KNIGHT, false, out); break;
    case 'B': pushRay(board, from, DIAG, true, out); break;
    case 'Q': pushRay(board, from, [...ORTHO, ...DIAG], true, out); break;
    case 'K': pushRay(board, from, KING, false, out); break;
    case 'R': {
      // skok na volné pole v poloměru Žáru
      const rad = heatOf(state, p.c);
      const f0 = fileOf(from), r0 = rankOf(from);
      for (let r = r0 - rad; r <= r0 + rad; r++) {
        for (let f = f0 - rad; f <= f0 + rad; f++) {
          const j = at(f, r);
          if (j >= 0 && j !== from && !board[j]) out.push(j);
        }
      }
      break;
    }
    default: break;
  }
  return out;
}

// Všechny legální tahy hráče na tahu (bez šachu, takže pseudo-legální = legální)
export function legalMoves(state) {
  if (state.result || state.conclave) return [];
  const { board, turn } = state;
  const moves = [];
  for (let from = 0; from < 64; from++) {
    const p = board[from];
    if (!p || p.c !== turn) continue;
    if (p.t === 'K' && isCaptive(state, turn)) continue; // Papež v zajetí se nepohne
    if (p.t === 'P') {
      const dir = p.c === 'w' ? 1 : -1;
      const f = fileOf(from), r = rankOf(from);
      const lastRank = p.c === 'w' ? 7 : 0;
      const add = (to, kind, extra = {}) => {
        if (rankOf(to) === lastRank) {
          for (const promo of PROMOS) moves.push({ from, to, kind, promo, ...extra });
        } else moves.push({ from, to, kind, ...extra });
      };
      const one = at(f, r + dir);
      if (one >= 0 && !board[one]) {
        add(one, null);
        // Poutník smí kdykoliv postoupit o 2 pole, jsou-li obě pole volná
        const two = at(f, r + 2 * dir);
        if (two >= 0 && !board[two]) add(two, null, { double: true });
      }
      for (const df of [-1, 1]) {
        const to = at(f + df, r + dir);
        if (to < 0) continue;
        const v = board[to];
        if (v && v.c !== p.c) {
          const kind = captureKind(state, p, v, to);
          if (kind) add(to, kind);
        } else if (!v && to === state.ep && !p.pen) {
          add(to, 'ep', { epVictim: at(f + df, r) });
        }
      }
      continue;
    }
    for (const to of targets(state, from)) {
      const v = board[to];
      if (v && v.c === p.c) continue;
      if (v) {
        const kind = captureKind(state, p, v, to);
        if (kind) moves.push({ from, to, kind });
      } else moves.push({ from, to, kind: null });
    }
  }
  return moves;
}

export function moveToString(m) {
  return sqName(m.from) + sqName(m.to) + (m.promo ? m.promo.toLowerCase() : '');
}

export function cleanCardinals(state, color) {
  const out = [];
  state.board.forEach((p, i) => { if (p && p.c === color && p.t === 'B' && !p.pen) out.push(i); });
  return out;
}

// Pole soupeřových Křižáků, kteří drží Papeže barvy `color` v zajetí (prázdné = volný)
export function captors(state, color) {
  const ps = popeSquare(state, color);
  if (ps < 0) return [];
  const out = [];
  for (const [df, dr] of KNIGHT) {
    const j = at(fileOf(ps) + df, rankOf(ps) + dr);
    const q = j >= 0 ? state.board[j] : null;
    if (q && q.t === 'C' && q.c !== color) out.push(j);
  }
  return out;
}
export const isCaptive = (state, color) => captors(state, color).length > 0;

// Smí zpovídat figurka q figurku na poli i (q stojí na poli j)?
function confessorFits(p, q, i, j, captive) {
  if (!(CONFESSORS[p.t] || []).includes(q.t)) return false;
  if (q.t === 'K') return !captive && cheb(i, j) === 1;
  return Math.abs(fileOf(i) - fileOf(j)) + Math.abs(rankOf(i) - rankOf(j)) === 1;
}

function confess(state, color, events) {
  const { board } = state;
  const captive = isCaptive(state, color);
  for (let i = 0; i < 64; i++) {
    const p = board[i];
    if (!p || p.c !== color || !p.pen) continue;
    for (const [df, dr] of KING) {
      const j = at(fileOf(i) + df, rankOf(i) + dr);
      if (j < 0) continue;
      const q = board[j];
      if (q && q.c === color && confessorFits(p, q, i, j, captive)) {
        p.pen = false;
        events.push({ type: 'absolve', sq: i, by: j, id: p.id, t: p.t, byT: q.t });
        break;
      }
    }
  }
}

function crownPope(state, sq, events) {
  const b = state.board[sq];
  b.t = 'K'; b.pen = false;
  events.push({ type: 'conclave', sq, color: b.c, id: b.id });
}

// Strana bez Kardinálů nebo bez Inkvizitora vyhlásí Křížovou výpravu: Misionáři se natrvalo stávají Křižáky (bez pokání)
function takeTheCross(state, events) {
  for (const c of ['w', 'b']) {
    if (state.crusade[c]) continue;
    let cardinals = 0, inquisitors = 0;
    const missionaries = [];
    for (let i = 0; i < 64; i++) {
      const p = state.board[i];
      if (!p || p.c !== c) continue;
      if (p.t === 'B') cardinals++;
      else if (p.t === 'Q') inquisitors++;
      else if (p.t === 'N') missionaries.push(i);
    }
    if (cardinals > 0 && inquisitors > 0) continue;
    state.crusade[c] = true;
    const ids = [];
    for (const i of missionaries) {
      const p = state.board[i];
      p.t = 'C';
      p.pen = false;
      ids.push(p.id);
    }
    events.push({ type: 'crusade', color: c, sqs: missionaries, ids, cause: cardinals === 0 ? 'cardinal' : 'inquisitor' });
  }
}

export function popeSquare(state, color) {
  return state.board.findIndex((p) => p && p.c === color && p.t === 'K');
}

function finishTurn(state, events) {
  if (!state.result) takeTheCross(state, events);
  // Na začátku tahu nemá hráč legální tah → Interdikt, prohrává
  if (!state.result && !state.conclave && legalMoves(state).length === 0) {
    state.result = { winner: other(state.turn), reason: 'interdict' };
    events.push({ type: 'gameover', result: state.result });
  }
}

// Použije tah (objekt z legalMoves) a vrátí události pro animace
function applyMove(state, m) {
  const events = [];
  const { board } = state;
  const p = board[m.from];
  const mover = p.c;
  const foe = other(mover);
  const victimSq = m.kind === 'ep' ? m.epVictim : (board[m.to] ? m.to : -1);
  const victim = victimSq >= 0 ? board[victimSq] : null;
  const popeWasInReach = (() => {
    const ps = popeSquare(state, foe);
    return ps >= 0 && inRookReach(state, mover, ps);
  })();
  const capBefore = captivity(state);

  events.push({ type: 'move', from: m.from, to: m.to, id: p.id, piece: { ...p } });
  if (victim) {
    // Hranice, v jejichž dosahu oběť stála – pro animaci ohnivé čáry
    const rooks = (m.kind === 'burn' || m.kind === 'execute') ? rookSources(state, mover, victimSq) : [];
    events.push({ type: 'capture', sq: victimSq, kind: m.kind, piece: { ...victim }, by: { ...p }, rooks });
    board[victimSq] = null;
  }
  board[m.to] = p;
  board[m.from] = null;
  if (m.kind === 'penance') {
    p.pen = true;
    events.push({ type: 'penance', sq: m.to, id: p.id });
  }
  if (m.promo) {
    p.t = m.promo === 'N' && state.crusade[mover] ? 'C' : m.promo;
    const hadPen = p.pen;
    p.pen = false;
    events.push({ type: 'promote', sq: m.to, t: p.t, id: p.id, cleansed: hadPen });
  }
  state.ep = m.double && !m.promo ? (m.from + m.to) / 2 : -1;

  // Žár Hranic: inkvizice zvyšuje, ztráta posledního Inkvizitora ruší
  if (victim && p.t === 'Q' && !m.promo) {
    const before = heatOf(state, mover);
    state.inq[mover] = Math.min(3, state.inq[mover] + 1);
    const after = heatOf(state, mover);
    events.push({ type: 'inquisition', color: mover, inq: state.inq[mover] });
    if (after > before) events.push({ type: 'heat', color: mover, level: after, rooks: rookSquares(state, mover) });
  }
  if (victim && victim.t === 'Q' && state.inq[foe] > 0 && !board.some((x) => x && x.c === foe && x.t === 'Q')) {
    state.inq[foe] = 0;
    events.push({ type: 'heatLost', color: foe, rooks: rookSquares(state, foe) });
  }

  confess(state, mover, events);

  state.turn = foe;
  state.ply += 1;

  if (victim && victim.t === 'K') {
    events.push({ type: 'popeFall', color: foe, sq: victimSq });
    const options = cleanCardinals(state, foe);
    if (options.length === 0) {
      state.result = { winner: mover, reason: 'anathema' };
      events.push({ type: 'gameover', result: state.result });
    } else if (options.length === 1) {
      crownPope(state, options[0], events);
    } else {
      state.conclave = { color: foe, options };
    }
  }
  finishTurn(state, events);
  captivityEvents(state, capBefore, events);
  // Monitum: soupeřův Papež se nově ocitl v dosahu mých Hranic
  if (!state.result && !state.conclave) {
    const ps = popeSquare(state, foe);
    if (ps >= 0 && !popeWasInReach && inRookReach(state, mover, ps)) {
      events.push({ type: 'monitum', color: foe, sq: ps, by: mover });
    }
  }
  return events;
}

// Stav zajetí obou Papežů: { barva: { id Papeže, pole Křižáků } }
function captivity(state) {
  const out = {};
  for (const c of ['w', 'b']) {
    const ps = popeSquare(state, c);
    out[c] = { id: ps >= 0 ? state.board[ps].id : null, sq: ps, by: ps >= 0 ? captors(state, c) : [] };
  }
  return out;
}

function captivityEvents(state, before, events) {
  if (state.result) return;
  const now = captivity(state);
  for (const c of ['w', 'b']) {
    const a = before[c], b = now[c];
    if (b.by.length && (!a.by.length || a.id !== b.id)) events.push({ type: 'captive', color: c, sq: b.sq, by: b.by });
    else if (!b.by.length && a.by.length && a.id === b.id && b.sq >= 0) events.push({ type: 'freed', color: c, sq: b.sq });
  }
}

function rookSquares(state, color) {
  const out = [];
  state.board.forEach((p, i) => { if (p && p.c === color && p.t === 'R') out.push(i); });
  return out;
}

// Akce: tah "e2e4" / "e7e8q", nebo volba papeže "@c8"
export function legalActions(state) {
  if (state.result) return [];
  if (state.conclave) return state.conclave.options.map((i) => '@' + sqName(i));
  return legalMoves(state).map(moveToString);
}

export function applyAction(state, action) {
  if (state.result) throw new Error('Hra skončila');
  const s = cloneState(state);
  let events;
  if (action[0] === '@') {
    if (!s.conclave) throw new Error('Není konkláve');
    const sq = sqIndex(action.slice(1));
    if (!s.conclave.options.includes(sq)) throw new Error('Neplatná volba papeže');
    events = [];
    const capBefore = captivity(s);
    s.conclave = null;
    crownPope(s, sq, events);
    finishTurn(s, events);
    captivityEvents(s, capBefore, events);
  } else {
    const m = legalMoves(s).find((x) => moveToString(x) === action);
    if (!m) throw new Error('Nelegální tah ' + action);
    events = applyMove(s, m);
  }
  s.history.push(action);
  return { state: s, events };
}

export function replay(actions) {
  let s = initialState();
  for (const a of actions) s = applyAction(s, a).state;
  return s;
}

// Hodnotí druh braní pro nápovědu v UI
export const KIND_LABEL = {
  penance: 'braní s pokáním',
  burn: 'upálení na hranici',
  crusade: 'křížová výprava',
  execute: 'poprava na hranici',
  ep: 'tajný hřích',
};
