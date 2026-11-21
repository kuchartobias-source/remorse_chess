// Zvukové efekty Kajícných šachů – vše syntetizováno přes WebAudio (žádné nahrávky).

let ctx = null;
let master = null;
let noiseBuf = null;
let muted = false;
try { muted = localStorage.getItem('rc-sound') === 'off'; } catch (e) { /* nic */ }

export const isMuted = () => muted;
export const audioState = () => (ctx ? ctx.state : 'none');

export function setMuted(m) {
  muted = m;
  try { localStorage.setItem('rc-sound', m ? 'off' : 'on'); } catch (e) { /* nic */ }
  if (master) master.gain.value = m ? 0 : 0.85;
  if (!m) unlock();
}

// Volat při každém pointerdown – prohlížeče dovolí zvuk až po gestu uživatele
export function unlock() {
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return;
  if (!ctx) {
    ctx = new AC();
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -16;
    comp.knee.value = 14;
    comp.ratio.value = 4;
    comp.attack.value = 0.003;
    comp.release.value = 0.25;
    master = ctx.createGain();
    master.gain.value = muted ? 0 : 0.85;
    master.connect(comp);
    comp.connect(ctx.destination);
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  if (ctx.state === 'suspended') ctx.resume();
}

const ok = (force) => ctx && master && !muted && ctx.state === 'running' && (force || !document.hidden);
const T = (delay) => ctx.currentTime + (delay || 0);
const rnd = (a, b) => a + Math.random() * (b - a);

function env(g, t0, peak, attack, dur) {
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(Math.max(peak, 0.0002), t0 + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + attack + dur);
}

function tone({ type = 'sine', f, f2, delay = 0, dur = 0.3, gain = 0.3, attack = 0.005, lp, detune = 0 }) {
  const t0 = T(delay);
  const o = ctx.createOscillator();
  o.type = type;
  o.frequency.setValueAtTime(f, t0);
  if (f2) o.frequency.exponentialRampToValueAtTime(f2, t0 + attack + dur);
  o.detune.value = detune;
  const g = ctx.createGain();
  env(g, t0, gain, attack, dur);
  let node = o;
  if (lp) {
    const flt = ctx.createBiquadFilter();
    flt.type = 'lowpass';
    flt.frequency.value = lp;
    o.connect(flt);
    node = flt;
  }
  node.connect(g);
  g.connect(master);
  o.start(t0);
  o.stop(t0 + attack + dur + 0.05);
}

function noise({ delay = 0, dur = 0.2, gain = 0.3, attack = 0.005, type = 'bandpass', f = 1000, f2, q = 1 }) {
  const t0 = T(delay);
  const src = ctx.createBufferSource();
  src.buffer = noiseBuf;
  const flt = ctx.createBiquadFilter();
  flt.type = type;
  flt.frequency.setValueAtTime(f, t0);
  if (f2) flt.frequency.exponentialRampToValueAtTime(f2, t0 + attack + dur);
  flt.Q.value = q;
  const g = ctx.createGain();
  env(g, t0, gain, attack, dur);
  src.connect(flt);
  flt.connect(g);
  g.connect(master);
  src.start(t0, Math.random() * 1.5);
  src.stop(t0 + attack + dur + 0.05);
}

// Zvon: neharmonické alikvoty s exponenciálním doznějím
function bell(f, { delay = 0, dur = 2, gain = 0.3 } = {}) {
  const parts = [[1, 1], [2.0, 0.55], [2.76, 0.42], [4.07, 0.26], [5.43, 0.16], [0.5, 0.35]];
  for (const [r, a] of parts) tone({ f: f * r, delay, dur: dur / Math.sqrt(Math.max(r, 0.6)), gain: gain * a, attack: 0.004 });
}

// Akord (varhany / sbor): dvojice lehce rozladěných oscilátorů na tón
function chord(freqs, { delay = 0, dur = 2, gain = 0.1, attack = 0.15, type = 'sawtooth', lp = 1400 } = {}) {
  for (const f of freqs) {
    tone({ type, f, delay, dur, gain, attack, lp, detune: -7 });
    tone({ type, f, delay, dur, gain, attack, lp, detune: 7 });
  }
}

function knock(delay = 0, pitch = 1, gain = 0.5) {
  tone({ type: 'triangle', f: 230 * pitch, f2: 95 * pitch, delay, dur: 0.07, gain, attack: 0.002 });
  noise({ delay, dur: 0.025, gain: gain * 0.5, f: 1900 * pitch, q: 2.5, attack: 0.001 });
}

export const sfx = {
  select() { if (ok()) noise({ dur: 0.02, gain: 0.08, f: 3200, q: 3, attack: 0.001 }); },
  error() { if (ok()) tone({ type: 'square', f: 95, dur: 0.12, gain: 0.08, lp: 450 }); },
  move(delay = 0.2) { if (ok()) knock(delay, rnd(0.92, 1.08)); },
  hop(delay = 0.05) { if (ok()) { knock(delay, 1.15, 0.28); knock(delay + 0.24, rnd(0.95, 1.05), 0.5); } },
  castle() { if (ok()) { knock(0.15, 0.9); knock(0.32, 1.1, 0.4); } },
  penance(delay = 0.18) {
    if (!ok()) return;
    noise({ delay, dur: 0.28, gain: 0.55, type: 'lowpass', f: 900, f2: 160, q: 0.8 });
    tone({ f: 140, f2: 48, delay, dur: 0.3, gain: 0.5 });
    bell(196, { delay: delay + 0.18, dur: 1.6, gain: 0.16 });
  },
  burn(delay = 0.05, execute = false) {
    if (!ok()) return;
    noise({ delay, dur: 0.9, gain: 0.45, f: 300, f2: 2600, q: 0.9, attack: 0.12 });
    noise({ delay: delay + 0.1, dur: 1.1, gain: 0.18, type: 'lowpass', f: 500, q: 0.5, attack: 0.2 });
    for (let i = 0; i < 22; i++) noise({ delay: delay + rnd(0.1, 1.4), dur: 0.012, gain: rnd(0.05, 0.22), type: 'highpass', f: 2200, q: 0.7, attack: 0.001 });
    if (execute) {
      tone({ f: 80, f2: 42, delay: delay + 0.05, dur: 0.45, gain: 0.75 });
      noise({ delay: delay + 0.05, dur: 0.15, gain: 0.4, type: 'lowpass', f: 220 });
      tone({ f: 80, f2: 42, delay: delay + 0.42, dur: 0.5, gain: 0.6 });
    }
  },
  crusade(delay = 0.12) {
    if (!ok()) return;
    noise({ delay, dur: 0.13, gain: 0.5, type: 'highpass', f: 1800, f2: 6000, q: 0.8, attack: 0.01 });
    for (const [r, a] of [[1, 1], [1.48, 0.7], [2.13, 0.5], [2.93, 0.35]]) tone({ f: 1230 * r, delay: delay + 0.1, dur: 0.55, gain: 0.16 * a, attack: 0.002 });
    tone({ f: 120, f2: 60, delay: delay + 0.12, dur: 0.2, gain: 0.35 });
  },
  pyre(delay = 0.15) {
    if (!ok()) return;
    for (let i = 0; i < 7; i++) knock(delay + rnd(0, 0.55), rnd(0.6, 1.3), rnd(0.25, 0.5));
    tone({ f: 90, f2: 45, delay, dur: 0.35, gain: 0.5 });
    noise({ delay, dur: 0.6, gain: 0.2, type: 'lowpass', f: 700, f2: 200 });
  },
  secret(delay = 0.1) {
    if (!ok()) return;
    noise({ delay, dur: 0.6, gain: 0.12, f: 4200, q: 0.6, attack: 0.08 });
    noise({ delay: delay + 0.15, dur: 0.5, gain: 0.08, f: 2600, q: 0.6, attack: 0.1 });
  },
  absolve(delay = 0.4) {
    if (!ok()) return;
    chord([440, 554.37, 659.25, 880], { delay, dur: 1.6, gain: 0.05, attack: 0.3, lp: 1500 });
    bell(1318.5, { delay: delay + 0.15, dur: 1.4, gain: 0.07 });
  },
  promote(delay = 0.25) {
    if (!ok()) return;
    [523.25, 659.25, 783.99, 1046.5, 1318.5].forEach((f, i) => tone({ type: 'triangle', f, delay: delay + i * 0.09, dur: 0.6, gain: 0.16, attack: 0.01 }));
    noise({ delay: delay + 0.2, dur: 0.8, gain: 0.05, type: 'highpass', f: 6000, attack: 0.2 });
  },
  popeFall(delay = 0.25) {
    if (!ok()) return;
    bell(73.4, { delay, dur: 4.5, gain: 0.55 });
    noise({ delay, dur: 1.6, gain: 0.25, type: 'lowpass', f: 140, q: 0.5, attack: 0.05 });
  },
  conclave(delay = 1.2) {
    if (!ok()) return;
    const peal = [784, 659.25, 587.33, 523.25, 440, 392];
    for (let k = 0; k < 2; k++) peal.forEach((f, i) => bell(f, { delay: delay + k * 1.25 + i * 0.19, dur: 1.4, gain: 0.11 }));
    chord([392, 493.88, 587.33], { delay: delay + 0.2, dur: 2.4, gain: 0.035, attack: 0.5, lp: 1800 });
  },
  crusadeCall(delay = 0.3) {
    if (!ok()) return;
    for (const [f, d0, len] of [[146.83, 0, 0.75], [220, 0.62, 1.1]]) {
      tone({ type: 'sawtooth', f: f * 0.94, f2: f, delay: delay + d0, dur: len, gain: 0.2, attack: 0.06, lp: 950 });
      tone({ type: 'sawtooth', f: f * 0.94, f2: f, delay: delay + d0, dur: len, gain: 0.12, attack: 0.08, lp: 950, detune: 9 });
    }
    tone({ f: 60, f2: 40, delay: delay + 1.2, dur: 0.5, gain: 0.5 });
  },
  win() { if (ok()) { chord([261.63, 329.63, 392, 523.25], { dur: 2.8, gain: 0.07, attack: 0.08, type: 'square', lp: 2200 }); bell(523.25, { delay: 0.1, dur: 2, gain: 0.08 }); } },
  lose() { if (ok()) { chord([130.81, 261.63, 311.13, 392], { dur: 3.2, gain: 0.07, attack: 0.1, type: 'square', lp: 1300 }); bell(65.4, { delay: 0.2, dur: 4, gain: 0.35 }); } },
  draw() { if (ok()) chord([196, 293.66, 392], { dur: 2.4, gain: 0.06, attack: 0.12, type: 'square', lp: 1500 }); },
  notify() { if (ok(true)) bell(880, { dur: 1.2, gain: 0.1 }); },
};

// Zvuky pro události jednoho tahu (časování odpovídá animacím)
export function playEvents(evs) {
  if (!ok()) return;
  const mv = evs.find((e) => e.type === 'move');
  const cap = evs.find((e) => e.type === 'capture');
  const popeFell = evs.some((e) => e.type === 'popeFall');
  if (evs.some((e) => e.type === 'castle')) sfx.castle();
  else if (cap) {
    if (cap.kind === 'penance') sfx.penance();
    else if (cap.kind === 'burn') sfx.burn(cap.rooks && cap.rooks.length ? 0.05 : 0.1);
    else if (cap.kind === 'execute') sfx.burn(0.05, true);
    else if (cap.kind === 'crusade') sfx.crusade();
    else if (cap.kind === 'pyre') sfx.pyre();
    else if (cap.kind === 'ep') sfx.secret();
  } else if (mv) {
    if (mv.piece.t === 'N' || mv.piece.t === 'C') sfx.hop();
    else sfx.move();
  }
  for (const e of evs) {
    if (e.type === 'absolve') sfx.absolve(evs.some((x) => x.type === 'penance' && x.id === e.id) ? 1.0 : 0.4);
    if (e.type === 'promote') sfx.promote();
    if (e.type === 'popeFall') sfx.popeFall();
    if (e.type === 'conclave') sfx.conclave(popeFell ? 2.1 : 1.3);
    if (e.type === 'crusade') sfx.crusadeCall(popeFell ? 3.2 : 0.6);
  }
}
