// Text pravidel zobrazený v aplikaci
import { pieceSVG, ICON } from './pieces.js?v=22';

const m = (t) => `<span class="mini w">${pieceSVG(t)}</span><span class="mini b">${pieceSVG(t)}</span>`;

export const RULES_HTML = `
<p class="note">Dva papežové, jen jedna pravá víra. Ve Schizmatu rozhoduje inkvizice, vina a oheň – figurky po zabití
propadají pokání a heretického vzdoropapeže čeká jediný ze dvou konců: plameny hranice, nebo potupné podrobení.</p>

<h3>1. Cíl hry a konec partie</h3>
<p>Cílem je zničit církevní hierarchii soupeře tak, aby už neměl koho dosadit na papežský stolec, nebo jej zcela
ochromit. Ve Schizmatu neexistuje povinný šach ani rošáda.</p>
<ul>
  <li><b>Anathema (Vymýcení):</b> prohráváš, když ti padne Papež (Upálením na hranici) a nemáš žádného
  <b>způsobilého Kardinála</b> – všichni jsou odstraněni, v Pokání, nebo drženi v zajetí soupeřovým Křižákem.</li>
  <li><b>Interdikt (Podrobení):</b> prohráváš také, pokud na začátku svého tahu nemáš žádný legální tah
  <b>aktivní figurkou</b> – pasivní Hranice před Interdiktem nechrání. Platí i tehdy, když ti tahy chybějí kvůli zajetí
  Papeže či Kardinálů.</li>
  <li><b>Konkláve:</b> když ti soupeř upálí Papeže, hra nekončí, máš-li Kardinála, který není v Pokání ani v zajetí.
  Hned vybereš jednoho takového Kardinála a ten se na svém poli stane Papežem se všemi jeho schopnostmi. Máš-li jen
  jednoho, zvolí se sám.</li>
  <li><b>Žádný šach a Monitum:</b> Papež smí dobrovolně vstoupit na ohrožené pole. Dostane-li se soupeřův Papež do dosahu
  tvé Hranice, aplikace zvolá <b>Monitum!</b> ${ICON.monitum} (napomenutí).</li>
</ul>

<h3>2. Figurky a žetony</h3>
<table>
  <tr><th></th><th>Název ve Schizmatu</th><th>Klasicky</th><th>Výchozí pole</th></tr>
  <tr><td>${m('K')}</td><td><b>Papež</b></td><td>Král</td><td>e1 / e8</td></tr>
  <tr><td>${m('Q')}</td><td><b>Inkvizitor</b></td><td>Dáma</td><td>d1 / d8</td></tr>
  <tr><td>${m('R')}</td><td><b>Hranice</b></td><td>Věž</td><td>a1, h1 / a8, h8</td></tr>
  <tr><td>${m('B')}</td><td><b>Kardinál</b></td><td>Střelec</td><td>c1, f1 / c8, f8</td></tr>
  <tr><td>${m('N')}</td><td><b>Misionář</b></td><td>Jezdec</td><td>b1, g1 / b8, g8</td></tr>
  <tr><td>${m('C')}</td><td><b>Křižák</b></td><td>Jezdec</td><td>vzniká z Misionářů</td></tr>
  <tr><td>${m('P')}</td><td><b>Poutník</b></td><td>Pěšec</td><td>2. a 7. řada</td></tr>
</table>
<p>Figurky táhnou jako v šachu, s výjimkou Hranic, Poutníků a pravidel níže. Žetony pod figurkami:
<b style="color:#e33">červený</b> = Pokání, <b style="color:#a77ae6">fialový</b> = probíhající Inkvizice,
<b style="color:#f80">oranžový</b> = Žár Hranice, <b style="color:#d6a531">zlatý s křížem</b> = Křižák.
Zajatý Papež či Kardinál má na sobě okovy.</p>

<h3>3. Pokání a Zpověď</h3>
<ul>
  <li><b>Propadnutí Pokání:</b> kdykoliv figurka odstraní soupeřovu figurku, propadá Pokání. Výjimky: Inkvizitor
  (papežské odpustky), Křižáci, Upálení na hranici, Zbloudění (en passant) a odstranění Inkvizitora během Inkvizice.</li>
  <li><b>Důsledek:</b> kající se figurka se smí pohybovat, ale nesmí odstranit žádnou soupeřovu figurku, dokud nezíská rozhřešení.</li>
  <li><b>Zpověď</b> proběhne automaticky na konci tahu, kdy kající se figurka a zpovědník sousedí. <b>Kardinál</b> zpovídá jen
  kardinálně (vodorovně a svisle), <b>Papež</b> i diagonálně. Zajatý Papež ani Kardinál zpovídat nemůže.</li>
  <li><b>Poutník a Misionář</b> se zpovídají u Kardinála i Papeže, <b>Kardinál</b> výhradně u Papeže.</li>
</ul>

<h3>4. Hranice a Upálení na hranici</h3>
<ul>
  <li><b>Pasivní a nezničitelné:</b> Hranice samy nikoho neodstraní a nikdo je nemůže strhnout. Fungují i jako překážky.</li>
  <li><b>Přemisťování:</b> Hranice skáče přes figurky na libovolné volné pole ve čtverci o poloměru svého Žáru (v základu 1 pole).</li>
  <li><b>Upálení na hranici:</b> soupeřovu figurku v dosahu aspoň jedné tvé Hranice (překážky žár neblokují) smí odstranit
  kterákoliv tvá nekající se figurka kromě Poutníka – bez Pokání. Poutník nikoho neupaluje a soupeřova Papeže ani
  čistého Kardinála neodstraní vůbec.</li>
</ul>

<h3>5. Inkvizitor, Inkvizice a Žár Hranic</h3>
<ul>
  <li><b>Odpustky:</b> Inkvizitor nikdy nepropadá Pokání. V dosahu vlastní Hranice prostě upaluje – bez žetonu a bez
  navýšení Žáru.</li>
  <li><b>Zahájení Inkvizice:</b> vezme-li Inkvizitor figurku <b>mimo</b> žár vlastních Hranic (nesmí jít o Papeže ani čistého
  Kardinála), je zajatá a natrvalo ze hry (její ztráta působí hned, např. Křížová výprava). Inkvizitor dostane fialový žeton
  ${ICON.seal} a dokud proces běží, nesmí brát vůbec.</li>
  <li><b>Dokončení:</b> na konci tvého tahu, kdy Inkvizitor se žetonem sousedí (i diagonálně) s tvou Hranicí – ať přišel on, nebo
  Hranice přiskočila – je zajatec upálen, žeton zmizí a <b>Žár té Hranice stoupne o 1</b>. U Hranice s maximem se proces jen
  dokončí.</li>
  <li><b>Trvalý Žár a přepadení:</b> Žár si každá Hranice drží do konce hry. Odstraní-li soupeř Inkvizitora během Inkvizice,
  zajatec je předčasně popraven, Žár se nezvýší a útočník Pokání nepropadá.</li>
</ul>
<table>
  <tr><th>Žár Hranice</th><th>Dokončených inkvizic</th><th>Žetony</th><th>Dosah a skok</th></tr>
  <tr><td><b>1. úroveň</b></td><td>0</td><td>žádný</td><td>1 pole (3 × 3)</td></tr>
  <tr><td><b>2. úroveň</b></td><td>1</td><td>1 žeton</td><td>2 pole (5 × 5)</td></tr>
  <tr><td><b>3. úroveň</b></td><td>2</td><td>2 žetony</td><td>3 pole (7 × 7)</td></tr>
</table>

<h3>6. Papež a Kardinálové (imunita hierarchie)</h3>
<ul>
  <li><b>Papež</b> si nešpiní ruce krví: soupeřovu figurku odstraní jen Upálením (cíl v dosahu jeho Hranice) a sám padne jen
  Upálením v dosahu soupeřovy Hranice – Poutník ho neodstraní nikdy.</li>
  <li><b>Čistý Kardinál</b> může být stejně jako Papež odstraněn jen Upálením. Jakmile propadne Pokání, o imunitu přichází –
  dokud se nevyzpovídá u Papeže, může ho vzít i Poutník a jiné figurky (i jako cíl Inkvizice).</li>
</ul>

<h3>7. Misionáři, Křížová výprava a Zajetí</h3>
<ul>
  <li><b>Misionáři</b> na začátku nemají odpustky a po zabití propadají Pokání.</li>
  <li><b>Křížová výprava:</b> když hráč přijde o posledního Kardinála nebo posledního Inkvizitora, jeho Misionáři se natrvalo
  stávají <b>Křižáky</b> s odpustky – zbaví se Pokání a už ho nikdy nepropadnou (ani když hráč později proměnou získá nového
  Kardinála či Inkvizitora).</li>
  <li><b>Zajetí:</b> stojí-li Křižák tak, že skokem do „L“ ohrožuje soupeřova Papeže nebo kteréhokoliv Kardinála (čistého
  i kajícího se), drží ho v zajetí ${ICON.chain} – při vidličce i více hodnostářů najednou. Zajatý se nesmí pohnout ani
  zpovídat a zajatý Kardinál se nemůže účastnit Konkláve, dokud Křižák neodskočí nebo nepadne.</li>
</ul>

<h3>8. Poutníci: postup, Spása a Zbloudění</h3>
<ul>
  <li><b>Postup:</b> Poutník smí o 1 nebo 2 pole vpřed <b>kdykoliv</b>, jsou-li cílové i mezilehlé pole volné.</li>
  <li><b>Spása:</b> Poutník na poslední řadě se promění v Inkvizitora, Kardinála nebo Misionáře (po vyhlášení Křížové výpravy
  rovnou v Křižáka) a zbaví se Pokání. V Hranici se proměnit nemůže.</li>
  <li><b>Zbloudění (en passant):</b> v bezprostředně následujícím tahu, když soupeřův Poutník postoupí o 2 pole a mine pole
  ohrožované tvým Poutníkem. Tvůj Poutník ho svede z cesty bez krveprolití, a proto nepropadá Pokání. Smí jen nekající se Poutník.</li>
</ul>

<h3>Rychlý tahák</h3>
<div class="cheat">
<ul>
  <li><b>Konec hry:</b> hříšný ani zajatý Kardinál nemůže být zvolen Papežem – pád posledního Papeže je Anathema; soupeř bez
  tahu aktivní figurkou je Interdikt.</li>
  <li><b>Hranice</b> jsou nezničitelné, neberou a skáčou v poloměru svého Žáru (1–3). Umožňují čisté Upálení (ne Poutníkům).</li>
  <li><b>Inkvizitor</b> nepropadá Pokání. V dosahu Hranice upaluje, mimo něj zahájí Inkvizici a nesmí brát, dokud nedojde
  k Hranici – ta pak získá trvale +1 Žár (max 3). Přepadení Inkvizitora s žetonem je bez Pokání.</li>
  <li><b>Papež a čistý Kardinál</b> padnou jen Upálením; kající se Kardinál o imunitu přichází.</li>
  <li><b>Zpověď</b> na konci vlastního tahu: Kardinál zpovídá kardinálně, Papež i diagonálně.</li>
  <li><b>Křižák</b> drží v zajetí Papeže i Kardinály, na které míří skokem jezdce – i vidličkou.</li>
  <li><b>Poutníci</b> smí kdykoliv o 1–2 pole; Zbloudění nezpůsobuje Pokání.</li>
</ul>
</div>

<h3>Nápověda v aplikaci</h3>
<ul>
  <li>Tečka = tah na volné pole. <span style="color:#e33">Červený kruh</span> = braní s Pokáním.
  <span style="color:#f80">Plamenný kruh</span> = braní bez Pokání (upálení, poprava, Křižák, Inkvizice, přepadení, Zbloudění).</li>
  <li>Zlatá svatozář v rohu pole = po tahu proběhne zpověď. Koruna = proměna.</li>
  <li>Pulzující oranžový kruh pod Papežem = je v dosahu soupeřovy Hranice. Okovy = zajetí, Křižák, který drží, má rudý rámeček.</li>
  <li>Tlačítko <b>Dosah hranic</b> zvýrazní pole v dosahu tvých Hranic (oranžově) a soupeřových (fialově šrafovaně).
  U jména hráče je vidět Žár obou jeho Hranic.</li>
</ul>

<h3>Výklad nejasných míst</h3>
<ul class="note">
  <li>Sousedí-li Inkvizitor při dokončení Inkvizice se dvěma Hranicemi, Žár dostane ta s nižším Žárem (při shodě ta blíž
  k levému dolnímu rohu šachovnice).</li>
  <li>Kající se Kardinál v zajetí se smí vyzpovídat u volného Papeže – zajetí brání jen zpovídání ostatních.</li>
  <li>Zpověď, dokončení Inkvizice i zajetí se posuzují v pozici na konci tahu. Zpovídají se jen figurky hráče, který táhl.</li>
  <li>Nového Papeže volí poražená strana jako svou první akci. Remíza je možná jen dohodou hráčů.</li>
</ul>

<p class="note"><b>Inspirace a kredit:</b> Schizma vznikla na základě inspirace šachovou variantou <i>Remorse chess</i>,
jejímž autorem je <a href="https://www.instagram.com/bardelo_bardalini/" target="_blank" rel="noopener">Bardelo Bardalini</a>.</p>
`;
