// Umělá inteligence Schizmatu: hodnotová síť (MLP natrénovaná samohrou v ai/train.py)
// + prohledávání o 1–2 půltahy. Kódování pozice odpovídá přesně ai/nn.py.
import * as E from './engine.js?v=30';

const CLASSES = ['P', 'P*', 'N', 'N*', 'C', 'B', 'B*', 'R1', 'R2', 'R3', 'Q', 'Q*', 'K'];
const NCLS = CLASSES.length;
const CLS = { P: [0, 1], N: [2, 3], C: [4, 4], B: [5, 6], Q: [10, 11], K: [12, 12] };
export const N_PLANES = 2 * NCLS * 64;
export const N_EXTRA = 2 * NCLS + 2 + 2 + 1 + 1 + 2;
export const N_BASE = N_PLANES + N_EXTRA; // vstup starších sítí (bez rovin dosahu)
export const N_IN = N_BASE + 2 * 64;      // + pole v dosahu mých / soupeřových Hranic
// Penalizace tahu Hranicí při výběru tahu (stejně jako ai/selfplay.py ROOK_PEN)
export const ROOK_PEN = 0.01;

// Vrátí { idx: aktivní indexy rovin, ex: Float32Array(N_EXTRA) } z pohledu hráče na tahu
export function encode(st) {
  const me = st.turn;
  const op = E.other(me);
  const flip = me === 'w' ? 0 : 56;
  const idx = [];
  const counts = new Array(2 * NCLS).fill(0);
  for (let sq = 0; sq < 64; sq++) {
    const p = st.board[sq];
    if (!p) continue;
    const cl = p.t === 'R' ? 6 + E.rookHeat(p) : CLS[p.t][p.pen ? 1 : 0];
    const plane = (p.c === me ? 0 : NCLS) + cl;
    idx.push(plane * 64 + (sq ^ flip));
    counts[plane]++;
  }
  const ex = new Float32Array(N_EXTRA);
  for (let i = 0; i < 2 * NCLS; i++) ex[i] = counts[i] * 0.25;
  const o = 2 * NCLS;
  // součet získaného Žáru Hranic (0..4 → 0..1), vlastní a soupeřův
  const heat = { w: 0, b: 0 };
  for (const p of st.board) if (p && p.t === 'R') heat[p.c] += E.rookHeat(p) - 1;
  ex[o] = heat[me] / 4;
  ex[o + 1] = heat[op] / 4;
  ex[o + 2] = st.crusade[me] ? 1 : 0;
  ex[o + 3] = st.crusade[op] ? 1 : 0;
  ex[o + 4] = st.ep >= 0 ? 1 : 0;
  ex[o + 5] = st.conclave && st.conclave.color === me ? 1 : 0;
  const pm = E.popeSquare(st, me), po = E.popeSquare(st, op);
  ex[o + 6] = pm >= 0 && E.inRookReach(st, op, pm) ? 1 : 0;
  ex[o + 7] = po >= 0 && E.inRookReach(st, me, po) ? 1 : 0;
  for (let sq = 0; sq < 64; sq++) {
    if (E.inRookReach(st, me, sq)) idx.push(N_BASE + (sq ^ flip));
    if (E.inRookReach(st, op, sq)) idx.push(N_BASE + 64 + (sq ^ flip));
  }
  return { idx, ex };
}

export class Model {
  constructor(meta, buf) {
    const f = new Float32Array(buf);
    let off = 0;
    const take = (n) => { const a = f.subarray(off, off + n); off += n; return a; };
    this.h1 = meta.h1;
    this.h2 = meta.h2;
    this.W1 = take(meta.n_in * this.h1);
    this.b1 = take(this.h1);
    this.W2 = take(this.h1 * this.h2);
    this.b2 = take(this.h2);
    this.W3 = take(this.h2);
    this.b3 = take(1);
    if (off !== f.length || (meta.n_in !== N_IN && meta.n_in !== N_BASE)) throw new Error('Neplatný soubor sítě');
    this.nIn = meta.n_in;
    this.a1 = new Float32Array(this.h1);
    this.a2 = new Float32Array(this.h2);
  }

  // Hodnota pozice z pohledu hráče na tahu, (-1, 1)
  value(st) {
    const { idx, ex } = encode(st);
    const { h1, h2, W1, W2, W3, a1, a2 } = this;
    a1.set(this.b1);
    for (const i of idx) {
      if (i >= this.nIn) continue; // starší síť nemá roviny dosahu
      const row = i * h1;
      for (let k = 0; k < h1; k++) a1[k] += W1[row + k];
    }
    for (let j = 0; j < N_EXTRA; j++) {
      const v = ex[j];
      if (!v) continue;
      const row = (N_PLANES + j) * h1;
      for (let k = 0; k < h1; k++) a1[k] += v * W1[row + k];
    }
    for (let k = 0; k < h1; k++) if (a1[k] < 0) a1[k] = 0;
    a2.set(this.b2);
    for (let k = 0; k < h1; k++) {
      const v = a1[k];
      if (!v) continue;
      const row = k * h2;
      for (let m = 0; m < h2; m++) a2[m] += v * W2[row + m];
    }
    let z = this.b3[0];
    for (let m = 0; m < h2; m++) if (a2[m] > 0) z += a2[m] * W3[m];
    return Math.tanh(z);
  }
}

