// Vlastní SVG figurky Kajícných šachů (viewBox 100×100).
// Třídy: pb = tělo, pt = zdobení (zlato), pd = tmavé detaily, ps = zlaté linky, pl = obrysové linky, pf = plamen.

const BASE = '<path class="pb" d="M17 94 C17 88 21 85.5 27 85 H73 C79 85.5 83 88 83 94 Z"/>';

const SVG = {
  // Papež – tiára se třemi korunami, kříž, plášť s palliem
  K: `
    <path class="pb" d="M33 62 H67 C72 70 74 78 74 86 H26 C26 78 28 70 33 62 Z"/>
    <path class="ps" d="M37 64 L50 73 L63 64 M50 73 V85"/>
    <path class="pb" d="M50 19 C37.5 19 32.5 30 32.5 42 C32.5 50 33.5 57 35 63 H65 C66.5 57 67.5 50 67.5 42 C67.5 30 62.5 19 50 19 Z"/>
    <path class="pt" d="M35.6 33.5 V29.8 L38.6 31.6 L41.6 28.3 L44.6 31.4 L47.6 28.1 L50 30.6 L52.4 28.1 L55.4 31.4 L58.4 28.3 L61.4 31.6 L64.4 29.8 V33.5 Z"/>
    <path class="pt" d="M33.1 46 V42 L36.5 44 L40 40.4 L43.5 43.7 L47 40.2 L50 43 L53 40.2 L56.5 43.7 L60 40.4 L63.5 44 L66.9 42 V46 Z"/>
    <path class="pt" d="M34.3 58.5 V54.6 L37.8 56.6 L41.4 53 L45 56.3 L48.4 52.8 L50 54.6 L51.6 52.8 L55 56.3 L58.6 53 L62.2 56.6 L65.7 54.6 V58.5 Z"/>
    <circle class="pt" cx="50" cy="16.5" r="3.6"/>
    <path class="pt" d="M48 1.5 H52 V6 H56.5 V10 H52 V14 H48 V10 H43.5 V6 H48 Z"/>
    ${BASE}`,

  // Inkvizitor – vysoká špičatá kápě s průzory, pochodeň, róba s křížem
  Q: `
    <path class="pb" d="M38 57 C32 65 28.5 75 27.5 86 H72.5 C71.5 75 68 65 62 57 Z"/>
    <path class="ps" d="M50 63 V80 M43.5 69 H56.5"/>
    <path class="pb" d="M50 4 L62.5 44 C64.5 50 64.5 55 62 59 H38 C35.5 55 35.5 50 37.5 44 Z"/>
    <path class="pl" d="M44.5 53 Q50 56 55.5 53"/>
    <ellipse class="pd" cx="45" cy="44" rx="2.6" ry="3.6"/>
    <ellipse class="pd" cx="55" cy="44" rx="2.6" ry="3.6"/>
    <path class="pt" d="M18.5 47 H25.5 L24.2 76 H19.8 Z"/>
    <path class="pf" d="M22 25 C15 34 15.5 43 22 47 C28.5 43 29 34 22 25 Z"/>
    <path class="pf2" d="M22 34 C19 38.5 19.3 42.5 22 44.5 C24.7 42.5 25 38.5 22 34 Z"/>
    ${BASE}`,

  // Hranice – kůl s otýpkami dřeva (hranice)
  R: `
    <rect class="pb" x="45" y="9" width="10" height="46" rx="3"/>
    <path class="ps" d="M45 26 L55 30 M45 32 L55 36"/>
    <path class="pl" d="M33 49 L22 77 M67 49 L78 77"/>
    <rect class="pb" x="33" y="47" width="34" height="11" rx="5.5"/>
    <rect class="pb" x="25" y="58" width="50" height="12" rx="6"/>
    <rect class="pb" x="18" y="70" width="64" height="13" rx="6.5"/>
    <circle class="pt" cx="61.5" cy="52.5" r="3.4"/>
    <circle class="pt" cx="69" cy="64" r="3.7"/>
    <circle class="pt" cx="75.5" cy="76.5" r="4"/>
    <circle class="pt" cx="24.5" cy="76.5" r="4"/>
    <circle class="pt" cx="31" cy="64" r="3.7"/>
    ${BASE}`,

  // Biskup – mitra s rozštěpem a křížem, berla
  B: `
    <rect class="pt" x="71.5" y="22" width="4.5" height="63" rx="2.2"/>
    <path class="pt" d="M73.8 26 C73 13 89 10.5 90 21 C90.8 29 81 30.5 80.5 24 C80.2 20.5 84.5 20 85 22.5 C84 18 76.5 19 76 26 Z"/>
    <path class="pb" d="M36 58 H64 C68 66 70 76 70 86 H30 C30 76 32 66 36 58 Z"/>
    <path class="ps" d="M50 63 V77 M45 68 H55"/>
    <path class="pb" d="M50 12 C58 20 66.5 29 66.5 43 V60 H33.5 V43 C33.5 29 42 20 50 12 Z"/>
    <path class="pd" d="M50 13.5 L46.5 19 L50 31 L53.5 19 Z"/>
    <path class="pt" d="M33.5 53 H66.5 V59.5 H33.5 Z"/>
    <path class="ps" d="M50 33 V50 M43.5 39.5 H56.5"/>
    ${BASE}`,

  // Křižák – hrncová přilba s křížovým výztužením, plášť s křížem
  N: `
    <path class="pb" d="M35 70 H65 C71 74 73 79 73 86 H27 C27 79 29 74 35 70 Z"/>
    <path class="ps" d="M50 72 V84 M44 77.5 H56"/>
    <path class="pb" d="M30 27 C30 19 38 15.5 50 15.5 C62 15.5 70 19 70 27 V64 C70 68.5 67 71.5 62.5 71.5 H37.5 C33 71.5 30 68.5 30 64 Z"/>
    <path class="pt" d="M47.3 16 H52.7 V71 H47.3 Z"/>
    <path class="pt" d="M30.5 44.5 H69.5 V49.5 H30.5 Z"/>
    <rect class="pd" x="33.5" y="35" width="12" height="5.5" rx="1.5"/>
    <rect class="pd" x="54.5" y="35" width="12" height="5.5" rx="1.5"/>
    <circle class="pd" cx="58" cy="56" r="1.6"/><circle class="pd" cx="63" cy="56" r="1.6"/>
    <circle class="pd" cx="58" cy="62" r="1.6"/><circle class="pd" cx="63" cy="62" r="1.6"/>
    <circle class="pd" cx="37" cy="56" r="1.6"/><circle class="pd" cx="42" cy="56" r="1.6"/>
    <circle class="pd" cx="37" cy="62" r="1.6"/><circle class="pd" cx="42" cy="62" r="1.6"/>
    ${BASE}`,

  // Hříšník – shrbená postava v kápi, provaz kolem pasu
  P: `
    <path class="pb" d="M40.5 60 C35 66 32 75 31.5 86 H68.5 C68 75 65 66 59.5 60 Z"/>
    <path class="ps" d="M36 71.5 Q50 76.5 64 71.5 M52 75 L50 84"/>
    <path class="pb" d="M52 31 C62.5 31.5 66 40 65 50 C64.5 56 61.5 60.5 58.5 62.5 H41.5 C38.5 60.5 35.5 56 35.2 50 C34.8 40.5 40 33.5 47 32 C48.6 31.6 50.2 31 52 31 Z"/>
    <path class="pd" d="M43.5 51 C43.5 44.5 56.5 44.5 56.5 51 V56 C53.5 59.5 46.5 59.5 43.5 56 Z"/>
    ${BASE}`,
};

