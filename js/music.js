// Hudba na pozadí Kajícných šachů – vlastní skladba: kantikum v dórském modu na D.
// Vše je syntetizováno přes WebAudio (žádné nahrávky). Forma (smyčka ~2 min):
//   úvod (bordun + zvon) → antifona (sólový kantor) → 2 verše (sbor na recitačním tónu)
//   → antifona jako organum v paralelních kvintách → mezihra (drnkané úryvky, zvon) → antifona …
// Ladění je pythagorejské od D, aby kvinty proti bordunu zněly čistě.

const LITE = (() => {
  try { return matchMedia('(max-width: 600px)').matches || (navigator.hardwareConcurrency || 8) <= 4; } catch (e) { return false; }
})();

const LEVEL = 0.9; // hlasitost hudby (špička ~0.14, pod úrovní efektů)

// ---------- výšky tónů ----------
const D3 = 146.832;
const RATIO = { D: 1, E: 9 / 8, F: 32 / 27, G: 4 / 3, A: 3 / 2, Bb: 128 / 81, B: 27 / 16, C: 16 / 9 };
export const ALLOWED = new Set(['F2', 'G2', 'A2', 'Bb2', 'C3', 'D3', 'E3', 'F3', 'G3', 'A3', 'Bb3', 'B3', 'C4', 'D4',
  'E4', 'F4', 'G4', 'A4', 'Bb4', 'B4', 'C5', 'D5']);
export const used = new Set(); // pro ověření: všechny skutečně použité tóny

export function freq(name) {
  if (!ALLOWED.has(name)) throw new Error('Tón mimo modus: ' + name);
  used.add(name);
  const m = /^([A-G]b?)(\d)$/.exec(name);
  const letter = m[1];
  const oct = +m[2];
  const dOct = letter === 'C' ? oct - 1 : oct; // C leží pod D téže oktávy
  return D3 * Math.pow(2, dOct - 3) * RATIO[letter];
}

// kvinta pod melodií pro organum (B♭ by dalo E♭ mimo modus → drží se předchozí tón)
const LOW5 = { C3: 'F2', D3: 'G2', E3: 'A2', F3: 'Bb2', G3: 'C3', A3: 'D3', B3: 'E3', C4: 'F3', D4: 'G3', Bb3: null };

// ---------- skladba ----------
const PH_A = [['D3', 2], ['A3', 1], ['Bb3', 1], ['A3', 2], ['G3', 1], ['A3', 3]];
const PH_B = [['A3', 1], ['C4', 1], ['D4', 2], ['C4', 1], ['B3', 1], ['A3', 1], ['G3', 1], ['A3', 3]];
const PH_C = [['A3', 1], ['G3', 1], ['F3', 1], ['G3', 1], ['A3', 1], ['G3', 1], ['F3', 1], ['E3', 3]];
const PH_D = [['F3', 1], ['G3', 1], ['F3', 1], ['E3', 1], ['D3', 1], ['C3', 1], ['D3', 1], ['D3', 4]];
const ANTIPHON = [PH_A, PH_B, PH_C, PH_D];
const FRAGMENTS = [ // úryvky antifony o oktávu výš pro mezihru
  [['D4', 1], ['A4', 1], ['Bb4', 1], ['A4', 2]],
  [['A4', 1], ['C5', 1], ['D5', 2], ['C5', 1], ['B4', 1], ['A4', 2]],
  [['A4', 1], ['G4', 1], ['F4', 1], ['G4', 1], ['E4', 2]],
  [['F4', 1], ['E4', 1], ['D4', 3]],
];

function rep(name, n, units) { return Array.from({ length: n }, () => [name, units]); }

function verse(rng) {
  return [
    [['F3', 1], ['G3', 1], ['A3', 1], ...rep('A3', 5 + Math.floor(rng() * 4), 0.8), ['Bb3', 1], ['A3', 1], ['G3', 1], ['A3', 2]],
    [...rep('A3', 4 + Math.floor(rng() * 3), 0.8), ['G3', 1], ['F3', 1], ['G3', 1], ['E3', 1], ['D3', 3]],
  ];
}

