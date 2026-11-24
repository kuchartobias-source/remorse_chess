// Schizma – herní pravidla (čistý modul bez DOM)
//
// Výklad nejasných míst pravidel (viz také RULES-NOTES.md):
//  - Pořadí na konci tahu: tah → pokání / zahájení Inkvizice → proměna ruší pokání → zpověď kajících
//    figurek hráče na tahu → dokončení Inkvizice u Hranice (Žár) → pád Papeže (Konkláve / Anathema)
//    → Křížová výprava → zajetí → Ignis! → kontrola, zda má soupeř tah aktivní figurkou (Interdikt).
//  - Každá Hranice má vlastní Žár (1–3, trvalý). Dosah = čtverec o poloměru Žáru, překážky neblokují.
//  - Hranice se přemisťuje skokem na volné pole ve svém poloměru, nikdy nebere a nelze ji odstranit.
//  - Inkvizitor nikdy nepropadá Pokání. Pole `pen` u Inkvizitora znamená žeton Inkvizice (probíhající
//    proces): Inkvizitor s žetonem nesmí brát. Inkvizice se dokončí na konci tahu majitele, stojí-li
//    Inkvizitor vedle (8 polí) své Hranice. Sousedí-li se dvěma Hranicemi, které ještě mohou růst, hráč si
//    vybere, kterou rozpálí – volba je součástí tahu (zápis „c4c3>b2“). Přepadení Inkvizitora s žetonem
//    nezpůsobuje Pokání.
//  - Papež a bezúhonný Kardinál padnou jen Upálením (v dosahu soupeřovy Hranice); Poutník je neodstraní nikdy.
//  - Zajetí: soupeřův Křižák ve vzdálenosti skoku jezdce drží Papeže i každého Kardinála – nesmí táhnout,
//    nezpovídá a zajatý Kardinál nemůže do Konkláve (posuzuje se v pozici na konci tahu).
//  - Křížová výprava: strana bez Kardinála nebo bez Inkvizitora; trvalý příznak strany.
//  - Interdikt: hráč na tahu nemá tah žádnou figurkou kromě Hranic.

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
export const CONFESSORS = { P: ['B', 'K'], N: ['B', 'K'], B: ['K'] };
export const PROMOS = ['Q', 'B', 'N'];

function at(f, r) { return f >= 0 && f < 8 && r >= 0 && r < 8 ? r * 8 + f : -1; }
export const cheb = (a, b) => Math.max(Math.abs(fileOf(a) - fileOf(b)), Math.abs(rankOf(a) - rankOf(b)));

// Žár Hranice (1–3)
export const rookHeat = (p) => (p && p.heat) || 1;
// Inkvizitor s probíhající Inkvizicí (žeton)
export const hasToken = (p) => !!p && p.t === 'Q' && p.pen;
// Kající se figurka (Inkvizitor Pokání nepropadá)
export const isPenitent = (p) => !!p && p.pen && p.t !== 'Q';

export function initialState() {
  const board = Array(64).fill(null);
  const back = 'RNBQKBNR';
  let id = 0;
  const mk = (t, c) => (t === 'R' ? { id: ++id, t, c, pen: false, heat: 1 } : { id: ++id, t, c, pen: false });
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
    crusade: { w: false, b: false },
  };
}

export function cloneState(s) {
  return {
    board: s.board.map((p) => (p ? { ...p } : null)),
    turn: s.turn, ep: s.ep,
    conclave: s.conclave ? { ...s.conclave, options: [...s.conclave.options] } : null,
    result: s.result ? { ...s.result } : null,
    ply: s.ply, history: [...s.history],
    crusade: { ...s.crusade },
  };
}

// Pole Hranic barvy `color`, v jejichž dosahu leží `target`
export function rookSources(state, color, target) {
  const out = [];
  state.board.forEach((p, i) => {
    if (p && p.c === color && p.t === 'R' && cheb(i, target) <= rookHeat(p)) out.push(i);
  });
  return out;
}

