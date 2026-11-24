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

  // ---- Hranice a Žár ----
  // jiskry a uhlíky, když se Hranice zvedne ze svého pole
  embers(sq) {
    if (this.off) return;
    const c = this.cell(sq, 1400);
    this.add(c, 'glowfire');
    for (let i = 0; i < n(10); i++) {
      this.add(c, 'ember', { left: rnd(15, 80) + '%', '--dx': rnd(-90, 90) + '%', 'animation-delay': rnd(0, 300) + 'ms' });
    }
    this.add(c, 'scorchring');
  }

  // dopad Hranice: kruh jisker
  sparks(sq) {
    if (this.off) return;
    const c = this.cell(sq, 1000);
    for (let i = 0; i < n(12); i++) {
      const a = rnd(Math.PI * 1.05, Math.PI * 1.95);
      const d = rnd(40, 90);
      this.add(c, 'spark', { '--dx': Math.cos(a) * d + '%', '--dy': Math.sin(a) * d * 0.7 + '%', 'animation-delay': rnd(0, 60) + 'ms' });
    }
  }

  // Žár roste: sloup plamenů a prstenec dosahu
  heatUp(sq, level = 2) {
    if (this.off) return;
    const c = this.cell(sq, 2000);
    this.add(c, 'heatpillar');
    for (let i = 0; i < n(7 + level * 3); i++) {
      this.add(c, 'flame', {
        left: rnd(5, 70) + '%', '--d': rnd(700, 1300) + 'ms', '--sk': rnd(-12, 12) + 'deg',
        'animation-delay': rnd(0, 450) + 'ms', height: rnd(55, 95) + '%',
      });
    }
    for (let i = 0; i < n(10); i++) {
      this.add(c, 'ember', { left: rnd(15, 85) + '%', '--dx': rnd(-120, 120) + '%', 'animation-delay': rnd(150, 800) + 'ms' });
    }
    const ring = this.add(c, 'reachring', { '--r': (level * 2 + 1) * 100 + '%' });
    ring.style.animationDelay = '200ms';
  }

  // Žár uhasne: pára a kouř
  extinguish(sq) {
    if (this.off) return;
    const c = this.cell(sq, 2600);
    for (let i = 0; i < n(10); i++) {
      this.add(c, 'steam', { '--dx': rnd(-70, 70) + '%', '--d': rnd(1200, 2000) + 'ms', 'animation-delay': rnd(0, 500) + 'ms' });
    }
    this.add(c, 'quench');
  }

  // žeton Inkvizice přeletí zpod Inkvizitora pod Hranici (stane se žetonem Žáru)
  chipFly(from, to) {
    if (this.off) return;
    const a = this.center(from), b = this.center(to);
    const el = document.createElement('div');
    el.className = 'chipfly';
    el.style.left = a.x + '%';
    el.style.top = a.y + 4 + '%';
    el.style.setProperty('--dx', (b.x - a.x) + '%');
    el.style.setProperty('--dy', (b.y - a.y) + '%');
    this.layer.appendChild(el);
    requestAnimationFrame(() => { el.style.left = b.x + '%'; el.style.top = b.y + 4 + '%'; el.classList.add('go'); });
    setTimeout(() => el.remove(), 1000);
  }

  // Inkvizice: oběť je zajata – temný závoj a okovy, figurka zmizí ze šachovnice
  seize(sq) {
    if (this.off) return;
    const c = this.cell(sq, 1600);
    this.add(c, 'seizeveil');
    this.add(c, 'shackle');
  }

  // Zajetí: řetěz se natáhne od Křižáka k Papeži a okovy sevřou Papeže
  chainLine(from, to, ms = 420) {
    if (this.off) return;
    const a = this.center(from), b = this.center(to);
    const dist = Math.hypot(b.x - a.x, b.y - a.y) / 12.5;
    const steps = Math.max(4, Math.round(dist * 4));
    const ang = Math.atan2(b.y - a.y, b.x - a.x);
    for (let i = 1; i < steps; i++) {
      const t = i / steps;
      const el = document.createElement('div');
      el.className = 'chainlink' + (i % 2 ? ' odd' : '');
      el.style.left = a.x + (b.x - a.x) * t + '%';
      el.style.top = a.y + (b.y - a.y) * t + '%';
      el.style.setProperty('--ang', ang + 'rad');
      el.style.animationDelay = Math.round(t * ms) + 'ms';
      this.layer.appendChild(el);
      setTimeout(() => el.remove(), ms + 1500);
    }
  }

  shackle(sq) {
    if (this.off) return;
    const c = this.cell(sq, 1600);
    this.add(c, 'shackle');
    this.add(c, 'shackle second');
    this.add(c, 'clankflash');
  }

  // Zajetí pomine: okovy prasknou na úlomky
  breakChains(sq) {
    if (this.off) return;
    const c = this.cell(sq, 1500);
    for (let i = 0; i < n(10); i++) {
      this.add(c, 'chainbit', { left: rnd(20, 70) + '%', top: rnd(35, 70) + '%', '--dx': rnd(-140, 140) + '%', '--dy': rnd(-160, 40) + '%', '--rot': rnd(-360, 360) + 'deg', 'animation-delay': rnd(0, 100) + 'ms' });
    }
    this.add(c, 'rays');
  }

  // Monitum: pulzující varovný kruh pod Papežem
  warn(sq) {
    if (this.off) return;
    const c = this.cell(sq, 2200, true);
    this.add(c, 'warnring');
    this.add(c, 'warnring second');
  }

  // ---- Ohlášení (proklamace) – velký prapor uprostřed desky; řadí je fronta v BoardView ----
  proclaim({ title, sub = '', cls = '', icon = '', ms = 2000 }) {
    if (this.off) return null;
    const el = document.createElement('div');
    el.className = 'procl ' + cls;
    el.style.setProperty('--ms', ms + 'ms');
    el.innerHTML = '<div class="procl-glow"></div>'
      + (icon ? `<div class="procl-emb">${icon}</div>` : '')
      + `<div class="procl-title">${title}</div>`
      + (sub ? `<div class="procl-sub">${sub}</div>` : '');
    for (let i = 0; i < n(12); i++) {
      this.add(el, 'procl-mote', { left: rnd(4, 96) + '%', '--dx': rnd(-50, 50) + '%', '--d': rnd(900, 1600) + 'ms', 'animation-delay': rnd(150, ms * 0.55) + 'ms' });
    }
    this.layer.appendChild(el);
    setTimeout(() => el.remove(), ms + 120);
    return el;
  }

  // rychle odklidí rozehraná ohlášení (další tah, listování historií)
  clearProclaims() {
    this.layer.querySelectorAll('.procl, .ribbon, .boardwash, .fumata, .fallcross, .sealstamp').forEach((el) => {
      el.classList.add('gone');
      setTimeout(() => el.remove(), 320);
    });
  }

  // celodeskový závoj: barevný záblesk, viněta nebo světlo
  wash(cls, ms = 1800) {
    if (this.off) return null;
    const el = document.createElement('div');
    el.className = 'boardwash ' + cls;
    el.style.setProperty('--ms', ms + 'ms');
    this.layer.appendChild(el);
    setTimeout(() => el.remove(), ms + 80);
    return el;
  }

  // Konkláve: dým z komína nad deskou – černý (nevolba) nebo bílý (Habemus Papam)
  fumata(white = false, ms = 3200) {
    if (this.off) return;
    const el = document.createElement('div');
    el.className = 'fumata' + (white ? ' white' : '');
    el.innerHTML = '<div class="chimney"></div>';
    for (let i = 0; i < n(16); i++) {
      this.add(el, 'plume', { '--dx': rnd(-120, 120) + '%', '--s': rnd(1.4, 2.8).toFixed(2), '--d': rnd(1700, 2600) + 'ms', 'animation-delay': rnd(0, ms * 0.65) + 'ms' });
    }
    this.layer.appendChild(el);
    setTimeout(() => el.remove(), ms + 2700);
  }

  // Habemus Papam: zlaté paprsky dopadnou na nového Papeže
  heaven(sq) {
    if (this.off) return;
    const c = this.cell(sq, 2400);
    this.add(c, 'heavenbeam');
    this.add(c, 'rays');
    this.add(c, 'halo');
    for (let i = 0; i < n(10); i++) this.add(c, 'glint', { left: rnd(10, 90) + '%', top: rnd(-120, 60) + '%', 'animation-delay': rnd(0, 900) + 'ms' });
  }

  // Deus vult: shora se snesou rudé kříže
  crosses(ms = 2200) {
    if (this.off) return;
    const svg = '<svg viewBox="0 0 20 20"><path d="M8.3 1.5 H11.7 V6.5 H17 V9.9 H11.7 V18.5 H8.3 V9.9 H3 V6.5 H8.3 Z" fill="#d8303f" stroke="#fff3df" stroke-width=".9"/></svg>';
    for (let i = 0; i < n(16); i++) {
      const el = document.createElement('div');
      el.className = 'fallcross';
      el.innerHTML = svg;
      el.style.left = rnd(2, 94) + '%';
      el.style.setProperty('--rot', rnd(-160, 160) + 'deg');
      el.style.setProperty('--dx', rnd(-8, 8) + '%');
      el.style.setProperty('--sz', rnd(3.2, 6) + '%');
      el.style.animationDelay = rnd(0, ms * 0.5) + 'ms';
      el.style.animationDuration = rnd(1300, 2000) + 'ms';
      this.layer.appendChild(el);
      setTimeout(() => el.remove(), ms + 2100);
    }
  }

  // Ignis!: plamínky vyšlehnou kolem ohroženého Papeže
  ignite(sq) {
    if (this.off) return;
    const c = this.cell(sq, 1900, true);
    this.add(c, 'ignisring');
    for (let i = 0; i < n(10); i++) {
      const a = (i / n(10)) * Math.PI * 2;
      this.add(c, 'flame small', { left: 50 + Math.cos(a) * 42 - 9 + '%', top: 50 + Math.sin(a) * 30 - 20 + '%', '--d': rnd(600, 1000) + 'ms', '--sk': rnd(-12, 12) + 'deg', 'animation-delay': rnd(0, 350) + 'ms', height: rnd(30, 45) + '%' });
    }
  }

  // Svedení: Poutník odbloudí z cesty – za ním zůstanou stopy
  astray(sq, dir = 1) {
    if (this.off) return;
    const c = this.cell(sq, 1900);
    for (let i = 0; i < 5; i++) {
      this.add(c, 'footprint' + (i % 2 ? ' r' : ''), { left: 40 + dir * i * 16 + '%', top: 62 - i * 9 + (i % 2) * 6 + '%', 'animation-delay': 120 + i * 140 + 'ms' });
    }
    this.add(c, 'swirl');
  }

  // Zmaření Inkvizice: rudá pečeť Inkvizice pukne na kusy vosku
  sealBreak(sq) {
    if (this.off) return;
    const c = this.cell(sq, 1600);
    this.add(c, 'sealcrack');
    for (let i = 0; i < n(9); i++) {
      const a = rnd(0, Math.PI * 2), d = rnd(50, 120);
      this.add(c, 'waxbit', { '--dx': Math.cos(a) * d + '%', '--dy': Math.sin(a) * d * 0.7 - 30 + '%', '--rot': rnd(-300, 300) + 'deg', 'animation-delay': rnd(0, 80) + 'ms' });
    }
  }

  // Zajetí pomine: modrý žeton Křižáka odlétne a hodnostář se nadechne
  freed(sq) {
    if (this.off) return;
    const c = this.cell(sq, 1400, true);
    this.add(c, 'freering');
  }

  // Anathema: svíce zhasínají – nad figurkami poraženého stoupá dým
  snuff(sqs) {
    if (this.off) return;
    sqs.forEach((sq, i) => {
      setTimeout(() => {
        if (this.off) return;
        const c = this.cell(sq, 2400);
        this.add(c, 'wick');
        for (let k = 0; k < 2; k++) this.add(c, 'wisp', { '--dx': rnd(-30, 30) + '%', 'animation-delay': k * 260 + 'ms' });
      }, i * 90);
    });
  }

  // Interdikt: doprostřed desky dopadne těžká pečeť
  sealStamp(ms = 2600) {
    if (this.off) return;
    const el = document.createElement('div');
    el.className = 'sealstamp';
    el.innerHTML = '<svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="44" fill="#6a1220" stroke="#3a0610" stroke-width="3"/>'
      + '<circle cx="50" cy="50" r="34" fill="none" stroke="#e2b25c" stroke-width="2.4" stroke-dasharray="4 3"/>'
      + '<path d="M45 22 H55 V40 H73 V50 H55 V78 H45 V50 H27 V40 H45 Z" fill="#e2b25c"/></svg>';
    el.style.setProperty('--ms', ms + 'ms');
    this.layer.appendChild(el);
    setTimeout(() => el.remove(), ms + 100);
  }

  clear() {
    this.layer.innerHTML = '';
    this.under.innerHTML = '';
  }
}
