// Hudba na pozadí Schizmatu – vlastní skladba: kantikum v dórském modu na D.
// Hrají skutečné nahrávky nástrojů a hlasů (music/, licence v music/CREDITS.md); když se
// nenačtou, zazní záložní syntéza přes WebAudio. Forma (smyčka ~2 min):
//   úvod (bordun + zvon) → antifona (sólový kantor) → 2 verše (sbor na recitačním tónu)
//   → antifona jako organum v paralelních kvintách → mezihra (drnkané úryvky, zvon) → antifona …
// Ladění je pythagorejské od D, aby kvinty proti bordunu zněly čistě.

const LITE = (() => {
  try { return matchMedia('(max-width: 600px)').matches || (navigator.hardwareConcurrency || 8) <= 4; } catch (e) { return false; }
})();

const LEVEL = 0.7; // hlasitost hudby (špička ~0.25, pod úrovní efektů)

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
    dry.gain.value = 0.64;
    this.bus.connect(dry);
    dry.connect(this.out);
    if (reverbSeconds > 0) {
      const conv = ctx.createConvolver();
      conv.buffer = makeIR(ctx, reverbSeconds);
      const send = ctx.createGain();
      send.gain.value = 0.62;
      // do dozvuku nejdou nejhlubší basy (jinak se slévají v dunění)
      const hp = ctx.createBiquadFilter();
      hp.type = 'highpass';
      hp.frequency.value = 140;
      const wet = ctx.createGain();
      wet.gain.value = 1.0;
      this.bus.connect(send);
      send.connect(hp);
      hp.connect(conv);
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

// Impulzní odezva kamenné lodi chrámu: předzpoždění, řídké rané odrazy od zdí a pilířů,
// pak hustý dozvuk, který v čase tmavne (výšky se v kameni a vzduchu tlumí rychleji než basy).
// Každý kanál má vlastní náhodné odrazy → široký prostorový obraz.
function makeIR(ctx, seconds) {
  const rate = ctx.sampleRate;
  const pre = Math.floor(0.028 * rate);
  const len = Math.floor(rate * seconds) + pre;
  const buf = ctx.createBuffer(2, len, rate);
  for (let ch = 0; ch < 2; ch++) {
    const d = buf.getChannelData(ch);
    // rané odrazy (do ~110 ms)
    for (let k = 0; k < 14; k++) {
      const t = pre + Math.floor((0.004 + Math.pow(Math.random(), 1.4) * 0.085) * rate);
      d[t] += (Math.random() < 0.5 ? -1 : 1) * (0.55 - k * 0.03);
    }
    let lp = 0, lp2 = 0;
    const tail = len - pre;
    for (let i = 0; i < tail; i++) {
      const t = i / tail;
      const alpha = 0.9 - 0.82 * Math.pow(t, 0.7); // dozvuk postupně tmavne
      lp += ((Math.random() * 2 - 1) - lp) * alpha;
      lp2 += (lp - lp2) * Math.min(1, alpha * 1.6);
      const env = Math.pow(1 - t, 2.1) * (1 - Math.exp(-i / (rate * 0.045)));
      d[pre + i] += lp2 * env * 0.85;
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

// ---------- sada nástrojů ze skutečných nahrávek ----------
// Vzorky: VCSL (CC0) – žaltář, lidová harfa, renesanční varhany, trubicové zvony, rámový buben;
//         FluidR3_GM (Frank Wen, CC BY 3.0) – sbor „aah“ a hlas „ooh“. Viz music/CREDITS.md.
export class SampleKit {
  constructor(banks) {
    this.banks = banks; // { nástroj: [{ name, freq, buf }] }
    // zpívané nahrávky srovná na stejnou hlasitost ustálené části (různé nahrávky zní jinak silně)
    for (const inst of ['voice', 'choir']) {
      const list = banks[inst] || [];
      for (const e of list) e.rms = steadyRms(e.buf);
      const sorted = list.map((e) => e.rms).filter((x) => x > 0).sort((x, y) => x - y);
      const med = sorted[Math.floor(sorted.length / 2)] || 1;
      for (const e of list) e.norm = e.rms > 0 ? Math.max(0.6, Math.min(1.7, med / e.rms)) : 1;
    }
    // nahrávky sboru mají různě jasnou barvu – vyrovná se na společnou (střední) jasnost
    const choir = this.banks.choir || [];
    for (const e of choir) e.cent = brightness(e.buf);
    const cs = choir.map((e) => e.cent).filter((x) => x > 0).sort((x, y) => x - y);
    const cmed = cs[Math.floor(cs.length / 2)] || 1;
    for (const e of choir) e.eq = e.cent > 0 ? Math.max(-5, Math.min(5, 12 * Math.log2(cmed / e.cent))) : 0;
    // výškový filtr mění i hlasitost – vyrovná se přibližně (zhruba třetina zesílení filtru)
    for (const e of choir) e.norm = (e.norm || 1) * Math.pow(10, (-0.35 * e.eq) / 20);
    this.droneNext = null;
    this.kind = 'samples';
  }

  pick(inst, f) {
    let best = null;
    for (const e of this.banks[inst]) {
      const d = Math.abs(Math.log2(f / e.freq));
      if (!best || d < best.d) best = { e, d };
    }
    return best.e;
  }

  // jeden tón ze vzorku; délka `dur` včetně držení, poté doznění `release`
  note(g, inst, f, t, dur, { gain = 0.3, attack = 0.03, release = 0.25, pan = 0, detune = 0, offset = 0 } = {}) {
    const { ctx } = g;
    const e = this.pick(inst, f);
    const src = ctx.createBufferSource();
    src.buffer = e.buf;
    const rate = (f / e.freq) * Math.pow(2, detune / 1200);
    src.playbackRate.value = rate;
    const env = ctx.createGain();
    const hold = Math.max(attack, dur);
    env.gain.setValueAtTime(0, t);
    env.gain.linearRampToValueAtTime(gain, t + attack);
    env.gain.setValueAtTime(gain, t + hold);
    env.gain.setTargetAtTime(0, t + hold, release / 3);
    src.connect(env);
    connectPan(g, env, pan);
    src.start(t, offset);
    const maxLen = (e.buf.duration - offset) / rate;
    g.track(src, t + Math.min(maxLen, hold + release * 2.5) + 0.02);
  }

  // zpívaná fráze legato (jako zpěvák – hlas se mezi tóny nepřerušuje a plynule klouže):
  //  - každý tón zpívá nahrávka nejbližší jeho výšce, takže se nahrávka přelaďuje jen málo
  //    (přeladění zrychlením posouvá i barvu samohlásky – formanty)
  //  - zbylý posun barvy vyrovnává výškový filtr (čím výš je nahrávka přeladěná, tím víc ztlumí výšky)
  //  - nahrávky jsou srovnané na stejnou hlasitost (normalizace v konstruktoru)
  //  - zůstane-li tón u stejné nahrávky, jen plynule sklouzne na novou výšku (portamento)
  //  - přechod na jinou nahrávku: obě zní během prolnutí na stejné, klouzající výšce, takže je slyšet
  //    jediný hlas, který mění tón, ne dva různé hlasy
  //  - stejný tón po sobě: jen jemný „nádech“ v hlasitosti (nová slabika)
  line(g, notes, t, { inst = 'voice', gain = 0.5, pan = 0, detune = 0 } = {}) {
    const { ctx } = g;
    const det = Math.pow(2, detune / 1200);
    const GLIDE = 0.085;
    // sbor („á“) má formanty – přeladění o půltón posune barvu o ~0,62 dB výškového filtru;
    // hlas („ú“) je skoro čistý tón a jeho barva výšku přirozeně sleduje, tak se nevyrovnává
    const tilt = inst === 'choir'
      ? (e, f) => Math.max(-8, Math.min(8, (e.eq || 0) - 0.62 * 12 * Math.log2((f * det) / e.freq)))
      : () => 0;
    let cur = null;
    const start = (f, at, fade, first, fromF) => {
      const e = this.pick(inst, f);
      const src = ctx.createBufferSource();
      src.buffer = e.buf;
      const rate = (f / e.freq) * det;
      if (fromF) {
        src.playbackRate.setValueAtTime((fromF / e.freq) * det, at);
        src.playbackRate.linearRampToValueAtTime(rate, at + GLIDE);
      } else src.playbackRate.setValueAtTime(rate, at);
      // ustálená část nahrávky se opakuje ve smyčce dlouhé přesně na celý počet kmitů (bez cvaknutí)
      src.loop = true;
      src.loopStart = 0.7;
      src.loopEnd = Math.min(e.buf.duration - 0.05, 0.7 + Math.round(1.9 * e.freq) / e.freq);
      const sh = ctx.createBiquadFilter();
      sh.type = 'highshelf';
      sh.frequency.value = 1000;
      sh.gain.setValueAtTime(fromF ? tilt(e, fromF) : tilt(e, f), at);
      if (fromF) sh.gain.linearRampToValueAtTime(tilt(e, f), at + GLIDE);
      const lvl = gain * (e.norm || 1);
      const env = ctx.createGain();
      env.gain.value = 0;
      env.gain.setValueCurveAtTime(fadeCurve(lvl, true), at, fade);
      src.connect(sh);
      sh.connect(env);
      connectPan(g, env, pan);
      const offset = first ? 0.02 : 0.3; // navazující tón bez vlastního nástupu
      src.start(at, offset);
      return { src, env, sh, e, f, rate, lvl };
    };
    const end = (c, at, fade) => {
      c.env.gain.setValueCurveAtTime(fadeCurve(c.lvl, false), at, fade);
      this.trackLine(g, c.src, at + fade + 0.02);
    };
    const glide = (c, f, at) => {
      const rate = (f / c.e.freq) * det;
      c.src.playbackRate.setValueAtTime(c.rate, at);
      c.src.playbackRate.linearRampToValueAtTime(rate, at + GLIDE);
      c.sh.gain.setValueAtTime(tilt(c.e, c.f), at);
      c.sh.gain.linearRampToValueAtTime(tilt(c.e, f), at + GLIDE);
      c.rate = rate;
      c.f = f;
    };
    for (const n of notes) {
      const f = freq(n.name);
      const semis = cur ? 12 * Math.log2(f / cur.f) : 0;
      if (cur && Math.abs(semis) < 1e-6) {
        const dip = Math.min(0.1, n.d * 0.3);
        cur.env.gain.setValueAtTime(cur.lvl, t - dip);
        cur.env.gain.linearRampToValueAtTime(cur.lvl * 0.78, t);
        cur.env.gain.linearRampToValueAtTime(cur.lvl, t + dip);
      } else if (cur && this.pick(inst, f) === cur.e) {
        glide(cur, f, t);
      } else {
        const fade = cur ? Math.max(0.1, Math.min(0.18, n.d * 0.4)) : 0.08;
        const from = cur ? cur.f : 0;
        if (cur) {
          glide(cur, f, t); // dozpívá na novou výšku a teprve tak se vytratí
          end(cur, t, fade);
        }
        cur = start(f, t, fade, !from, from);
      }
      t += n.d;
    }
    if (cur) {
      const rel = 0.32;
      cur.env.gain.setValueCurveAtTime(fadeCurve(cur.lvl, false), t, rel);
      this.trackLine(g, cur.src, t + rel + 0.02);
    }
    return t;
  }

  trackLine(g, src, stopAt) { g.track(src, stopAt); }

  pluck(g, name, t, gain = 0.3) { this.note(g, 'psaltery', freq(name), t, 1.3, { gain, attack: 0.004, release: 0.9 }); }
  harp(g, name, t, gain = 0.25) { this.note(g, 'harp', freq(name), t, 2.0, { gain, attack: 0.004, release: 0.8, pan: -0.2 }); }
  bell(g, name, t, gain = 0.2) { this.note(g, 'bells', freq(name), t, 3.0, { gain, attack: 0.004, release: 1.5, pan: 0.15 }); }

  drum(g, which, t, gain = 0.3) {
    const e = this.banks.drum.find((x) => x.name.includes(which));
    if (!e) return;
    const src = g.ctx.createBufferSource();
    src.buffer = e.buf;
    const env = g.ctx.createGain();
    env.gain.value = gain;
    src.connect(env);
    connectPan(g, env, 0.1);
    src.start(t);
    g.track(src, t + e.buf.duration + 0.02);
  }

  // prodleva z varhan: překrývající se úseky tónů D2, A2 a D3 s prolínáním
  drone(g, t0, t1) {
    if (this.droneNext == null || this.droneNext < t0 - 2) this.droneNext = t0;
    const L = 3.4, X = 1.1;
    while (this.droneNext < t1) {
      const t = this.droneNext;
      for (const [name, a] of [['D3', 0.023], ['A3', 0.014], ['D4', 0.0066]]) {
        const f = freq(name) / 2;
        const e = this.pick('organ', f);
        const src = g.ctx.createBufferSource();
        src.buffer = e.buf;
        src.playbackRate.value = f / e.freq;
        const env = g.ctx.createGain();
        env.gain.setValueAtTime(0, t);
        env.gain.linearRampToValueAtTime(a, t + X);
        env.gain.setValueAtTime(a, t + L - X);
        env.gain.linearRampToValueAtTime(0, t + L);
        src.connect(env);
        env.connect(g.bus);
        src.start(t, 0.45);
        g.track(src, t + L + 0.03);
      }
      this.droneNext += L - X;
    }
  }
}

function steadyRms(buf) {
  const d = buf.getChannelData(0);
  const a = Math.floor(0.7 * buf.sampleRate);
  const b = Math.min(d.length, Math.floor(1.9 * buf.sampleRate));
  let sum = 0;
  for (let i = a; i < b; i++) sum += d[i] * d[i];
  return b > a ? Math.sqrt(sum / (b - a)) : 0;
}

// jasnost ustálené části nahrávky (efektivní kmitočet z energie derivace, Hz)
function brightness(buf) {
  const d = buf.getChannelData(0);
  const sr = buf.sampleRate;
  const a = Math.floor(0.7 * sr);
  const b = Math.min(d.length, Math.floor(1.9 * sr));
  let en = 0, df = 0;
  for (let i = a + 1; i < b; i++) { en += d[i] * d[i]; const x = d[i] - d[i - 1]; df += x * x; }
  return en > 0 ? (Math.sqrt(df / en) * sr) / (2 * Math.PI) : 0;
}

// křivka prolnutí se stálou hlasitostí (sinus/kosinus)
const FADE_N = 24;
function fadeCurve(gain, up) {
  const c = new Float32Array(FADE_N);
  for (let i = 0; i < FADE_N; i++) {
    const x = i / (FADE_N - 1);
    c[i] = gain * (up ? Math.sin(x * Math.PI / 2) : Math.cos(x * Math.PI / 2));
  }
  return c;
}

function connectPan(g, node, pan) {
  if (pan && g.ctx.createStereoPanner) {
    const pn = g.ctx.createStereoPanner();
    pn.pan.value = pan;
    node.connect(pn);
    pn.connect(g.bus);
  } else node.connect(g.bus);
}

// ---------- přeladění zpěvu se zachováním formantů (TD-PSOLA) ----------
// Prosté zrychlení nahrávky posouvá s výškou i formanty (barvu samohlásky) – hlas pak zní jako
// zrychlená páska. TD-PSOLA (Time-Domain Pitch-Synchronous Overlap-Add) rozdělí nahrávku na
// zrna dlouhá dvě periody, vystředěná na značkách period (vrcholech kmitů), a poskládá je znovu
// s roztečí nové periody. Tvar jednotlivých zrn – a tím spektrální obálka a formanty – zůstane,
// mění se jen to, jak často se opakují, tedy výška tónu. Délka nahrávky se zachová.

function pitchMarks(d, sr, f0) {
  const T = sr / f0;
  let m = 0, best = -1;
  for (let i = 0; i < Math.min(d.length, Math.ceil(T * 1.5)); i++) if (Math.abs(d[i]) > best) { best = Math.abs(d[i]); m = i; }
  const sign = d[m] >= 0 ? 1 : -1;
  const marks = [m];
  let per = T;
  while (m + per * 1.3 < d.length) {
    const lo = Math.round(m + per * 0.85), hi = Math.min(d.length - 1, Math.round(m + per * 1.15));
    let bi = lo, bv = -Infinity;
    for (let i = lo; i <= hi; i++) { const v = d[i] * sign; if (v > bv) { bv = v; bi = i; } }
    per = per * 0.8 + (bi - m) * 0.2; // perioda se pomalu přizpůsobí (vibrato)
    m = bi;
    marks.push(m);
  }
  return marks;
}

function psola(ctx, src, f0, f1) {
  const sr = src.sampleRate;
  const ch = src.numberOfChannels;
  const marks = pitchMarks(src.getChannelData(0), sr, f0);
  const len = src.length;
  const out = ctx.createBuffer(ch, len, sr);
  const T1 = sr / f1;
  const wsum = new Float32Array(len);
  const outs = Array.from({ length: ch }, (_, c) => out.getChannelData(c));
  const ins = Array.from({ length: ch }, (_, c) => src.getChannelData(c));
  let k = 0;
  for (let t = marks[0]; t < marks[marks.length - 1]; t += T1) {
    while (k + 1 < marks.length && Math.abs(marks[k + 1] - t) <= Math.abs(marks[k] - t)) k++;
    const m = marks[k];
    const left = k > 0 ? m - marks[k - 1] : (marks[1] - m);
    const right = k + 1 < marks.length ? marks[k + 1] - m : left;
    const pos = Math.round(t);
    for (let j = -left; j < right; j++) {
      const si = m + j, oi = pos + j;
      if (si < 0 || si >= len || oi < 0 || oi >= len) continue;
      const w = j < 0 ? 0.5 + 0.5 * Math.cos(Math.PI * j / left) : 0.5 + 0.5 * Math.cos(Math.PI * j / right);
      wsum[oi] += w;
      for (let c = 0; c < ch; c++) outs[c][oi] += ins[c][si] * w;
    }
  }
  // nástup nahrávky před první značkou se převezme beze změny, zbytek se vyrovná na součet oken
  for (let i = 0; i < len; i++) {
    if (i < marks[0]) { for (let c = 0; c < ch; c++) outs[c][i] = ins[c][i]; continue; }
    const w = wsum[i];
    if (w > 0.05) for (let c = 0; c < ch; c++) outs[c][i] /= Math.max(w, 0.5);
  }
  return out;
}

// Pro každý tón modu, který může hlas zpívat (nejvýš o 2,5 půltónu nad nejvyšší nahrávkou), předpočítá nahrávku přeladěnou TD-PSOLA
// z nejbližší skutečné nahrávky → při zpěvu už se nahrávka téměř nepřelaďuje.
function psolaBank(ctx, list) {
  if (!list || !list.length) return list;
  const lo = Math.min(...list.map((e) => e.freq)) / Math.pow(2, 8 / 12);
  const hi = Math.max(...list.map((e) => e.freq)) * Math.pow(2, 2.5 / 12);
  const out = [];
  for (const name of ALLOWED) {
    const f = freq(name);
    if (f < lo || f > hi) continue;
    let src = list[0];
    for (const e of list) if (Math.abs(Math.log2(f / e.freq)) < Math.abs(Math.log2(f / src.freq))) src = e;
    // i nepřeladěný tón projde PSOLA: některé nahrávky sboru jsou samy rozladěné až o ~40 centů
    // (zvuková banka to opravovala korekcí ladění, která se při exportu ztratila) – PSOLA skládá
    // zrna přesně v periodě cílového tónu, takže každý tón zní čistě v pythagorejském ladění
    const buf = psola(ctx, src.buf, src.freq, f);
    out.push({ name: name + '<' + src.name, freq: f, buf, src: src.name });
  }
  used.clear();
  return out;
}

export async function loadKit(ctx, base) {
  const meta = await fetch(base + 'samples.json').then((r) => { if (!r.ok) throw new Error('samples ' + r.status); return r.json(); });
  // stahuje nejvýš 6 souborů najednou, každý s jedním opakovaným pokusem
  const jobs = [];
  for (const [inst, list] of Object.entries(meta)) for (const e of list) jobs.push({ inst, e });
  const getOne = async (e, tries = 2) => {
    try {
      const r = await fetch(base + e.file);
      if (!r.ok) throw new Error(e.file + ' ' + r.status);
      return await r.arrayBuffer();
    } catch (err) {
      if (tries > 1) { await new Promise((res) => setTimeout(res, 400)); return getOne(e, tries - 1); }
      throw err;
    }
  };
  const banks = {};
  let next = 0;
  const workers = Array.from({ length: 6 }, async () => {
    while (next < jobs.length) {
      const { inst, e } = jobs[next++];
      const ab = await getOne(e);
      const buf = await new Promise((res, rej) => ctx.decodeAudioData(ab, res, rej));
      (banks[inst] = banks[inst] || []).push({ name: e.file, freq: e.midi == null ? null : 440 * Math.pow(2, (e.midi - 69) / 12), buf });
    }
  });
  await Promise.all(workers);
  for (const inst of ['voice', 'choir']) banks[inst] = psolaBank(ctx, banks[inst]);
  return new SampleKit(banks);
}

// ---------- záložní syntetizovaná sada (když se vzorky nenačtou) ----------
export class SynthKit {
  constructor() { this.kind = 'synth'; this.droneUntil = 0; }

  line(g, notes, t, { inst = 'voice', gain = 0.5, pan = 0, detune = 0 } = {}) {
    const total = notes.reduce((a, n) => a + n.d, 0);
    const v = voice(g, { t0: t, t1: t + total + 1, pan, detune, vowel: inst === 'voice' ? VOWEL_A : VOWEL_O, gain: gain * 0.6 });
    return sing(v, notes, t);
  }

  pluck(g, name, t, gain = 0.3) { pluck(g, name, t, gain * 0.15); }
  harp(g, name, t, gain = 0.25) { pluck(g, name, t, gain * 0.15); }
  bell(g, name, t, gain = 0.2) { bell(g, name, t, gain * 0.2); }
  drum() { /* bez bubnu */ }

  drone(g, t0, t1) {
    if (this.droneUntil > t0) return;
    this.droneUntil = t0 + 6 * 3600;
    drone(g, t0, this.droneUntil);
  }
}

// ---------- skladatel: naplánuje vždy jeden oddíl ----------
export class Composer {
  constructor(kit, seed = Date.now()) {
    this.kit = kit;
    this.rng = mulberry(seed);
    this.step = 0;
    this.form = ['intro', 'antiphon', 'verse', 'verse', 'organum', 'interlude'];
    this.u = 0.5;
  }

  // naplánuje další oddíl od času t, vrátí jeho konec
  section(g, t) {
    const kind = this.step === 0 ? 'intro' : this.form[1 + ((this.step - 1) % (this.form.length - 1))];
    this.step++;
    this.last = kind;
    const end = this[kind](g, t);
    this.kit.drone(g, t, end + 1.5);
    return end;
  }

  breath() { return this.u * 1.5 * (1 + (this.rng() * 2 - 1) * 0.08); }

  intro(g, t) {
    this.kit.harp(g, 'D3', t + 2.2, 0.1);
    this.kit.bell(g, 'D3', t + 4, 0.1);
    return t + 10;
  }

  antiphon(g, t) {
    const rng = this.rng;
    for (const p of ANTIPHON.map((ph) => realize(ph, this.u, rng))) {
      this.kit.harp(g, p[0].name, t, 0.077);
      t = this.kit.line(g, p, t, { inst: 'voice', gain: 1.7 });
      if (rng() < 0.35) this.kit.bell(g, rng() < 0.5 ? 'A3' : 'D4', t + 0.2, 0.06);
      t += this.breath();
    }
    return t;
  }

  verse(g, t) {
    const rng = this.rng;
    for (const p of verse(rng).map((ph) => realize(ph, this.u, rng))) {
      let end = t;
      [[-6, -0.3, 0], [6, 0.3, 0.018]].forEach(([det, pan, off]) => {
        end = Math.max(end, this.kit.line(g, p, t + off, { inst: 'choir', gain: 1.0, pan, detune: det }));
      });
      t = end + this.breath();
    }
    return t;
  }

  organum(g, t) {
    const rng = this.rng;
    for (const p of ANTIPHON.map((ph) => realize(ph, this.u * 1.06, rng))) {
      // spodní hlas: kvinta pod melodií, začátek a konec v unisonu
      let prevLow = p[0].name;
      const low = p.map((n, i) => {
        if (i === 0 || i === p.length - 1) { prevLow = n.name; return { ...n }; }
        const l = LOW5[n.name];
        if (l) prevLow = l;
        return { ...n, name: prevLow };
      });
      let end = t;
      end = Math.max(end, this.kit.line(g, p, t, { inst: 'choir', gain: 0.9, pan: -0.25, detune: -5 }));
      end = Math.max(end, this.kit.line(g, p, t + 0.015, { inst: 'choir', gain: 0.9, pan: 0.25, detune: 5 }));
      end = Math.max(end, this.kit.line(g, low, t + 0.008, { inst: 'choir', gain: 0.85, pan: 0.1, detune: 3 }));
      end = Math.max(end, this.kit.line(g, low, t + 0.02, { inst: 'voice', gain: 0.6, pan: -0.1 }));
      if (rng() < 0.4) this.kit.bell(g, 'D3', end + 0.1, 0.07);
      t = end + this.breath();
    }
    return t;
  }

  interlude(g, t) {
    const rng = this.rng;
    const start = t;
    this.kit.drum(g, 'HDrumL_Hit', t + 0.3, 0.125);
    t += 1.6;
    const order = [0, 1, 2, 3].sort(() => rng() - 0.5).slice(0, 3);
    for (const fi of order) {
      this.kit.harp(g, rng() < 0.5 ? 'D3' : 'A3', t, 0.066);
      for (const [name, units] of FRAGMENTS[fi]) {
        this.kit.pluck(g, name, t, 0.26);
        t += units * this.u * 1.15 * (1 + (rng() * 2 - 1) * 0.1);
      }
      this.kit.drum(g, rng() < 0.5 ? 'HDrumL_HitMuted' : 'HDrumS_Hand', t + 0.2, 0.08);
      t += 1.8 + rng() * 1.5;
    }
    this.kit.bell(g, rng() < 0.5 ? 'D4' : 'A3', t, 0.085);
    return Math.max(t + 3, start + 18);
  }
}

// ---------- přehrávač ----------
export class MusicPlayer {
  constructor(getCtx) {
    this.getCtx = getCtx;
    this.on = true;
    try { this.on = localStorage.getItem('sz-music') !== 'off'; } catch (e) { /* nic */ }
    this.g = null;
    this.kit = null;
    this.kitPromise = null;
    this.timer = null;
    this.next = 0;
    this.base = new URL('../music/', import.meta.url).href;
    document.addEventListener('visibilitychange', () => this.onVisibility());
  }

  isOn() { return this.on; }

  setOn(on) {
    this.on = on;
    try { localStorage.setItem('sz-music', on ? 'on' : 'off'); } catch (e) { /* nic */ }
    if (on) this.start(); else this.stop();
  }

  // volat po gestu uživatele (zvuk je odemčený)
  autostart() { if (this.on && !this.g) this.start(); }

  start() {
    const ctx = this.getCtx();
    if (!ctx || this.g) return;
    const g = new Graph(ctx, ctx.destination, LITE ? 2.5 : 4.6);
    this.g = g;
    if (!this.kitPromise) {
      this.kitPromise = loadKit(ctx, this.base).catch((e) => {
        console.warn('Hudba: vzorky se nenačetly, hraje syntéza', e);
        return new SynthKit();
      });
    }
    this.kitPromise.then((kit) => {
      if (this.g !== g) return; // mezitím vypnuto
      this.kit = kit;
      const t = ctx.currentTime + 0.2;
      g.out.gain.setValueAtTime(0.0001, t);
      g.out.gain.exponentialRampToValueAtTime(LEVEL, t + 2.5);
      if (kit.drone && kit.droneNext !== undefined) kit.droneNext = null;
      this.composer = new Composer(kit);
      this.next = t;
      this.tick();
      this.timer = setInterval(() => this.tick(), 500);
    });
  }

  tick() {
    const g = this.g;
    if (!g || !this.composer || document.hidden) return;
    const now = g.ctx.currentTime;
    if (this.next < now + 0.2) {
      this.next = now + 0.5;
      if (this.kit.droneNext !== undefined) this.kit.droneNext = null;
    }
    if (this.next - now < 3) this.next = this.composer.section(g, this.next);
  }

  stop() {
    const g = this.g;
    if (!g) return;
    clearInterval(this.timer);
    this.timer = null;
    this.composer = null;
    const now = g.ctx.currentTime;
    g.out.gain.cancelScheduledValues(now);
    g.out.gain.setValueAtTime(g.out.gain.value, now);
    g.out.gain.linearRampToValueAtTime(0, now + 0.6);
    g.stopAll(now + 0.7);
    if (this.kit && this.kit.kind === 'synth') this.kit = null, this.kitPromise = null;
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
      const m = { popeFall: [0.25, 3.5], conclave: [0.3, 3.2], crusade: [0.35, 3], heat: [0.4, 2.2], absolve: [0.55, 1.6], gameover: [0.12, 9] }[e.type];
      if (m && m[0] < lvl) { lvl = m[0]; hold = Math.max(hold, m[1]); }
    }
    if (lvl < 1) this.duck(lvl, hold);
  }

  activeNodes() { return this.g ? this.g.nodes.size : 0; }
  kitKind() { return this.kit ? this.kit.kind : 'none'; }
}

// Offline vykreslení pro ověření (bez zvuku): vrátí AudioBuffer a přehled oddílů
export async function renderOffline(seconds = 120, rate = 22050, seed = 7, { base = null, synth = false } = {}) {
  used.clear();
  const ctx = new OfflineAudioContext(2, Math.ceil(seconds * rate), rate);
  const g = new Graph(ctx, ctx.destination, 3);
  const kit = synth ? new SynthKit() : await loadKit(ctx, base || new URL('../music/', import.meta.url).href);
  const comp = new Composer(kit, seed);
  let t = 0.1;
  const sections = [];
  while (t < seconds) { const k0 = t; t = comp.section(g, t); sections.push([comp.last, +k0.toFixed(1), +t.toFixed(1)]); }
  const buf = await ctx.startRendering();
  return { buf, sections, used: [...used].sort(), kit: kit.kind };
}