export async function loadModel(base) {
  // meta.json se vždy ověří u serveru; net.bin má v adrese jméno sítě, takže nová síť obejde cache
  const meta = await fetch(base + 'meta.json', { cache: 'no-cache' }).then((r) => {
    if (!r.ok) throw new Error('meta ' + r.status);
    return r.json();
  });
  const buf = await fetch(base + 'net.bin?n=' + encodeURIComponent(meta.net || '')).then((r) => {
    if (!r.ok) throw new Error('net ' + r.status);
    return r.arrayBuffer();
  });
  return new Model(meta, buf);
}

// Náhradní hodnocení (klasický materiál), kdyby se síť nenačetla
const MAT = { P: 1, N: 3, C: 3.5, B: 3, R: 0, Q: 9, K: 0 };
export const materialModel = {
  value(st) {
    let m = 0;
    for (const p of st.board) if (p) m += (p.c === st.turn ? 1 : -1) * MAT[p.t];
    return Math.tanh(m / 10);
  },
};

// Hodnoty všech akcí z pohledu hráče na tahu v `st` (stejně jako ai/selfplay.py child_values)
function actionValues(model, st) {
  const mover = st.turn;
  const out = [];
  for (const a of E.legalActions(st)) {
    const child = E.applyAction(st, a).state;
    let v;
    if (child.result) {
      v = child.result.winner == null ? 0 : (child.result.winner === mover ? 1 : -1);
    } else if (child.conclave && child.conclave.color !== mover) {
      let best = -Infinity;
      for (const ca of E.legalActions(child)) best = Math.max(best, model.value(E.applyAction(child, ca).state));
      v = -best;
    } else {
      v = (child.turn === mover ? 1 : -1) * model.value(child);
    }
    out.push({ a, v, child });
  }
  return out;
}

// Hodnota pozice `st` z pohledu hráče na tahu prohledáním `depth` půltahů s paprskem: v každém uzlu
// síť ohodnotí všechny tahy, ale dál se rozvíjí jen `beams[0]` nejlepších (stejně jako ai/selfplay.py).
function searchValue(model, st, depth, beams) {
  const cand = actionValues(model, st);
  if (!cand.length) return null;
  if (depth <= 1 || !beams.length) return Math.max(...cand.map((c) => c.v));
  cand.sort((x, y) => y.v - x.v);
  let best = -Infinity;
  for (const c of cand.slice(0, beams[0])) {
    let v = c.v;
    if (!c.child.result) {
      const sub = searchValue(model, c.child, depth - 1, beams.slice(1));
      if (sub != null) v = (c.child.turn === st.turn ? 1 : -1) * sub;
    }
    if (v > best) best = v;
  }
  return best;
}

// Úrovně: 1 Misionář (náhodnější, 1 půltah), 2 Kardinál (2 půltahy), 3 Inkvizitor (3 půltahy),
// 4 Papež (4 půltahy). `beams` = kolik nejlepších tahů se rozvíjí v každé hloubce.
export const LEVELS = {
  1: { name: 'Misionář', tau: 0.22, eps: 0.08, depth: 1, beams: [] },
  2: { name: 'Kardinál', tau: 0.02, eps: 0, depth: 2, beams: [12] },
  3: { name: 'Inkvizitor', tau: 0, eps: 0, depth: 3, beams: [12, 8] },
  4: { name: 'Papež', tau: 0, eps: 0, depth: 4, beams: [12, 8, 5] },
};

export function chooseAction(model, st, level = 2, rnd = Math.random) {
  const L = LEVELS[level] || LEVELS[2];
  let cand = actionValues(model, st);
  if (!cand.length) return null;
  if (L.depth >= 2 && !st.conclave) {
    cand.sort((x, y) => y.v - x.v);
    const top = cand.slice(0, L.beams[0]);
    for (const c of top) {
      if (c.child.result) continue;
      const sub = searchValue(model, c.child, L.depth - 1, L.beams.slice(1));
      if (sub != null) c.v = (c.child.turn === st.turn ? 1 : -1) * sub;
    }
    cand = top;
  }
  if (L.eps && rnd() < L.eps) return cand[Math.floor(rnd() * cand.length)].a;
  // tah Hranicí musí být znatelně lepší než jiné tahy (jinak síť přesouvá Hranice bez důvodu)
  if (!st.conclave) {
    for (const c of cand) {
      const p = st.board[E.sqIndex(c.a.slice(0, 2))];
      if (p && p.t === 'R') c.v -= ROOK_PEN;
    }
  }
  const best = Math.max(...cand.map((c) => c.v));
  if (!L.tau) {
    const bests = cand.filter((c) => c.v >= best - 1e-9);
    return bests[Math.floor(rnd() * bests.length)].a;
  }
  const w = cand.map((c) => Math.exp((c.v - best) / L.tau));
  let s = w.reduce((x, y) => x + y, 0) * rnd();
  for (let i = 0; i < cand.length; i++) { s -= w[i]; if (s <= 0) return cand[i].a; }
  return cand[cand.length - 1].a;
}

// Ochota přijmout remízu: jen když stroj stojí hůř
export function acceptsDraw(model, st, aiColor) {
  const v = model.value(st);
  const mine = st.turn === aiColor ? v : -v;
  return mine < -0.15;
}
