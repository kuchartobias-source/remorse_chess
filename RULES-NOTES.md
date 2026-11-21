# Výklad pravidel v aplikaci

Pravidla v PDF nechávají několik míst otevřených. Aplikace je vykládá takto
(vše je v kódu v `js/engine.js` a pokryto testy v `tests.html`):

1. **Pořadí vyhodnocení tahu:** tah → případné Pokání → proměna (Spása) Pokání ruší →
   zpověď všech kajících se figurek hráče, který táhl → Konkláve / Zatracení →
   křížová výprava (strana bez Biskupů) → kontrola, zda má soupeř nějaký legální tah.
2. **Zpověď ve stejném tahu:** pokud figurka sebere a skončí kardinálně vedle svého
   zpovědníka, je rozhřešena hned na konci téhož tahu.
3. **Zpověď jen na konci vlastního tahu:** zpovídají se jen figurky hráče, který právě táhl.
4. **Dosah Hranice** = řada a sloupec Hranice v pozici *před* tahem. Vlastní figurky výhled
   neblokují; zastaví ho první soupeřova figurka (ta je ještě v dosahu).
5. **Kající se Hříšník nesmí brát ani mimochodem.** Výjimka pro Tajný hřích říká jen, že
   en passant Pokání nezpůsobuje.
6. **Kající se Biskup zpovídat smí**, ale nesmí být zvolen Papežem.
7. **Hranice (věž) nebere nikdy nic**, ani soupeřovu Hranici. Poutník, Křižák a Hříšník Hranici
   odstranit nesmí.
8. **Papež** bere živou figurku (i soupeřova Papeže) jen tehdy, když je cílové pole v dosahu
   jeho Hranice; Pokání nikdy nepropadá. Soupeřovu Hranici smí strhnout sám.
9. **Kající se Inkvizitor / Biskup / Poutník nesmí brát živé figurky ani upálením na hranici**;
   Inkvizitor a Biskup smí strhnout soupeřovu Hranici.
10. **Poutníci (jezdci)** podléhají Pokání a zpovídají se jen u Biskupa. Jakmile strana nemá žádného
    Biskupa, všichni její Poutníci se natrvalo stanou Křižáky a zbaví se Pokání. Křižáky zůstanou,
    i když strana později získá nového Biskupa; proměna Hříšníka v jezdce dá Poutníka, nebo rovnou
    Křižáka, pokud strana v tu chvíli Biskupa nemá.
11. **Konkláve:** když padne Papež, nového volí poražená strana na začátku svého tahu
    (je to její první akce). Má-li jen jednoho čistého Biskupa, zvolí se automaticky.
12. **Azyl (rošáda)** jako v klasickém šachu, jen bez podmínek týkajících se šachu.
    Nový Papež Azyl provést nesmí.
13. **Remíza** pravidla nedefinují, proto ji aplikace nevyhlašuje automaticky – jen dohodou
    hráčů. Kdo nemá na začátku svého tahu žádný legální tah, prohrává.