function mulberry(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---------- nástroje ----------
const VOWEL_A = [[730, 6, 1.0], [1090, 7, 0.55], [2440, 9, 0.22]];
const VOWEL_O = [[570, 6, 1.0], [840, 7, 0.6], [2410, 9, 0.18]];

class Graph {
  constructor(ctx, dest, reverbSeconds) {
    this.ctx = ctx;
    this.nodes = new Set();
    this.out = ctx.createGain();      // celková hlasitost hudby
    this.out.gain.value = LEVEL;
    this.duckG = ctx.createGain();    // ztlumení při velkých událostech hry
    this.out.connect(this.duckG);
    this.duckG.connect(dest);
    this.bus = ctx.createGain();
    const dry = ctx.createGain();
    dry.gain.value = 0.72;
    this.bus.connect(dry);
    dry.connect(this.out);
    if (reverbSeconds > 0) {
      const conv = ctx.createConvolver();
      conv.buffer = makeIR(ctx, reverbSeconds);
      const send = ctx.createGain();
      send.gain.value = 0.55;
      const wet = ctx.createGain();
      wet.gain.value = 0.9;
      this.bus.connect(send);
      send.connect(conv);
      conv.connect(wet);
      wet.connect(this.out);
    }
  }

  track(src, stopAt) {
    this.nodes.add(src);
    src.onended = () => this.nodes.delete(src);
    src.stop(stopAt);
    return src;
  }

  stopAll(at) {
    for (const n of this.nodes) { try { n.stop(at); } catch (e) { /* už zastaveno */ } }
  }
}

function makeIR(ctx, seconds) {
  const rate = ctx.sampleRate;
  const len = Math.floor(rate * seconds);
  const buf = ctx.createBuffer(2, len, rate);
  for (let ch = 0; ch < 2; ch++) {
    const d = buf.getChannelData(ch);
    let lp = 0;
    for (let i = 0; i < len; i++) {
      const t = i / len;
      const alpha = 0.85 - 0.8 * t; // dozvuk postupně tmavne
      lp += ((Math.random() * 2 - 1) - lp) * alpha;
      d[i] = lp * Math.pow(1 - t, 2.4) * (1 - Math.exp(-i / (rate * 0.015)));
    }
  }
  return buf;
}

function voice(g, { t0, t1, pan = 0, detune = 0, vowel = VOWEL_A, gain = 0.09 }) {
  const { ctx } = g;
  const osc = ctx.createOscillator();
  osc.type = 'sawtooth';
  osc.detune.value = detune;
  const vib = ctx.createOscillator();
  vib.frequency.value = 4.9 + Math.random() * 0.6;
  const vibG = ctx.createGain();
  vibG.gain.value = 0;
  vib.connect(vibG);
  vibG.connect(osc.frequency);
  const sum = ctx.createGain();
  for (const [f, q, a] of vowel) {
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = f;
    bp.Q.value = q;
    const ga = ctx.createGain();
    ga.gain.value = a;
    osc.connect(bp);
    bp.connect(ga);
    ga.connect(sum);
  }
  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = 3200;
  const env = ctx.createGain();
  env.gain.value = 0;
  sum.connect(lp);
  lp.connect(env);
  if (ctx.createStereoPanner) {
    const pn = ctx.createStereoPanner();
    pn.pan.value = pan;
    env.connect(pn);
    pn.connect(g.bus);
  } else env.connect(g.bus);
  osc.start(t0);
  vib.start(t0);
  g.track(osc, t1);
  g.track(vib, t1);
  return { osc, vibG, env, gain };
}

// převede fráze na tóny s délkami (s jemným rubatem ±8 %)
function realize(notes, u, rng) {
  return notes.map(([name, units]) => ({ name, units, d: units * u * (1 + (rng() * 2 - 1) * 0.08) }));
}

function sing(v, notes, t) {
  const { osc, vibG, env, gain } = v;
  env.gain.setValueAtTime(0, t);
  env.gain.linearRampToValueAtTime(gain, t + 0.14);
  let prev = null;
  for (const n of notes) {
    const f = freq(n.name);
    if (prev == null) osc.frequency.setValueAtTime(f, t);
    else {
      osc.frequency.setValueAtTime(prev, t);
      osc.frequency.exponentialRampToValueAtTime(f, t + 0.04 + Math.random() * 0.03);
      env.gain.setValueAtTime(gain, t - 0.02);
      env.gain.linearRampToValueAtTime(gain * 0.8, t + 0.03);
      env.gain.linearRampToValueAtTime(gain, t + 0.12);
    }
    if (n.units >= 2) { // vibrato jen na dlouhých tónech
      const depth = f * 0.0045;
      vibG.gain.setValueAtTime(0, t + 0.25);
      vibG.gain.linearRampToValueAtTime(depth, t + 0.6);
      vibG.gain.setValueAtTime(depth, Math.max(t + 0.6, t + n.d - 0.08));
      vibG.gain.linearRampToValueAtTime(0, t + n.d);
    }
    prev = f;
    t += n.d;
  }
  env.gain.setValueAtTime(gain, t);
  env.gain.setTargetAtTime(0, t, 0.16);
  return t;
}

function pluck(g, name, t, gain = 0.05) {
  const { ctx } = g;
  const f = freq(name);
  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = 2600;
  lp.connect(g.bus);
  for (const [mult, type, a, dec] of [[1, 'triangle', 1, 1.5], [2, 'sine', 0.3, 0.7], [3, 'sine', 0.12, 0.4]]) {
    const o = ctx.createOscillator();
    o.type = type;
    o.frequency.value = f * mult;
    const e = ctx.createGain();
    e.gain.setValueAtTime(0.0001, t);
    e.gain.exponentialRampToValueAtTime(gain * a, t + 0.005);
    e.gain.exponentialRampToValueAtTime(0.0001, t + dec);
    o.connect(e);
    e.connect(lp);
    o.start(t);
    g.track(o, t + dec + 0.05);
  }
}

function bell(g, name, t, gain = 0.04) {
  const { ctx } = g;
  const f = freq(name);
  for (const [r, a] of [[1, 1], [2.0, 0.5], [2.76, 0.4], [4.07, 0.22], [5.43, 0.14], [0.5, 0.3]]) {
    const o = ctx.createOscillator();
    o.frequency.value = f * r;
    const e = ctx.createGain();
    const dur = 4.5 / Math.sqrt(Math.max(r, 0.6));
    e.gain.setValueAtTime(0.0001, t);
    e.gain.exponentialRampToValueAtTime(gain * a, t + 0.006);
    e.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(e);
    e.connect(g.bus);
    o.start(t);
    g.track(o, t + dur + 0.05);
  }
}

function drone(g, t0, t1) {
  const { ctx } = g;
  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = 600;
  lp.Q.value = 0.7;
  const lfo = ctx.createOscillator();
  lfo.frequency.value = 0.045;
  const lfoG = ctx.createGain();
  lfoG.gain.value = 140;
  lfo.connect(lfoG);
  lfoG.connect(lp.frequency);
  const env = ctx.createGain();
  env.gain.setValueAtTime(0.0001, t0);
  env.gain.exponentialRampToValueAtTime(1, t0 + 6);
  lp.connect(env);
  env.connect(g.bus);
  lfo.start(t0);
  g.track(lfo, t1);
  for (const [name, det, a, type] of [['D3', -5, 0.011, 'sawtooth'], ['D3', 5, 0.011, 'sawtooth'],
    ['A3', -4, 0.008, 'sawtooth'], ['A3', 4, 0.008, 'sawtooth'], ['D4', 0, 0.005, 'triangle']]) {
    const o = ctx.createOscillator();
    o.type = type;
    o.frequency.value = freq(name) / 2; // D2, A2, D3
    o.detune.value = det;
    const ga = ctx.createGain();
    ga.gain.value = a;
    o.connect(ga);
    ga.connect(lp);
    o.start(t0);
    g.track(o, t1);
  }
  return env;
}

// ---------- skladatel: naplánuje vždy jeden oddíl ----------
export class Composer {
  constructor(seed = Date.now()) {
    this.rng = mulberry(seed);
    this.step = 0;
    this.form = ['intro', 'antiphon', 'verse', 'verse', 'organum', 'interlude'];
    this.u = 0.48;
  }

  // naplánuje další oddíl od času t, vrátí jeho konec
  section(g, t) {
    const kind = this.step === 0 ? 'intro' : this.form[1 + ((this.step - 1) % (this.form.length - 1))];
    this.step++;
    this.last = kind;
    return this[kind](g, t);
  }

  breath() { return this.u * 1.5 * (1 + (this.rng() * 2 - 1) * 0.08); }

  intro(g, t) {
    bell(g, 'D3', t + 3, 0.05);
    return t + 10;
  }

  antiphon(g, t) {
    const rng = this.rng;
    const phrases = ANTIPHON.map((p) => realize(p, this.u, rng));
    const total = phrases.reduce((s, p) => s + p.reduce((a, n) => a + n.d, 0), 0) + 4 * this.breath() + 2;
    const v = voice(g, { t0: t, t1: t + total + 1, pan: 0, vowel: VOWEL_A, gain: 0.42 });
    for (const p of phrases) {
      t = sing(v, p, t);
      if (rng() < 0.35) bell(g, rng() < 0.5 ? 'A3' : 'D4', t + 0.2, 0.025);
      t += this.breath();
    }
    return t;
  }

  verse(g, t) {
    const rng = this.rng;
    const phrases = verse(rng).map((p) => realize(p, this.u, rng));
    const total = phrases.reduce((s, p) => s + p.reduce((a, n) => a + n.d, 0), 0) + 3 * this.breath() + 2;
    const voices = [-8, 0, 8].map((det, i) => voice(g, {
      t0: t, t1: t + total + 1, pan: [-0.35, 0, 0.35][i], detune: det, vowel: VOWEL_O, gain: 0.2,
    }));
    for (const p of phrases) {
      let end = t;
      voices.forEach((v, i) => { end = Math.max(end, sing(v, p, t + i * 0.012 + rng() * 0.012)); });
      t = end + this.breath();
    }
    return t;
  }

  organum(g, t) {
    const rng = this.rng;
    const phrases = ANTIPHON.map((p) => realize(p, this.u * 1.06, rng));
    const total = phrases.reduce((s, p) => s + p.reduce((a, n) => a + n.d, 0), 0) + 4 * this.breath() + 2;
    const upper = [-7, 7].map((det, i) => voice(g, { t0: t, t1: t + total + 1, pan: [-0.25, 0.25][i], detune: det, vowel: VOWEL_A, gain: 0.22 }));
    const lower = [-6, 6].map((det, i) => voice(g, { t0: t, t1: t + total + 1, pan: [0.3, -0.3][i], detune: det, vowel: VOWEL_O, gain: 0.22 }));
    for (const p of phrases) {
      // spodní hlas: kvinta pod melodií, začátek a konec v unisonu
      let prevLow = p[0].name;
      const low = p.map((n, i) => {
        if (i === 0 || i === p.length - 1) { prevLow = n.name; return { ...n }; }
        const l = LOW5[n.name];
        if (l) prevLow = l;
        return { ...n, name: prevLow };
      });
      let end = t;
      upper.forEach((v, i) => { end = Math.max(end, sing(v, p, t + i * 0.015)); });
      lower.forEach((v, i) => { end = Math.max(end, sing(v, low, t + 0.008 + i * 0.015)); });
      if (rng() < 0.4) bell(g, 'D3', end + 0.1, 0.03);
      t = end + this.breath();
    }
    return t;
  }

  interlude(g, t) {
    const rng = this.rng;
    const start = t;
    t += 1.5;
    const order = [0, 1, 2, 3].sort(() => rng() - 0.5).slice(0, 3);
    for (const fi of order) {
      for (const [name, units] of FRAGMENTS[fi]) {
        pluck(g, name, t, 0.045);
        t += units * this.u * 1.15 * (1 + (rng() * 2 - 1) * 0.1);
      }
      t += 1.8 + rng() * 1.5;
    }
    bell(g, rng() < 0.5 ? 'D4' : 'A3', t, 0.035);
    return Math.max(t + 3, start + 18);
  }
}

// ---------- přehrávač ----------
export class MusicPlayer {
  constructor(getCtx) {
    this.getCtx = getCtx;
    this.on = true;
    try { this.on = localStorage.getItem('rc-music') !== 'off'; } catch (e) { /* nic */ }
    this.g = null;
    this.timer = null;
    this.next = 0;
    this.hiddenFade = false;
    document.addEventListener('visibilitychange', () => this.onVisibility());
  }

  isOn() { return this.on; }

  setOn(on) {
    this.on = on;
    try { localStorage.setItem('rc-music', on ? 'on' : 'off'); } catch (e) { /* nic */ }
    if (on) this.start(); else this.stop();
  }

  // volat po gestu uživatele (zvuk je odemčený)
  autostart() { if (this.on && !this.g) this.start(); }

  start() {
    const ctx = this.getCtx();
    if (!ctx || this.g) return;
    this.g = new Graph(ctx, ctx.destination, LITE ? 2 : 4);
    const t = ctx.currentTime + 0.2;
    this.g.out.gain.setValueAtTime(0.0001, t);
    this.g.out.gain.exponentialRampToValueAtTime(LEVEL, t + 2.5);
    this.droneEnv = drone(this.g, t, t + 60 * 60 * 6);
    this.composer = new Composer();
    this.next = t;
    this.tick();
    this.timer = setInterval(() => this.tick(), 500);
  }

  tick() {
    const g = this.g;
    if (!g || document.hidden) return;
    const now = g.ctx.currentTime;
    if (this.next < now + 0.2) this.next = now + 0.5;
    if (this.next - now < 3) this.next = this.composer.section(g, this.next);
  }

  stop() {
    const g = this.g;
    if (!g) return;
    clearInterval(this.timer);
    this.timer = null;
    const now = g.ctx.currentTime;
    g.out.gain.cancelScheduledValues(now);
    g.out.gain.setValueAtTime(g.out.gain.value, now);
    g.out.gain.linearRampToValueAtTime(0, now + 0.6);
    g.stopAll(now + 0.7);
    setTimeout(() => { try { g.duckG.disconnect(); } catch (e) { /* nic */ } }, 900);
    this.g = null;
  }

  onVisibility() {
    const g = this.g;
    if (!g) return;
    const now = g.ctx.currentTime;
    g.out.gain.cancelScheduledValues(now);
    g.out.gain.setValueAtTime(Math.max(g.out.gain.value, 0.0001), now);
    if (document.hidden) g.out.gain.exponentialRampToValueAtTime(0.0001, now + 1);
    else { g.out.gain.exponentialRampToValueAtTime(LEVEL, now + 1.5); this.tick(); }
  }

  duck(level = 0.35, hold = 2) {
    const g = this.g;
    if (!g) return;
    const now = g.ctx.currentTime;
    const p = g.duckG.gain;
    p.cancelScheduledValues(now);
    p.setValueAtTime(p.value, now);
    p.setTargetAtTime(level, now, 0.08);
    p.setTargetAtTime(1, now + hold, 0.7);
  }

  // reakce na události hry
  react(evs) {
    let lvl = 1, hold = 0;
    for (const e of evs) {
      const m = { popeFall: [0.25, 3.5], conclave: [0.3, 3.2], crusade: [0.35, 3], absolve: [0.55, 1.6], gameover: [0.12, 9] }[e.type];
      if (m && m[0] < lvl) { lvl = m[0]; hold = Math.max(hold, m[1]); }
    }
    if (lvl < 1) this.duck(lvl, hold);
  }

  activeNodes() { return this.g ? this.g.nodes.size : 0; }
}

// Offline vykreslení pro ověření (bez zvuku): vrátí AudioBuffer
export async function renderOffline(seconds = 120, rate = 22050, seed = 7, withDrone = true) {
  used.clear();
  const ctx = new OfflineAudioContext(2, Math.ceil(seconds * rate), rate);
  const g = new Graph(ctx, ctx.destination, 3);
  if (withDrone) drone(g, 0.1, seconds);
  const comp = new Composer(seed);
  let t = 0.1;
  const sections = [];
  while (t < seconds) { const k0 = t; t = comp.section(g, t); sections.push([comp.last, +k0.toFixed(1), +t.toFixed(1)]); }
  const buf = await ctx.startRendering();
  return { buf, sections, used: [...used].sort() };
}
