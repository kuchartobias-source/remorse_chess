// Vizuální efekty nad šachovnicí. Efekty nikdy neřídí stav hry – po čase se samy uklidí.

const rnd = (a, b) => a + Math.random() * (b - a);
const LITE = (() => {
  try { return matchMedia('(max-width: 600px)').matches || (navigator.hardwareConcurrency || 8) <= 4; } catch (e) { return false; }
})();
const REDUCED = (() => {
  try { return matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; }
})();
const n = (k) => Math.max(1, Math.round(LITE ? k * 0.5 : k));

const TIARA_SVG = `<svg viewBox="0 0 100 100"><path d="M50 22C37.5 22 32.5 33 32.5 45c0 8 1 15 2.5 21h30c1.5-6 2.5-13 2.5-21C67.5 33 62.5 22 50 22z" fill="#f6e7b8" stroke="#7a5a14" stroke-width="3"/>
<path d="M35.6 36.5v-3.7l3 1.8 3-3.3 3 3.1 3-3.3 2.4 2.5 2.4-2.5 3 3.3 3-3.1 3 3.3 3-1.8v3.7zM33.1 49v-4l3.4 2 3.5-3.6 3.5 3.3 3.5-3.5 3 2.8 3-2.8 3.5 3.5 3.5-3.3 3.5 3.6 3.4-2v4zM34.3 61.5v-3.9l3.5 2 3.6-3.6 3.6 3.3 3.4-3.5 1.6 1.8 1.6-1.8 3.4 3.5 3.6-3.3 3.6 3.6 3.5-2v3.9z" fill="#d6a531" stroke="#7a5a14" stroke-width="1.2"/>
<circle cx="50" cy="19.5" r="3.6" fill="#d6a531"/><path d="M48 4.5h4V9h4.5v4H52v4h-4v-4h-4.5V9H48z" fill="#d6a531" stroke="#7a5a14" stroke-width="1"/></svg>`;

export class FX {
  constructor(layer, posOf, under = null) {
    this.layer = layer; // absolutně pozicovaná vrstva přes desku (nad figurkami)
    this.under = under || layer; // vrstva pod figurkami (spáleniště)
    this.posOf = posOf; // sq -> {x, y} v jednotkách polí (0..7) dle orientace
  }

  get off() { return REDUCED || document.hidden; }

  cell(sq, ms, under = false) {
    const { x, y } = this.posOf(sq);
    const el = document.createElement('div');
    el.className = 'fx-cell';
    el.style.left = x * 12.5 + '%';
    el.style.top = y * 12.5 + '%';
    (under ? this.under : this.layer).appendChild(el);
    setTimeout(() => el.remove(), ms);
    return el;
  }

  add(parent, cls, style = {}, html = '') {
    const el = document.createElement('div');
    el.className = cls;
    for (const [k, v] of Object.entries(style)) el.style.setProperty(k, v);
    if (html) el.innerHTML = html;
    parent.appendChild(el);
    return el;
  }

  center(sq) {
    const { x, y } = this.posOf(sq);
    return { x: (x + 0.5) * 12.5, y: (y + 0.5) * 12.5 };
  }

  // ---- krev a pokání ----
  blood(sq) {
    if (this.off) return;
    const c = this.cell(sq, 1600);
    this.add(c, 'splat');
    for (let i = 0; i < n(16); i++) {
      const a = rnd(0, Math.PI * 2), d = rnd(25, 75);
      const s = rnd(5, 12) + '%';
      this.add(c, 'drop', { '--dx': Math.cos(a) * d + '%', '--dy': Math.sin(a) * d + '%', width: s, height: s, 'animation-delay': rnd(0, 80) + 'ms' });
    }
  }

  // jediná kapka padající do žetonu pokání
  bloodDrop(sq) {
    if (this.off) return;
    const c = this.cell(sq, 1400);
    this.add(c, 'fall-drop');
    this.add(c, 'drop-ring');
  }

  // ---- oheň ----
  fire(sq, strong = true) {
    if (this.off) return;
    const c = this.cell(sq, 1700);
    this.add(c, 'glowfire');
    for (let i = 0; i < n(strong ? 9 : 5); i++) {
      this.add(c, 'flame', {
        left: rnd(8, 66) + '%', '--d': rnd(700, 1200) + 'ms', '--sk': rnd(-10, 10) + 'deg',
        'animation-delay': rnd(0, 350) + 'ms', height: rnd(38, 62) + '%',
      });
    }
    for (let i = 0; i < n(8); i++) {
      this.add(c, 'ember', { left: rnd(20, 78) + '%', '--dx': rnd(-80, 80) + '%', 'animation-delay': rnd(100, 600) + 'ms' });
    }
  }

