// Text pravidel zobrazený v aplikaci
import { pieceSVG, ICON } from './pieces.js?v=15';

const m = (t) => `<span class="mini w">${pieceSVG(t)}</span><span class="mini b">${pieceSVG(t)}</span>`;

export const RULES_HTML = `
<p class="note">Dva papežové, jen jedna pravá víra. Ve Schizmatu rozhoduje inkvizice, vina a oheň – figurky po zabití
propadají pokání a heretického vzdoropapeže čeká jediný ze dvou konců: plameny hranice, nebo potupné podrobení.</p>

<h3>1. Figurky a rozestavení</h3>
<p>Klasická šachovnice a klasické rozestavení. Figurky se pohybují jako v šachu, s výjimkou Hranic, Poutníků
a speciálních pravidel níže. Pod figurkami leží žetony: <b style="color:#e33">červený</b> = Pokání,
<b style="color:#f80">oranžový</b> = Žár Hranic, <b style="color:#d6a531">zlatý s křížem</b> = Misionář povýšený na Křižáka.</p>
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

<h3>2. Hřích, Pokání a Křížová výprava</h3>
<ul>
  <li><b>Propadnutí pokání:</b> kdykoliv figurka odstraní soupeřovu figurku, propadá Pokání (červený žeton).
  Výjimky: Křižáci, Upálení na hranici a Tajný hřích (en passant).</li>
  <li><b>Důsledek:</b> kající se figurka se smí normálně pohybovat, ale nesmí odstranit <b>žádnou</b> soupeřovu figurku,
  dokud nezíská rozhřešení.</li>
  <li><b>Misionáři a Křížová výprava:</b> jezdci začínají jako Misionáři – bez imunity, po zabití propadají Pokání.
  Jakmile hráč přijde o <b>posledního Kardinála</b> nebo o <b>Inkvizitora</b>, vyhlásí se Křížová výprava: všichni jeho Misionáři se natrvalo
  stávají <b>Křižáky</b> s papežským odpustkem, zbaví se Pokání a už ho nikdy nepropadnou – i kdyby hráč později
  proměnou získal nového Kardinála či Inkvizitora.</li>
</ul>

<h3>3. Zpověď a rozhřešení</h3>
<ul>
  <li>Zpověď proběhne automaticky na konci tahu hráče, kdy kající se figurka a její zpovědník sousedí – ať přišla figurka
  ke zpovědníkovi, nebo zpovědník k ní. Žeton zmizí a v dalším tahu smí figurka zase brát.</li>
  <li><b>Kardinál</b> zpovídá jen „kardinálně“ – vodorovně a svisle. <b>Papež</b> zpovídá i diagonálně (všech 8 sousedních polí).</li>
  <li><b>Poutník, Misionář a Inkvizitor</b> se zpovídají u Kardinála i u Papeže. <b>Kardinál</b> se zpovídá výhradně u Papeže.</li>
</ul>

<h3>4. Hranice, Žár a Papež</h3>
<ul>
  <li><b>Hranice jsou pasivní a nezničitelné:</b> samy nikoho neodstraní a nikdo je nemůže strhnout – zůstávají na šachovnici
  celou partii a fungují jako překážky.</li>
  <li><b>Přemisťování:</b> Hranice se nepohybuje jako věž. Skáče přes figurky na libovolné volné pole ve čtverci o poloměru
  daném úrovní Žáru (v základu 1 pole, jako Papež).</li>
  <li><b>Upálení na hranici:</b> soupeřovu figurku v dosahu aspoň jedné tvé Hranice (překážky žár neblokují) smí odstranit
  kterákoliv tvá nekající se figurka kromě Poutníka – a Pokání nepropadne. Poutník nikoho neupaluje: v dosahu Hranice
  zabíjí běžně (s Pokáním) a soupeřova Papeže neodstraní nikdy.</li>
</ul>
<table>
  <tr><th>Žár</th><th>Inkvizice</th><th>Žetony</th><th>Dosah a skok</th></tr>
  <tr><td><b>1. úroveň</b></td><td>0</td><td>žádný</td><td>1 pole (3 × 3)</td></tr>
  <tr><td><b>2. úroveň</b></td><td>1</td><td>1 žeton</td><td>2 pole (5 × 5)</td></tr>
  <tr><td><b>3. úroveň</b></td><td>3</td><td>2 žetony</td><td>3 pole (7 × 7)</td></tr>
</table>
<ul>
  <li><b>Žár Hranic</b> roste s úspěchy Inkvizitora: každé odstranění soupeřovy figurky Inkvizitorem je jedna inkvizice
  a platí pro obě tvé Hranice. Maximum je 3. úroveň.</li>
  <li><b>Ztráta Žáru:</b> když ti soupeř odstraní Inkvizitora, Žár klesne zpět na 1. úroveň a počítadlo inkvizic se vynuluje.
  Máš-li díky Spáse více Inkvizitorů, jejich inkvizice se sčítají a Žár zanikne až s posledním z nich.</li>
  <li><b>Žádný šach ani rošáda:</b> Papež smí dobrovolně vstoupit na ohrožené pole, napadení se nehlásí ani neřeší.
  Dostane-li se soupeřův Papež do dosahu tvé Hranice, aplikace zvolá <b>Monitum!</b> (napomenutí) ${ICON.monitum}.</li>
  <li><b>Poprava na hranici:</b> Papež si sám nešpiní ruce krví – soupeřovu figurku smí odstranit jen Upálením (cíl v dosahu
  tvé Hranice). Stejně tak Papež padne jen Upálením: musí stát v dosahu soupeřovy Hranice a nesmí ho odstranit
  Poutník. Křižák ho upálit smí, ale jen v dosahu Hranice.</li>
  <li><b>Zajetí Papeže (Křižáci):</b> kdykoliv Křižák stojí na poli, odkud svým skokem do „L“ přímo ohrožuje soupeřova
  Papeže, drží jej automaticky v zajetí ${ICON.chain}. Zajatý Papež se nesmí pohnout ze svého pole a nemůže zpovídat
  vlastní figurky, dokud zajetí nepomine – soupeř musí útočícího Křižáka odstranit, nebo Křižák sám odskočí jinam.
  Tím lze Papeže zdržet na místě, než se k němu přesune Hranice.</li>
</ul>

<h3>5. Konkláve a konec hry</h3>
<ul>
  <li><b>Pád Papeže:</b> když ti padne Papež, hra nekončí, máš-li aspoň jednoho Kardinála bez Pokání (s čistým svědomím).</li>
  <li><b>Volba nového Papeže:</b> vybereš jednoho svého čistého Kardinála a ten se na svém poli stane Papežem se všemi jeho
  schopnostmi. Máš-li jen jednoho, zvolí se sám.</li>
  <li><b>Anathema (Vymýcení):</b> prohráváš, když ti padne Papež a nemáš žádného čistého Kardinála.</li>
  <li><b>Interdikt (Podrobení):</b> prohráváš také, pokud na začátku svého tahu nemáš žádný legální tah – i tehdy,
  když ti chybí kvůli tomu, že tvého Papeže drží v zajetí soupeřův Křižák.</li>
</ul>

<h3>6. Ostatní speciální tahy</h3>
<ul>
  <li><b>Postup Poutníků:</b> Poutník smí o 1 nebo 2 pole vpřed <b>kdykoliv</b> během hry, jsou-li cílové i mezilehlé pole volné.</li>
  <li><b>Spása (proměna):</b> Poutník na poslední řadě se promění v Inkvizitora, Kardinála nebo Misionáře (po vyhlášení
  Křížové výpravy rovnou v Křižáka) a zbaví se Pokání. V Hranici se proměnit nemůže.</li>
  <li><b>Tajný hřích (en passant):</b> platí v bezprostředně následujícím tahu, když soupeřův Poutník postoupí o 2 pole a mine pole
  ohrožované tvým Poutníkem. Poutník při něm Pokání nepropadá – smí ho ale vykonat jen nekající se Poutník.</li>
</ul>

<h3>Rychlý tahák</h3>
<div class="cheat">
<ul>
  <li><b>Hranice</b> jsou nezničitelné, samy neberou a přemisťují se skokem v poloměru dle Žáru (1–3 pole). Umožňují čisté
  Upálení bez Pokání (neplatí pro Poutníky).</li>
  <li><b>Žár</b> roste s úspěchy Inkvizitora (1 inkvizice = 2. úroveň, 3 inkvizice = 3. úroveň). Smrtí posledního
  Inkvizitora klesá zpět na 1.</li>
  <li><b>Papež</b> smí zabíjet i být odstraněn výhradně Upálením na hranici (Poutník ho odstranit nemůže, Křižák jen upálením).
  Křižák ho ale skokem jezdce drží v <b>zajetí</b> – zajatý Papež se nepohne ani nezpovídá.</li>
  <li><b>Misionáři → Křižáci:</b> jakmile přijdeš o posledního Kardinála nebo o Inkvizitora, stávají se natrvalo Křižáky s imunitou vůči Pokání.</li>
  <li><b>Poutníci</b> smí kdykoliv o 1–2 pole vpřed; Tajný hřích nezpůsobuje Pokání.</li>
  <li><b>Zpověď</b> na konci vlastního tahu: Kardinál zpovídá vodorovně a svisle, Papež i diagonálně. Kardinál se zpovídá jen u Papeže.</li>
  <li><b>Hříšný Kardinál nemůže být zvolen Papežem</b> – pád posledního Papeže znamená Anathemu (Vymýcení), soupeř bez tahu Interdikt (Podrobení).</li>
</ul>
</div>

<h3>Nápověda v aplikaci</h3>
<ul>
  <li>Tečka = tah na volné pole. <span style="color:#e33">Červený kruh</span> = braní s Pokáním.
  <span style="color:#f80">Plamenný kruh</span> = čisté braní (upálení, poprava, křižák, tajný hřích).</li>
  <li>Zlatá svatozář v rohu pole = po tomto tahu proběhne zpověď. Koruna = proměna.</li>
  <li>Pulzující oranžový kruh pod Papežem = stojí v dosahu soupeřovy Hranice a hrozí mu poprava.
  Řetěz na Papežově poli = Papež je v zajetí; Křižák, který ho drží, má rudý rámeček.</li>
  <li>Tlačítko <b>Dosah hranic</b> zvýrazní pole v dosahu tvých Hranic (oranžově) a soupeřových (fialově šrafovaně).
  U jména hráče je vidět úroveň Žáru a počet inkvizic.</li>
</ul>

<h3>Výklad nejasných míst</h3>
<ul class="note">
  <li>Když figurka sebere a skončí vedle svého zpovědníka, je rozhřešena hned na konci téhož tahu. Zpovídají se jen figurky hráče, který táhl.</li>
  <li>Kající se Kardinál smí zpovídat, ale nesmí být zvolen Papežem.</li>
  <li>Křižák v dosahu Hranice upaluje, mimo něj bere s odpustkem – v obou případech bez Pokání. Papeže jen upaluje – mimo dosah Hranice ho nebere.</li>
  <li>Zajetí se posuzuje v pozici na konci každého tahu; zajatý Papež nemůže ani upalovat (to by byl pohyb).</li>
  <li>Křížová výprava po smrti Inkvizitora: vyhlásí se, když strana nemá žádného Inkvizitora (při více Inkvizitorech díky Spáse až po smrti posledního).</li>
  <li>Stane-li se poslední Kardinál Papežem, strana už Kardinála nemá – vyhlásí se Křížová výprava.</li>
  <li>Nového Papeže volí poražená strana jako svou první akci. Remíza je možná jen dohodou hráčů.</li>
</ul>
`;
