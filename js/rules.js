// Text pravidel zobrazený v aplikaci
import { pieceSVG } from './pieces.js?v=2';

const m = (t) => `<span class="mini w">${pieceSVG(t)}</span><span class="mini b">${pieceSVG(t)}</span>`;

export const RULES_HTML = `
<p class="note">Kajícné šachy jsou taktickou variantou klasického šachu, ve které každý prolitý doušek krve zatěžuje svědomí.
Figurky po odstranění soupeře propadají pokání a musí hledat rozhřešení u zpovědníků, zatímco nad vším bdí
neúprosná inkvizice a sám papež.</p>

<h3>1. Figurky a rozestavení</h3>
<p>Klasická šachovnice a klasické rozestavení. Figurky se pohybují jako v šachu, pokud pravidla níže neříkají jinak.</p>
<table>
  <tr><th></th><th>Kajícný název</th><th>Klasicky</th><th>Výchozí pole</th></tr>
  <tr><td>${m('K')}</td><td><b>Papež</b></td><td>Král</td><td>e1 / e8</td></tr>
  <tr><td>${m('Q')}</td><td><b>Inkvizitor</b></td><td>Dáma</td><td>d1 / d8</td></tr>
  <tr><td>${m('R')}</td><td><b>Hranice</b></td><td>Věž</td><td>a1, h1 / a8, h8</td></tr>
  <tr><td>${m('B')}</td><td><b>Biskup</b></td><td>Střelec</td><td>c1, f1 / c8, f8</td></tr>
  <tr><td>${m('N')}</td><td><b>Poutník</b></td><td>Jezdec</td><td>b1, g1 / b8, g8</td></tr>
  <tr><td>${m('C')}</td><td><b>Křižák</b></td><td>Jezdec</td><td>vzniká z Poutníků</td></tr>
  <tr><td>${m('P')}</td><td><b>Hříšník</b></td><td>Pěšec</td><td>2. a 7. řada</td></tr>
</table>

<h3>2. Hřích a Pokání</h3>
<ul>
  <li><b>Propadnutí pokání:</b> kdykoliv figurka odstraní soupeřovu živou figurku, propadá Pokání – dostane červený žeton.
  Výjimky: Křižáci (imunita), Upálení na hranici, odstranění neživé Hranice a Tajný hřích (en passant).</li>
  <li><b>Důsledek:</b> kající se figurka se smí normálně pohybovat, ale nesmí odstranit žádnou další živou figurku,
  dokud nezíská rozhřešení. Soupeřovu Hranici strhnout smí (jen Papež, Inkvizitor a Biskup).</li>
  <li><b>Odpustky:</b> Křižáci Pokání nikdy nepropadají.</li>
</ul>

<h3>3. Poutníci a Křižáci</h3>
<ul>
  <li><b>Poutník</b> táhne jako jezdec a podléhá Pokání jako ostatní figurky. Zpovídá se <b>jen u Biskupa</b>.
  Hranici odstranit nesmí.</li>
  <li><b>Křížová výprava:</b> jakmile strana nemá na šachovnici žádného Biskupa (zůstal jen Papež), všichni její Poutníci
  vezmou kříž a natrvalo se z nich stanou <b>Křižáci</b>. Případného Pokání se tím zbaví.</li>
  <li><b>Křižák</b> táhne jako jezdec, zabíjí živé figurky bez Pokání, ale Hranici odstranit nesmí. Křižákem zůstává,
  i když strana později znovu získá Biskupa.</li>
</ul>

<h3>4. Zpověď a rozhřešení</h3>
<ul>
  <li>Kající se figurka musí stát <b>vodorovně nebo svisle</b> (ne diagonálně) vedle svého zpovědníka.</li>
  <li>Zpověď proběhne automaticky na konci tahu hráče, kdy spolu sousedí – ať přišla figurka ke zpovědníkovi, nebo zpovědník k ní.
  Žeton zmizí a figurka smí v dalším tahu znovu brát.</li>
  <li><b>Hříšník</b> a <b>Poutník</b> se zpovídají jen u Biskupa, <b>Inkvizitor</b> u Biskupa i Papeže, <b>Biskup</b> jen u Papeže.</li>
</ul>

<h3>5. Hranice a Papež</h3>
<ul>
  <li><b>Hranice samy neberou.</b> Slouží k poziční kontrole a podpoře.</li>
  <li><b>Dosah Hranice:</b> řada a sloupec Hranice. <b>Vlastní figurky výhled neblokují</b>; zastaví ho až první soupeřova
  figurka (ta je ještě v dosahu).</li>
  <li><b>Upálení na hranici:</b> soupeřovu figurku v dosahu tvé Hranice smí odstranit kterákoliv tvá figurka, která není Hříšník
  a nekaje se – a Pokání nepropadne. (Hříšník ji odstranit smí, ale Pokání propadne.)</li>
  <li><b>Odstranění Hranice:</b> Hranice je neživá, její stržení Pokání nezpůsobuje. Smí ji strhnout jen Papež, Inkvizitor
  nebo Biskup – i když se kají. Poutníci, Křižáci a Hříšníci ne.</li>
  <li><b>Žádný šach:</b> Papež smí vstoupit i na ohrožené pole, napadení se nehlásí ani neřeší.</li>
  <li><b>Poprava na hranici:</b> Papež smí odstranit živou figurku jen tehdy, když je její pole v dosahu aspoň jedné tvé Hranice.
  Soupeřovu Hranici strhne i sám.</li>
  <li><b>Azyl (rošáda):</b> původní Papež s nepohnutou Hranicí, pole mezi nimi volná. Lze ji provést i když je Papež napadený
  nebo přechází přes ohrožené pole.</li>
</ul>

<h3>6. Konkláve a konec hry</h3>
<ul>
  <li><b>Pád Papeže:</b> když padne tvůj Papež, hra nekončí, máš-li aspoň jednoho Biskupa bez Pokání.</li>
  <li><b>Volba nového Papeže:</b> vybereš jednoho svého čistého Biskupa a ten se na svém poli stane Papežem
  (Azyl už ale provést nesmí). Máš-li jen jednoho, zvolí se sám.</li>
  <li><b>Zatracení:</b> prohráváš, když ti padne Papež a nemáš žádného čistého Biskupa.
  Prohráváš také, pokud na začátku svého tahu nemáš žádný legální tah.</li>
</ul>

<h3>7. Speciální tahy</h3>
<ul>
  <li><b>Spása (proměna):</b> Hříšník na poslední řadě se promění v Inkvizitora, Hranici, Biskupa nebo Poutníka (bez Biskupů
  rovnou v Křižáka) a zbaví se Pokání.</li>
  <li><b>Tajný hřích (en passant):</b> jako v šachu; Hříšník při něm Pokání nepropadá.</li>
</ul>

<h3>Rychlý tahák</h3>
<div class="cheat">
<ul>
  <li><b>Poutníci</b> táhnou jako jezdci a kají se jako ostatní; zpověď jen u Biskupa. Bez Biskupů se z nich stanou <b>Křižáci</b>.</li>
  <li><b>Křižáci</b> zabíjejí živé figurky bez omezení, ale Hranici odstranit nesmí.</li>
  <li><b>Hranice</b> samy neberou – vidí skrz vlastní figurky a umožňují čisté Upálení na hranici bez Pokání (neplatí pro Hříšníky).</li>
  <li><b>Hranici</b> smí strhnout jen Papež (i bez asistence), Inkvizitor a Biskup – bez ohledu na Pokání.</li>
  <li><b>Ostatní figurky</b> po běžném zabití dostanou žeton Pokání a nesmí brát živé figurky.</li>
  <li><b>Zpověď</b> = stát vodorovně nebo svisle vedle svého zpovědníka na konci vlastního tahu.</li>
  <li><b>Biskup nesmí hřešit nadarmo</b> – hříšný Biskup nemůže být zvolen Papežem!</li>
</ul>
</div>

<h3>Nápověda v aplikaci</h3>
<ul>
  <li>Tečka = tah na volné pole. <span style="color:#e33">Červený kruh</span> = braní s Pokáním.
  <span style="color:#f80">Plamenný kruh</span> = čisté braní (upálení, poprava, křižák, stržení Hranice, tajný hřích).</li>
  <li>Zlatá svatozář v rohu pole = po tomto tahu proběhne zpověď. Koruna = proměna.</li>
  <li>Tlačítko <b>Dosah hranic</b> zvýrazní pole v dosahu tvých Hranic. Ikonou reproduktoru vypneš či zapneš zvuk.</li>
</ul>

<h3>Výklad nejasných míst</h3>
<ul class="note">
  <li>Když figurka sebere a skončí vedle svého zpovědníka, je rozhřešena hned na konci téhož tahu.</li>
  <li>Dosah Hranice se posuzuje v pozici před tahem.</li>
  <li>Kající se Hříšník nesmí brát ani mimochodem. Kající se Biskup smí zpovídat, ale nesmí být zvolen Papežem.</li>
  <li>Hranice neberou nikdy nic, ani soupeřovu Hranici.</li>
  <li>Remíza je možná jen dohodou hráčů.</li>
</ul>
`;