export function pieceSVG(t) {
  return `<svg class="pc" viewBox="0 0 100 100" aria-hidden="true">${SVG[t]}</svg>`;
}

// Pokerový žeton Pokání (leží pod figurkou)
export const CHIP_SVG = `<svg class="chip" viewBox="0 0 100 100" aria-hidden="true">
  <ellipse cx="50" cy="92.5" rx="45" ry="9.5" fill="#5e0815"/>
  <ellipse cx="50" cy="89" rx="45" ry="9.5" fill="#c3172f" stroke="#3d040c" stroke-width="1.2"/>
  <ellipse cx="50" cy="89" rx="45" ry="9.5" fill="none" stroke="#fff4e0" stroke-width="3.4" stroke-dasharray="6.5 8.5"/>
  <ellipse cx="50" cy="89" rx="33" ry="6.3" fill="none" stroke="#ffd9c0" stroke-width="1"/>
</svg>`;

// Malé ikony pro výpis tahů
export const ICON = {
  blood: '<svg class="ico" viewBox="0 0 20 20"><path d="M10 2 C6 8 4.5 10.5 4.5 13 A5.5 5.5 0 0 0 15.5 13 C15.5 10.5 14 8 10 2 Z" fill="#c3172f"/></svg>',
  fire: '<svg class="ico" viewBox="0 0 20 20"><path d="M10 1.5 C5 7 4 10 4 13 A6 6 0 0 0 16 13 C16 9.5 13.5 8 13 5 C11.5 7 11 8 10 8.5 C10.5 6 10.5 3.5 10 1.5 Z" fill="#f07a1a"/><path d="M10 10 C8 12.5 8 14 8 15 A2 2 0 0 0 12 15 C12 13.5 11 12 10 10 Z" fill="#ffd34d"/></svg>',
  halo: '<svg class="ico" viewBox="0 0 20 20"><ellipse cx="10" cy="10" rx="7.5" ry="7.5" fill="none" stroke="#e8b84a" stroke-width="2.4"/><circle cx="10" cy="10" r="2.6" fill="#f3d27a"/></svg>',
  crown: '<svg class="ico" viewBox="0 0 20 20"><path d="M3 15 L4 6 L7.5 10 L10 4 L12.5 10 L16 6 L17 15 Z" fill="#e8b84a"/></svg>',
  sword: '<svg class="ico" viewBox="0 0 20 20"><path d="M15.5 2 L18 4.5 L8.5 14 L6 11.5 Z M4.5 11 L9 15.5 L7.5 17 L6 15.5 L3.5 18 L2 16.5 L4.5 14 L3 12.5 Z" fill="#cfd6de"/></svg>',
  logs: '<svg class="ico" viewBox="0 0 20 20"><rect x="2" y="11" width="16" height="5" rx="2.5" fill="#8b5a33"/><rect x="5" y="6" width="10" height="5" rx="2.5" fill="#a06a3c"/><path d="M14 3 L6 18" stroke="#f07a1a" stroke-width="1.6"/></svg>',
};