export function inRookReach(state, color, target) {
  const { board } = state;
  for (let i = 0; i < 64; i++) {
    const p = board[i];
    if (p && p.c === color && p.t === 'R' && cheb(i, target) <= rookHeat(p)) return true;
  }
  return false;
}

export function rookReachSquares(state, color) {
  const out = [];
  for (let i = 0; i < 64; i++) if (inRookReach(state, color, i)) out.push(i);
  return out;
}

// Je figurka imunní vůči běžnému zabití (padne jen Upálením)? Papež a bezúhonný Kardinál.
const immune = (v) => v.t === 'K' || (v.t === 'B' && !v.pen);

// Smí figurka `p` odstranit figurku `victim` na poli `to`? Vrací druh braní, nebo null.
//  kind: 'penance' (bere a propadá Pokání), 'burn' (Upálení na hranici – bez Pokání),
//        'crusade' (Křižák mimo dosah Hranice), 'execute' (Papež upaluje),
//        'inquisition' (Inkvizitor mimo dosah Hranice – zahájí Inkvizici),
//        'ambush' (přepadení Inkvizitora během Inkvizice – bez Pokání), 'ep' (Svedení)
export function captureKind(state, p, victim, to) {
  if (victim.t === 'R' || p.t === 'R' || p.pen) return null;
  const reach = inRookReach(state, p.c, to);
  if (p.t === 'P') return immune(victim) ? null : (hasToken(victim) ? 'ambush' : 'penance');
  if (p.t === 'K') return reach ? 'execute' : null;
  if (immune(victim)) return reach ? 'burn' : null;
  if (reach) return 'burn';
  if (p.t === 'C') return 'crusade';
  if (p.t === 'Q') return 'inquisition';
  return hasToken(victim) ? 'ambush' : 'penance';
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
      // skok na volné pole v poloměru Žáru této Hranice
      const rad = rookHeat(p);
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

// ---------- zajetí Papeže a Kardinálů ----------
// Pole soupeřových Křižáků, kteří drží figurku na poli `sq` v zajetí (jen Papež a Kardinál)
export function captorsOf(state, sq) {
  const p = state.board[sq];
  if (!p || (p.t !== 'K' && p.t !== 'B')) return [];
  const out = [];
  for (const [df, dr] of KNIGHT) {
    const j = at(fileOf(sq) + df, rankOf(sq) + dr);
    const q = j >= 0 ? state.board[j] : null;
    if (q && q.t === 'C' && q.c !== p.c) out.push(j);
  }
  return out;
}
export const isCaptiveAt = (state, sq) => captorsOf(state, sq).length > 0;
// Zajatí hodnostáři barvy `color`: [{ sq, by: [pole Křižáků] }]
export function captives(state, color) {
  const out = [];
  state.board.forEach((p, i) => {
    if (p && p.c === color && (p.t === 'K' || p.t === 'B')) {
      const by = captorsOf(state, i);
      if (by.length) out.push({ sq: i, by });
    }
  });
  return out;
}
export const isPopeCaptive = (state, color) => {
  const ps = popeSquare(state, color);
  return ps >= 0 && isCaptiveAt(state, ps);
};

// Všechny legální tahy hráče na tahu (bez šachu, takže pseudo-legální = legální)
export function legalMoves(state) {
  if (state.result || state.conclave) return [];
  const { board, turn } = state;
  const moves = [];
  const tokenSide = board.some((x) => x && x.c === turn && hasToken(x));
  for (let from = 0; from < 64; from++) {
    const p = board[from];
    if (!p || p.c !== turn) continue;
    if ((p.t === 'K' || p.t === 'B') && isCaptiveAt(state, from)) continue; // zajatý hodnostář se nepohne
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
        } else if (!v && to === state.ep) { // Svedení smí i kající se Poutník
          add(to, 'ep', { epVictim: at(f + df, r) });
        }
      }
      continue;
    }
    for (const to of targets(state, from)) {
      const v = board[to];
      if (v && v.c === p.c) continue;
      let m = null;
      if (v) {
        const kind = captureKind(state, p, v, to);
        if (kind) m = { from, to, kind };
      } else m = { from, to, kind: null };
      if (!m) continue;
      const choices = (p.t === 'Q' || p.t === 'R') && tokenSide ? heatChoices(state, m) : [];
      if (choices.length >= 2) for (const r of choices) moves.push({ ...m, heatRook: r });
      else moves.push(m);
    }
  }
  return moves;
}

