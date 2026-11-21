// Kajícné šachy – herní pravidla (čistý modul bez DOM)
//
// Výklad nejasných míst pravidel (viz také RULES-NOTES.md):
//  - Pořadí na konci tahu: tah → pokání → proměna ruší pokání → zpověď všech
//    kajících figurek hráče na tahu → konkláve / zatracení → kontrola, zda má
//    soupeř legální tah.
//  - „Dosah Hranice“ = paprsek věže v pozici PŘED tahem; vlastní figurky výhled neblokují,
//    zastaví ho až první soupeřova figurka (ta je ještě v dosahu).
//  - Jezdci začínají jako Poutníci (N): táhnou jako jezdec, podléhají pokání, zpověď jen u Biskupa,
//    Hranici odstranit nesmí. Jakmile strana nemá žádného Biskupa, všichni její Poutníci se
//    natrvalo stanou Křižáky (C) a zbaví se pokání.
//  - Kající se Hříšník nesmí brát ani mimochodem (en passant jen neuděluje pokání).
//  - Kající se Biskup zpovídat smí, ale nesmí být zvolen papežem.
//  - Hranice (věž) nebere nikdy nic, ani soupeřovu Hranici.
//  - Papež bere živou figurku (i soupeřova papeže) jen s podporou Hranice, nikdy nepropadá pokání.

