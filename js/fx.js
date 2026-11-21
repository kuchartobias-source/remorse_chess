// Vizuální efekty nad šachovnicí. Efekty nikdy neřídí stav hry – po čase se samy uklidí.

const rnd = (a, b) => a + Math.random() * (b - a);

export class FX {
  constructor(layer, posOf) {
    this.layer = layer; // absolutně pozicovaná vrstva přes desku
    this.posOf = posOf; // sq -> {x, y} v jednotkách polí (0..7) dle orientace
  }

  cell(sq, ms) {
    const { x, y } = this.posOf(sq);
    const el = document.createElement('div');
    el.className = 'fx-cell';
    el.style.left = x * 12.5 + '%';
    el.style.top = y * 12.5 + '%';
    this.layer.appendChild(el);
    setTimeout(() => el.remove(), ms);
    return el;
  }

  add(parent, cls, style = {}) {
    const el = document.createElement('div');
    el.className = cls;
    for (const [k, v] of Object.entries(style)) el.style.setProperty(k, v);
    parent.appendChild(el);
    return el;
  }

  blood(sq) {
    const c = this.cell(sq, 1600);
    this.add(c, 'splat');
    for (let i = 0; i < 16; i++) {
      const a = rnd(0, Math.PI * 2), d = rnd(25, 75);
      const s = rnd(5, 12) + '%';
      this.add(c, 'drop', { '--dx': Math.cos(a) * d + '%', '--dy': Math.sin(a) * d + '%', width: s, height: s, 'animation-delay': rnd(0, 80) + 'ms' });
    }
  }

  fire(sq, strong = true) {
    const c = this.cell(sq, 1700);
    this.add(c, 'glowfire');
    const n = strong ? 9 : 5;
    for (let i = 0; i < n; i++) {
      this.add(c, 'flame', {
        left: rnd(8, 66) + '%', '--d': rnd(700, 1200) + 'ms', '--sk': rnd(-10, 10) + 'deg',
        'animation-delay': rnd(0, 350) + 'ms', height: rnd(38, 62) + '%',
      });
    }
    for (let i = 0; i < 8; i++) {
      this.add(c, 'ember', { left: rnd(20, 78) + '%', '--dx': rnd(-80, 80) + '%', 'animation-delay': rnd(100, 600) + 'ms' });
    }
  }

  slash(sq) {
    const c = this.cell(sq, 700);
    this.add(c, 'slash');
  }

  halo(sq) {
    const c = this.cell(sq, 1700);
    this.add(c, 'rays');
    this.add(c, 'halo');
  }

  beam(from, to) {
    const a = this.posOf(from), b = this.posOf(to);
    const el = document.createElement('div');
    el.className = 'beam';
    const x1 = (a.x + 0.5) * 12.5, y1 = (a.y + 0.5) * 12.5;
    const x2 = (b.x + 0.5) * 12.5, y2 = (b.y + 0.5) * 12.5;
    // délka v % šířky desky (deska je čtverec)
    const len = Math.hypot(x2 - x1, y2 - y1);
    const ang = Math.atan2(y2 - y1, x2 - x1);
    el.style.left = x1 + '%';
    el.style.top = `calc(${y1}% - var(--bs) * .006)`;
    el.style.width = len + '%';
    el.style.transform = `rotate(${ang}rad)`;
    this.layer.appendChild(el);
    setTimeout(() => el.remove(), 1100);
  }

  pillar(sq) {
    const c = this.cell(sq, 1200);
    this.add(c, 'pillar');
    this.add(c, 'rays');
  }

  smoke(sq) {
    const c = this.cell(sq, 3200);
    for (let i = 0; i < 12; i++) {
      this.add(c, 'smoke', { '--dx': rnd(-60, 60) + '%', '--d': rnd(1600, 2600) + 'ms', 'animation-delay': rnd(0, 900) + 'ms' });
    }
  }

  clear() { this.layer.innerHTML = ''; }
}