// Hranice, mezi kterými hráč volí při dokončení Inkvizice tímto tahem (≥ 2 sousední Hranice se Žárem < 3),
// jinak prázdné pole. Posuzuje se pozice po tahu.
function heatChoices(state, m) {
  const { board } = state;
  const p = board[m.from];
  const pos = (sq) => (sq === m.from ? -1 : sq === m.to ? m.from : sq); // co stojí na poli po tahu
  for (let sq = 0; sq < 64; sq++) {
    const origin = sq === m.to ? m.from : sq === m.from ? -1 : sq;
    if (origin < 0) continue;
    const q = board[origin];
    if (!q || q.c !== p.c || !hasToken(q)) continue;
    const out = [];
    for (const [df, dr] of KING) {
      const j = at(fileOf(sq) + df, rankOf(sq) + dr);
      if (j < 0) continue;
      const o = pos(j);
      const r = o >= 0 ? board[o] : null;
      if (r && r.c === p.c && r.t === 'R' && rookHeat(r) < 3) out.push(j);
    }
    if (out.length) return out.sort((a, b) => a - b);
  }
  return [];
}

// Má hráč na tahu tah aktivní figurkou (cokoliv kromě Hranice)?
export function hasActiveMove(state) {
  return legalMoves(state).some((m) => state.board[m.from].t !== 'R');
}

export function moveToString(m) {
  return sqName(m.from) + sqName(m.to) + (m.promo ? m.promo.toLowerCase() : '') + (m.heatRook != null ? '>' + sqName(m.heatRook) : '');
}

// Kardinálové způsobilí pro Konkláve: bez Pokání a mimo zajetí
export function cleanCardinals(state, color) {
  const out = [];
  state.board.forEach((p, i) => {
    if (p && p.c === color && p.t === 'B' && !p.pen && !isCaptiveAt(state, i)) out.push(i);
  });
  return out;
}

// Smí zpovídat figurka q (na poli j) kající se figurku p (na poli i)?
function confessorFits(state, p, q, i, j) {
  if (!(CONFESSORS[p.t] || []).includes(q.t)) return false;
  if (isCaptiveAt(state, j)) return false; // zajatý zpovědník nezpovídá
  if (q.t === 'K') return cheb(i, j) === 1;
  return Math.abs(fileOf(i) - fileOf(j)) + Math.abs(rankOf(i) - rankOf(j)) === 1;
}

function confess(state, color, events) {
  const { board } = state;
  for (let i = 0; i < 64; i++) {
    const p = board[i];
    if (!p || p.c !== color || !isPenitent(p)) continue;
    for (const [df, dr] of KING) {
      const j = at(fileOf(i) + df, rankOf(i) + dr);
      if (j < 0) continue;
      const q = board[j];
      if (q && q.c === color && confessorFits(state, p, q, i, j)) {
        p.pen = false;
        events.push({ type: 'absolve', sq: i, by: j, id: p.id, t: p.t, byT: q.t });
        break;
      }
    }
  }
}

