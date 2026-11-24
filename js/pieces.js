// Vlastní SVG figurky Schizmatu (viewBox 100×100).
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

  // Inkvizitor – dominikánský hábit se stolou, biret se třemi hřebínky a bambulí,
  // otevřená kniha a meč spravedlnosti
  Q: `
    <path class="pb" d="M19.5 10.5 L22.8 16.5 V60 H16.2 V16.5 Z"/>
    <path class="pl" d="M19.5 18 V57.5" style="stroke-width:1.1"/>
    <rect class="pt" x="11.3" y="59.4" width="16.4" height="4.4" rx="1.8"/>
    <rect class="pt" x="17.6" y="63.4" width="3.8" height="11" rx="1.2"/>
    <circle class="pt" cx="19.5" cy="76.6" r="2.9"/>
    <path class="pb" d="M35 58 C29 66 26.5 76 26 86 H74 C73.5 76 71 66 65 58 Z"/>
    <path class="pt" d="M45.5 64 H54.5 V86 H45.5 Z"/>
    <path class="pb" d="M33.5 52 C38 47.5 62 47.5 66.5 52 L71 64 C61 68.5 39 68.5 29 64 Z"/>
    <path class="pt" d="M37.5 61.5 Q44 59 50 62 Q56 59 62.5 61.5 V72.5 Q56 70 50 73 Q44 70 37.5 72.5 Z"/>
    <path class="pl" d="M50 62 V73" style="stroke-width:1.2"/>
    <path class="pl" d="M40.5 64.8 Q44.5 63.4 47.5 65 M52.5 65 Q55.5 63.4 59.5 64.8 M40.5 68.2 Q44.5 66.8 47.5 68.4 M52.5 68.4 Q55.5 66.8 59.5 68.2" style="stroke-width:.9"/>
    <ellipse class="pd" cx="50" cy="45.5" rx="8.6" ry="7.8"/>
    <path class="pb" d="M36 41.5 L37.6 28 H62.4 L64 41.5 Z"/>
    <path class="pb" d="M38 28.5 Q39.5 20.5 45.3 23.5 V28.5 Z"/>
    <path class="pb" d="M45 28.5 Q50 16.5 55 28.5 Z"/>
    <path class="pb" d="M54.7 28.5 V23.5 Q60.5 20.5 62 28.5 Z"/>
    <path class="pt" d="M36.3 37.6 H63.7 L64.1 41.6 H35.9 Z"/>
    <circle class="pt" cx="50" cy="18.6" r="3.9"/>
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

  // Kardinál – galero (široký klobouk se šňůrami a střapci), mozzetta a pektorální kříž
  B: `
    <path class="pb" d="M35 60 C30 68 27.5 77 27 86 H73 C72.5 77 70 68 65 60 Z"/>
    <path class="ps" d="M50 68 V85"/>
    <circle class="pt" cx="50" cy="72" r="1.3"/><circle class="pt" cx="50" cy="77" r="1.3"/><circle class="pt" cx="50" cy="82" r="1.3"/>
    <path class="pb" d="M33.5 53.5 C38 49 62 49 66.5 53.5 L71 66 C61 70.5 39 70.5 29 66 Z"/>
    <path class="pt" d="M48.3 55 H51.7 V58.4 H55.1 V61.6 H51.7 V68 H48.3 V61.6 H44.9 V58.4 H48.3 Z"/>
    <ellipse class="pd" cx="50" cy="44.5" rx="8.6" ry="7.8"/>
    <path class="pl" d="M25 35.5 Q19.5 45 21.5 58 M75 35.5 Q80.5 45 78.5 58 M23 41 Q15.5 47 15.5 53 M77 41 Q84.5 47 84.5 53" style="stroke-width:1.5"/>
    <path class="pt" d="M21.5 56.5 L17.6 65 H25.4 Z"/>
    <path class="pt" d="M78.5 56.5 L74.6 65 H82.4 Z"/>
    <path class="pt" d="M15.5 51.5 L12.3 58.5 H18.7 Z"/>
    <path class="pt" d="M84.5 51.5 L81.3 58.5 H87.7 Z"/>
    <ellipse class="pb" cx="50" cy="35" rx="27.5" ry="6.4"/>
    <path class="pb" d="M38.5 34.5 C38.5 21 61.5 21 61.5 34.5 Z"/>
    <path class="pt" d="M38.8 30 H61.2 V33.6 H38.8 Z"/>
    ${BASE}`,

  // Misionář – mnich s tonzurou v hábitu s kapucí, provazem a procesním křížem
  N: `
    <path class="pt" d="M72 7 H77 V14 H84 V19 H77 V86 H72 V19 H65 V14 H72 Z"/>
    <path class="pb" d="M36 59 C30.5 67 27.5 76 27 86 H73 C72.5 76 70 67 64 59 Z"/>
    <path class="ps" d="M32.5 72 Q50 77.5 67.5 72 M55 75.5 L56.5 85 M58 75 L61 83"/>
    <path class="pb" d="M34 52 C39 47.5 61 47.5 66 52 L69.5 62 C59 66.5 41 66.5 30.5 62 Z"/>
    <circle class="pb" cx="74.5" cy="56" r="5"/>
    <circle class="pb" cx="50" cy="38.5" r="11"/>
    <path class="pd" d="M39.2 36.5 Q50 44 60.8 36.5 L61 41 Q50 48 39 41 Z"/>
    <path class="pd" d="M44 45.5 Q50 50 56 45.5 Q55 51 50 51.5 Q45 51 44 45.5 Z"/>
    ${BASE}`,

  // Křižák – hrncová přilba s křížovým výztužením, plášť s křížem
  C: `
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

  // Poutník – postava v kápi s provazem kolem pasu a malou poutnickou holí s tykví
  P: `
    <path class="pb" d="M40.5 60 C35 66 32 75 31.5 86 H68.5 C68 75 65 66 59.5 60 Z"/>
    <path class="ps" d="M36 71.5 Q50 76.5 64 71.5 M52 75 L50 84"/>
    <path class="pb" d="M52 31 C62.5 31.5 66 40 65 50 C64.5 56 61.5 60.5 58.5 62.5 H41.5 C38.5 60.5 35.5 56 35.2 50 C34.8 40.5 40 33.5 47 32 C48.6 31.6 50.2 31 52 31 Z"/>
    <path class="pd" d="M43.5 51 C43.5 44.5 56.5 44.5 56.5 51 V56 C53.5 59.5 46.5 59.5 43.5 56 Z"/>
    <rect class="pt" x="70.2" y="36" width="4" height="50" rx="2"/>
    <circle class="pt" cx="72.2" cy="35" r="3.3"/>
    <path class="pl" d="M74.2 44 L76.6 44.8" style="stroke-width:1.2"/>
    <circle class="pt" cx="77.4" cy="47.6" r="2.4"/>
    <circle class="pt" cx="77.4" cy="53.2" r="3.6"/>
    <circle class="pb" cx="70" cy="64" r="4.2"/>
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

// Žetony Žáru (leží pod Hranicí): 1 žeton = 2. úroveň, 2 žetony = 3. úroveň
const heatChip = (dy) => `<g transform="translate(0 ${dy})">
  <ellipse cx="50" cy="92.5" rx="45" ry="9.5" fill="#6b2a05"/>
  <ellipse cx="50" cy="89" rx="45" ry="9.5" fill="#f07a1a" stroke="#4a1a02" stroke-width="1.2"/>
  <ellipse cx="50" cy="89" rx="45" ry="9.5" fill="none" stroke="#ffe28a" stroke-width="3.4" stroke-dasharray="3 6 9 6"/>
  <ellipse cx="50" cy="89" rx="31" ry="5.8" fill="none" stroke="#ffd36b" stroke-width="1"/>