  // plamen běžící od Hranice po linii až k oběti
  fireLine(from, to, ms = 380) {
    if (this.off) return;
    const a = this.center(from), b = this.center(to);
    const dist = Math.hypot(b.x - a.x, b.y - a.y) / 12.5;
    const steps = Math.max(2, Math.round(dist * (LITE ? 1.5 : 2.5)));
    for (let i = 1; i <= steps; i++) {
      const t = i / steps;
      const el = document.createElement('div');
      el.className = 'line-flame';
      el.style.left = a.x + (b.x - a.x) * t + '%';
      el.style.top = a.y + (b.y - a.y) * t + '%';
      el.style.animationDelay = Math.round(t * ms) + 'ms';
      el.style.setProperty('--s', (0.75 + Math.random() * 0.5).toFixed(2));
      this.layer.appendChild(el);
      setTimeout(() => el.remove(), ms + 900);
    }
    const src = this.cell(from, 900);
    this.add(src, 'glowfire');
  }

  scorch(sq) {
    if (this.off) return;
    const c = this.cell(sq, 3200, true);
    this.add(c, 'scorch');
  }

  ash(sq) {
    if (this.off) return;
    const c = this.cell(sq, 3000);
    for (let i = 0; i < n(12); i++) {
      this.add(c, 'ashflake', { left: rnd(20, 80) + '%', '--dx': rnd(-120, 120) + '%', '--d': rnd(1600, 2600) + 'ms', 'animation-delay': rnd(200, 900) + 'ms' });
    }
  }

  // ---- meč, polena, stín ----
  slash(sq) {
    if (this.off) return;
    const c = this.cell(sq, 700);
    this.add(c, 'slash');
    this.add(c, 'slash second');
  }

  logs(sq) {
    if (this.off) return;
    const c = this.cell(sq, 1500);
    for (let i = 0; i < n(6); i++) {
      this.add(c, 'log', {
        '--dx': rnd(-140, 140) + '%', '--dy': rnd(30, 120) + '%', '--rot': rnd(-260, 260) + 'deg',
        top: rnd(35, 70) + '%', left: rnd(20, 60) + '%', 'animation-delay': rnd(0, 120) + 'ms',
      });
    }
    this.add(c, 'dustcloud');
  }

  shadow(sq) {
    if (this.off) return;
    const c = this.cell(sq, 1800);
    this.add(c, 'shadowmist');
  }

  dust(sq) {
    if (this.off || LITE) return;
    const c = this.cell(sq, 700);
    for (const dx of [-1, 1]) this.add(c, 'puff', { '--dx': dx * rnd(40, 70) + '%' });
  }

  // ---- světlo a zpověď ----
  halo(sq) {
    if (this.off) return;
    const c = this.cell(sq, 1700);
    this.add(c, 'rays');
    this.add(c, 'halo');
  }

  beam(from, to) {
    if (this.off) return;
    const a = this.center(from), b = this.center(to);
    const el = document.createElement('div');
    el.className = 'beam';
    const len = Math.hypot(b.x - a.x, b.y - a.y);
    const ang = Math.atan2(b.y - a.y, b.x - a.x);
    el.style.left = a.x + '%';
    el.style.top = `calc(${a.y}% - var(--bs) * .006)`;
    el.style.width = len + '%';
    el.style.transform = `rotate(${ang}rad)`;
    this.layer.appendChild(el);
    setTimeout(() => el.remove(), 1100);
  }

  // žeton pokání praskne na střepy, které vystoupají vzhůru
  shards(sq) {
    if (this.off) return;
    const c = this.cell(sq, 1500);
    for (let i = 0; i < n(9); i++) {
      this.add(c, 'shard', { left: rnd(15, 75) + '%', '--dx': rnd(-50, 50) + '%', '--rot': rnd(-200, 200) + 'deg', 'animation-delay': rnd(0, 120) + 'ms' });
    }
  }

  pillar(sq) {
    if (this.off) return;
    const c = this.cell(sq, 1200);
    this.add(c, 'pillar');
    this.add(c, 'rays');
  }

  // ---- konkláve ----
  smoke(sq, black = false) {
    if (this.off) return;
    const c = this.cell(sq, 3200);
    for (let i = 0; i < n(12); i++) {
      this.add(c, 'smoke' + (black ? ' black' : ''), { '--dx': rnd(-60, 60) + '%', '--d': rnd(1600, 2600) + 'ms', 'animation-delay': rnd(0, 900) + 'ms' });
    }
  }

  tiaraDrop(sq) {
    if (this.off) return;
    const c = this.cell(sq, 1600);
    this.add(c, 'tiara-drop', {}, TIARA_SVG);
  }

  ribbon(text, cls = '', ms = 2600) {
    if (this.off) return;
    const el = document.createElement('div');
    el.className = 'ribbon ' + cls;
    el.innerHTML = `<span>${text}</span>`;
    el.style.animationDuration = ms + 'ms';
    this.layer.appendChild(el);
    setTimeout(() => el.remove(), ms + 100);
  }

  clear() {
    this.layer.innerHTML = '';
    this.under.innerHTML = '';
  }
}