export const FILES = 'abcdefgh';
export const NAMES = {
  K: 'Papež', Q: 'Inkvizitor', R: 'Hranice', B: 'Biskup', N: 'Poutník', C: 'Křižák', P: 'Hříšník',
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

// Kdo může zpovídat koho
export const CONFESSORS = { P: ['B'], N: ['B'], Q: ['B', 'K'], B: ['K'] };

function at(f, r) { return f >= 0 && f < 8 && r >= 0 && r < 8 ? r * 8 + f : -1; }

// Mód hry: 'poutnici' (jezdci začínají jako Poutníci) nebo 'krizaci' (jezdci jsou od začátku Křižáci;
// i proměna v jezdce dá Křižáka)
export const VARIANTS = ['poutnici', 'krizaci'];

export function initialState(variant = 'poutnici') {
  const board = Array(64).fill(null);
  const back = variant === 'krizaci' ? 'RCBQKBCR' : 'RNBQKBNR';
  let id = 0;
  const mk = (t, c) => ({ id: ++id, t, c, pen: false, moved: false });
  for (let f = 0; f < 8; f++) {
    board[f] = mk(back[f], 'w');
    board[8 + f] = mk('P', 'w');
  }
  for (let f = 0; f < 8; f++) {
    board[48 + f] = mk('P', 'b');
    board[56 + f] = mk(back[f], 'b');
  }
  return { board, turn: 'w', ep: -1, conclave: null, result: null, ply: 0, history: [], variant };
}

export function cloneState(s) {
  return {
    board: s.board.map((p) => (p ? { ...p } : null)),
    turn: s.turn, ep: s.ep,
    conclave: s.conclave ? { ...s.conclave, options: [...s.conclave.options] } : null,
    result: s.result ? { ...s.result } : null,
    ply: s.ply, history: [...s.history], variant: s.variant,
  };
}

// Je pole `target` v dosahu některé Hranice barvy `color`? (pozice před tahem)
// Vlastní figurky výhled neblokují; zastaví ho první soupeřova figurka.
export function inRookReach(board, color, target) {
  return rookSources(board, color, target, true).length > 0;
}

// Pole Hranic barvy `color`, které vidí pole `target`
export function rookSources(board, color, target, firstOnly = false) {
  const out = [];
  for (let i = 0; i < 64; i++) {
    const p = board[i];
    if (!p || p.c !== color || p.t !== 'R') continue;
    for (const [df, dr] of ORTHO) {
      let f = fileOf(i) + df, r = rankOf(i) + dr;
      let hit = false;
      while (f >= 0 && f < 8 && r >= 0 && r < 8) {
        const j = r * 8 + f;
        if (j === target) { hit = true; break; }
        if (board[j] && board[j].c !== color) break;
        f += df; r += dr;
      }
      if (hit) { out.push(i); if (firstOnly) return out; break; }
    }
  }
  return out;
}

export function rookReachSquares(board, color) {
  const out = [];
  for (let i = 0; i < 64; i++) if (inRookReach(board, color, i)) out.push(i);
  return out;
}

// Smí figurka `p` odstranit figurku `victim` na poli `to`? Vrací druh braní, nebo null.
//  kind: 'penance' (bere a propadá pokání), 'burn' (upálení – bez pokání),
//        'crusade' (Křižák), 'pyre' (odstranění Hranice), 'execute' (Papež s Hranicí),
//        'ep' (tajný hřích)
export function captureKind(board, p, victim, to) {
  if (victim.t === 'R') {
    return (p.t === 'K' || p.t === 'Q' || p.t === 'B') ? 'pyre' : null;
  }
  switch (p.t) {
    case 'R': return null;
    case 'C': return 'crusade';
    case 'K': return inRookReach(board, p.c, to) ? 'execute' : null;
    case 'Q':
    case 'B':
    case 'N':
      if (p.pen) return null;
      return inRookReach(board, p.c, to) ? 'burn' : 'penance';
    case 'P':
      if (p.pen) return null;
      return 'penance';
    default: return null;
  }
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
    case 'R': pushRay(board, from, ORTHO, true, out); break;
    case 'Q': pushRay(board, from, [...ORTHO, ...DIAG], true, out); break;
    case 'K': pushRay(board, from, KING, false, out); break;
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
    if (p.t === 'P') {
      const dir = p.c === 'w' ? 1 : -1;
      const f = fileOf(from), r = rankOf(from);
      const lastRank = p.c === 'w' ? 7 : 0;
      const add = (to, kind, extra = {}) => {
        if (rankOf(to) === lastRank) {
          for (const promo of ['Q', 'R', 'B', 'N']) moves.push({ from, to, kind, promo, ...extra });
        } else moves.push({ from, to, kind, ...extra });
      };
      const one = at(f, r + dir);
      if (one >= 0 && !board[one]) {
        add(one, null);
        const startRank = p.c === 'w' ? 1 : 6;
        const two = at(f, r + 2 * dir);
        if (r === startRank && !board[two]) add(two, null, { double: true });
      }
      for (const df of [-1, 1]) {
        const to = at(f + df, r + dir);
        if (to < 0) continue;
        const v = board[to];
        if (v && v.c !== p.c) {
          const kind = captureKind(board, p, v, to);
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
        const kind = captureKind(board, p, v, to);
        if (kind) moves.push({ from, to, kind });
      } else moves.push({ from, to, kind: null });
    }
    // Azyl (rošáda) – bez podmínek týkajících se šachu
    if (p.t === 'K' && !p.moved && p.orig !== false) {
      const home = p.c === 'w' ? 0 : 56;
      if (from === home + 4) {
        for (const [rookF, kingF, rookTo] of [[7, 6, 5], [0, 2, 3]]) {
          const rk = board[home + rookF];
          if (!rk || rk.t !== 'R' || rk.c !== p.c || rk.moved) continue;
          const lo = Math.min(rookF, 4) + 1, hi = Math.max(rookF, 4);
          let free = true;
          for (let x = lo; x < hi; x++) if (board[home + x]) free = false;
          if (free) moves.push({ from, to: home + kingF, kind: null, castle: { from: home + rookF, to: home + rookTo } });
        }
      }
    }
  }
  return moves;
}

export function moveToString(m) {
  return sqName(m.from) + sqName(m.to) + (m.promo ? m.promo.toLowerCase() : '');
}

export function cleanBishops(state, color) {
  const out = [];
  state.board.forEach((p, i) => { if (p && p.c === color && p.t === 'B' && !p.pen) out.push(i); });
  return out;
}

function confess(state, color, events) {
  const { board } = state;
  for (let i = 0; i < 64; i++) {
    const p = board[i];
    if (!p || p.c !== color || !p.pen) continue;
    const allowed = CONFESSORS[p.t] || [];
    for (const [df, dr] of ORTHO) {
      const j = at(fileOf(i) + df, rankOf(i) + dr);
      if (j < 0) continue;
      const q = board[j];
      if (q && q.c === color && allowed.includes(q.t)) {
        p.pen = false;
        events.push({ type: 'absolve', sq: i, by: j, id: p.id, t: p.t, byT: q.t });
        break;
      }
    }
  }
}

function crownPope(state, sq, events) {
  const b = state.board[sq];
  b.t = 'K'; b.pen = false; b.moved = true; b.orig = false;
  events.push({ type: 'conclave', sq, color: b.c, id: b.id });
}

// Strana bez Biskupů: všichni její Poutníci natrvalo berou kříž (stávají se Křižáky, bez pokání)
function takeTheCross(state, events) {
  for (const c of ['w', 'b']) {
    let bishops = 0;
    const pilgrims = [];
    for (let i = 0; i < 64; i++) {
      const p = state.board[i];
      if (!p || p.c !== c) continue;
      if (p.t === 'B') bishops++;
      else if (p.t === 'N') pilgrims.push(i);
    }
    if (bishops > 0 || pilgrims.length === 0) continue;
    const ids = [];
    for (const i of pilgrims) {
      const p = state.board[i];
      p.t = 'C';
      p.pen = false;
      ids.push(p.id);
    }
    events.push({ type: 'crusade', color: c, sqs: pilgrims, ids });
  }
}

function finishTurn(state, events) {
  if (!state.result) takeTheCross(state, events);
  // Na začátku tahu nemá hráč legální tah → prohrává
  if (!state.result && !state.conclave && legalMoves(state).length === 0) {
    state.result = { winner: other(state.turn), reason: 'nomoves' };
    events.push({ type: 'gameover', result: state.result });
  }
}

// Použije tah (objekt z legalMoves) a vrátí události pro animace
function applyMove(state, m) {
  const events = [];
  const { board } = state;
  const p = board[m.from];
  const mover = p.c;
  let victimSq = m.kind === 'ep' ? m.epVictim : (board[m.to] ? m.to : -1);
  let victim = victimSq >= 0 ? board[victimSq] : null;

  events.push({ type: 'move', from: m.from, to: m.to, id: p.id, piece: { ...p } });
  if (victim) {
    // Hranice, které oběť „viděly“ (pozice před tahem) – pro animaci ohnivé čáry
    const rooks = (m.kind === 'burn' || m.kind === 'execute') ? rookSources(board, mover, m.to) : [];
    events.push({ type: 'capture', sq: victimSq, kind: m.kind, piece: { ...victim }, by: { ...p }, rooks });
    board[victimSq] = null;
  }
  board[m.to] = p;
  board[m.from] = null;
  p.moved = true;
  if (m.castle) {
    const rk = board[m.castle.from];
    board[m.castle.to] = rk; board[m.castle.from] = null; rk.moved = true;
    events.push({ type: 'castle', from: m.castle.from, to: m.castle.to, id: rk.id });
  }
  if (m.kind === 'penance') {
    p.pen = true;
    events.push({ type: 'penance', sq: m.to, id: p.id });
  }
  if (m.promo) {
    p.t = m.promo === 'N' && state.variant === 'krizaci' ? 'C' : m.promo;
    const hadPen = p.pen;
    p.pen = false;
    events.push({ type: 'promote', sq: m.to, t: p.t, id: p.id, cleansed: hadPen });
  }
  state.ep = m.double ? (m.from + m.to) / 2 : -1;

  confess(state, mover, events);

  state.turn = other(mover);
  state.ply += 1;

  if (victim && victim.t === 'K') {
    const loser = victim.c;
    events.push({ type: 'popeFall', color: loser, sq: victimSq });
    const options = cleanBishops(state, loser);
    if (options.length === 0) {
      state.result = { winner: mover, reason: 'damnation' };
      events.push({ type: 'gameover', result: state.result });
    } else if (options.length === 1) {
      crownPope(state, options[0], events);
    } else {
      state.conclave = { color: loser, options };
    }
  }
  finishTurn(state, events);
  return events;
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
    s.conclave = null;
    crownPope(s, sq, events);
    finishTurn(s, events);
  } else {
    const m = legalMoves(s).find((x) => moveToString(x) === action);
    if (!m) throw new Error('Nelegální tah ' + action);
    events = applyMove(s, m);
  }
  s.history.push(action);
  return { state: s, events };
}

export function replay(actions, variant = 'poutnici') {
  let s = initialState(variant);
  for (const a of actions) s = applyAction(s, a).state;
  return s;
}

// Hodnotí druh braní pro nápovědu v UI
export const KIND_LABEL = {
  penance: 'braní s pokáním',
  burn: 'upálení na hranici',
  crusade: 'křížová výprava',
  pyre: 'stržení hranice',
  execute: 'poprava na hranici',
  ep: 'tajný hřích',
};