</g>`;
export const HEAT_SVG = `<svg class="heat" viewBox="0 0 100 100" aria-hidden="true">
  <g class="h1">${heatChip(0)}</g><g class="h2">${heatChip(-6.5)}</g>
</svg>`;

// Zlatý žeton Křižáka (třetí barva) – Misionář povýšený na Křižáka
export const CRUSADE_CHIP_SVG = `<svg class="cchip" viewBox="0 0 100 100" aria-hidden="true">
  <ellipse cx="50" cy="92.5" rx="45" ry="9.5" fill="#6b4c10"/>
  <ellipse cx="50" cy="89" rx="45" ry="9.5" fill="#d6a531" stroke="#4a3408" stroke-width="1.2"/>
  <ellipse cx="50" cy="89" rx="45" ry="9.5" fill="none" stroke="#fff3c8" stroke-width="3.4" stroke-dasharray="7 7"/>
  <path d="M47.6 83.5 H52.4 V86.6 H58 V91 H52.4 V94.6 H47.6 V91 H42 V86.6 H47.6 Z" fill="#b3182c"/>
</svg>`;

// Malé ikony pro výpis tahů
export const ICON = {
  blood: '<svg class="ico" viewBox="0 0 20 20"><path d="M10 2 C6 8 4.5 10.5 4.5 13 A5.5 5.5 0 0 0 15.5 13 C15.5 10.5 14 8 10 2 Z" fill="#c3172f"/></svg>',
  fire: '<svg class="ico" viewBox="0 0 20 20"><path d="M10 1.5 C5 7 4 10 4 13 A6 6 0 0 0 16 13 C16 9.5 13.5 8 13 5 C11.5 7 11 8 10 8.5 C10.5 6 10.5 3.5 10 1.5 Z" fill="#f07a1a"/><path d="M10 10 C8 12.5 8 14 8 15 A2 2 0 0 0 12 15 C12 13.5 11 12 10 10 Z" fill="#ffd34d"/></svg>',
  halo: '<svg class="ico" viewBox="0 0 20 20"><ellipse cx="10" cy="10" rx="7.5" ry="7.5" fill="none" stroke="#e8b84a" stroke-width="2.4"/><circle cx="10" cy="10" r="2.6" fill="#f3d27a"/></svg>',
  crown: '<svg class="ico" viewBox="0 0 20 20"><path d="M3 15 L4 6 L7.5 10 L10 4 L12.5 10 L16 6 L17 15 Z" fill="#e8b84a"/></svg>',
  sword: '<svg class="ico" viewBox="0 0 20 20"><path d="M15.5 2 L18 4.5 L8.5 14 L6 11.5 Z M4.5 11 L9 15.5 L7.5 17 L6 15.5 L3.5 18 L2 16.5 L4.5 14 L3 12.5 Z" fill="#cfd6de"/></svg>',
  cross: '<svg class="ico" viewBox="0 0 20 20"><path d="M8.3 1.5 H11.7 V6.5 H17 V9.9 H11.7 V18.5 H8.3 V9.9 H3 V6.5 H8.3 Z" fill="#d8303f" stroke="#fff3df" stroke-width=".9"/></svg>',
  monitum: '<svg class="ico" viewBox="0 0 20 20"><path d="M10 1.8 L19 17.6 H1 Z" fill="#f07a1a" stroke="#4a1a02" stroke-width="1"/><path d="M9 6.8 H11 L10.7 12.6 H9.3 Z M9 14 H11 V16 H9 Z" fill="#2b1203"/></svg>',
  heat: '<svg class="ico" viewBox="0 0 20 20"><ellipse cx="10" cy="16" rx="8" ry="2.6" fill="#f07a1a"/><path d="M10 2 C6 7 5.5 9.5 5.5 11.5 A4.5 4.5 0 0 0 14.5 11.5 C14.5 9 12.5 7.5 12 5 C11 6.8 10.5 7.4 10 7.8 C10.3 5.8 10.3 3.6 10 2 Z" fill="#ffb12e"/></svg>',
  chain: '<svg class="ico" viewBox="0 0 20 20"><g fill="none" stroke="#c9ccd2" stroke-width="2"><rect x="1.5" y="7" width="8" height="6" rx="3"/><rect x="10.5" y="7" width="8" height="6" rx="3"/></g><path d="M7.5 10 H12.5" stroke="#8d939c" stroke-width="2.2"/></svg>',
  seal: '<svg class="ico" viewBox="0 0 20 20"><circle cx="10" cy="10" r="7.6" fill="#c4410c" stroke="#4a1a02" stroke-width="1"/><circle cx="10" cy="10" r="5.2" fill="none" stroke="#ffd36b" stroke-width="1"/><path d="M8.9 5.6 H11.1 V8.4 H13.9 V10.6 H11.1 V14.4 H8.9 V10.6 H6.1 V8.4 H8.9 Z" fill="#fff0d0"/></svg>',
  logs: '<svg class="ico" viewBox="0 0 20 20"><rect x="2" y="11" width="16" height="5" rx="2.5" fill="#8b5a33"/><rect x="5" y="6" width="10" height="5" rx="2.5" fill="#a06a3c"/><path d="M14 3 L6 18" stroke="#f07a1a" stroke-width="1.6"/></svg>',
};