// Dokončení Inkvizice: Inkvizitor s žetonem stojí vedle své Hranice → Žár té Hranice +1 (max 3).
// `choice` = pole Hranice zvolené hráčem; jinak (jediná možnost) Hranice s nejnižším Žárem, pak nižší pole.
function completeInquisitions(state, color, events, choice = -1) {
  const { board } = state;
  for (let i = 0; i < 64; i++) {
    const q = board[i];
    if (!q || q.c !== color || !hasToken(q)) continue;
    let best = -1;
    for (const [df, dr] of KING) {
      const j = at(fileOf(i) + df, rankOf(i) + dr);
      if (j < 0) continue;
      const r = board[j];
      if (!r || r.c !== color || r.t !== 'R') continue;
      if (j === choice) { best = j; break; }
      if (best < 0 || rookHeat(r) < rookHeat(board[best]) || (rookHeat(r) === rookHeat(board[best]) && j < best)) best = j;
    }
    if (best < 0) continue;
    const r = board[best];
    q.pen = false;
    const raised = rookHeat(r) < 3;
    if (raised) r.heat = rookHeat(r) + 1;
    events.push({ type: 'inqDone', color, sq: i, id: q.id, rook: best, rookId: r.id, raised, level: rookHeat(r) });
    if (raised) events.push({ type: 'heat', color, level: rookHeat(r), rooks: [best], from: i });
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
  // Na začátku tahu nemá hráč tah aktivní figurkou → Interdikt, prohrává
  if (!state.result && !state.conclave && !hasActiveMove(state)) {
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
    if (hasToken(victim)) events.push({ type: 'inqFoiled', color: foe, sq: victimSq });
  }
  board[m.to] = p;
  board[m.from] = null;
  if (m.kind === 'penance') {
    p.pen = true;
    events.push({ type: 'penance', sq: m.to, id: p.id });
  }
  if (m.kind === 'inquisition') {
    p.pen = true; // žeton Inkvizice
    events.push({ type: 'inqStart', color: mover, sq: m.to, id: p.id, victim: { ...victim } });
  }
  if (m.promo) {
    p.t = m.promo === 'N' && state.crusade[mover] ? 'C' : m.promo;
    const hadPen = p.pen;
    p.pen = false;
    events.push({ type: 'promote', sq: m.to, t: p.t, id: p.id, cleansed: hadPen });
  }
  state.ep = m.double && !m.promo ? (m.from + m.to) / 2 : -1;

  confess(state, mover, events);
  completeInquisitions(state, mover, events, m.heatRook != null ? m.heatRook : -1);

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
  // Ignis! (dříve Monitum): soupeřův Papež se nově ocitl v dosahu mých Hranic
  if (!state.result && !state.conclave) {
    const ps = popeSquare(state, foe);
    if (ps >= 0 && !popeWasInReach && inRookReach(state, mover, ps)) {
      events.push({ type: 'monitum', color: foe, sq: ps, by: mover });
    }
  }
  return events;
}

// Stav zajetí hodnostářů: id figurky → { sq, by, t, c }
function captivity(state) {
  const out = new Map();
  for (const c of ['w', 'b']) {
    for (const x of captives(state, c)) {
      const p = state.board[x.sq];
      out.set(p.id, { ...x, t: p.t, c });
    }
  }
  return out;
}

function captivityEvents(state, before, events) {
  if (state.result) return;
  const now = captivity(state);
  for (const [id, x] of now) {
    const was = before.get(id);
    // nově zajatý (nebo Kardinál, který se právě stal Papežem a je dál v zajetí, se hlásí znovu)
    if (!was || was.t !== x.t) events.push({ type: 'captive', color: x.c, sq: x.sq, by: x.by, t: x.t, id });
  }
  for (const [id, x] of before) {
    if (now.has(id)) continue;
    const sq = state.board.findIndex((p) => p && p.id === id);
    if (sq >= 0) events.push({ type: 'freed', color: x.c, sq, t: state.board[sq].t, id });
  }
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
  inquisition: 'zahájení Inkvizice',
  ambush: 'přepadení Inkvizitora',
  ep: 'Svedení',
};
