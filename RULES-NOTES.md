# Výklad pravidel v aplikaci (Schizma)

Pravidla v PDF nechávají několik míst otevřených. Aplikace je vykládá takto
(vše je v kódu v `js/engine.js` a pokryto testy v `tests.html`):

1. **Pořadí vyhodnocení tahu:** tah → případné Pokání → proměna (Spása) Pokání ruší →
   Žár (inkvizice zvýší, ztráta posledního Inkvizitora vynuluje) → zpověď všech kajících se
   figurek hráče, který táhl → pád Papeže (Konkláve / Anathema) → Křížová výprava →
   Monitum → kontrola, zda má soupeř nějaký legální tah (Interdikt).
2. **Zpověď ve stejném tahu:** pokud figurka sebere a skončí vedle svého zpovědníka,
   je rozhřešena hned na konci téhož tahu. Zpovídají se jen figurky hráče, který právě táhl.
3. **Sousedství při zpovědi:** Kardinál zpovídá jen vodorovně a svisle, Papež na všech 8
   sousedních polích. Kardinál se zpovídá jen u Papeže, ostatní u Kardinála i Papeže.
   Kající se Kardinál zpovídat smí, ale nesmí být zvolen Papežem.
4. **Dosah Hranice** = čtverec o poloměru úrovně Žáru kolem Hranice (1 → 3×3, 2 → 5×5, 3 → 7×7);
   překážky ho neblokují. Hranice se přemisťuje skokem jen na volné pole v tomto čtverci.
5. **Žár** = počet inkvizic (odstranění soupeřovy figurky Inkvizitorem – i s Pokáním, i Upálením);
   úroveň 2 od 1 inkvizice, úroveň 3 od 3 inkvizic. Počítadlo se zastaví na 3. Proměna Hříšníka,
   který bere a stává se Inkvizitorem, se jako inkvizice nepočítá (bral Hříšník).
6. **Kající se figurka nesmí odstranit nic** – ani Upálením, ani mimochodem.
7. **Papež** bere jen Upálením (cíl v dosahu vlastní Hranice) a nikdy nepropadá Pokání. Padne jen
   Upálením: musí stát v dosahu soupeřovy Hranice; Hříšník ho neodstraní nikdy. To platí i pro Křižáka.
8. **Křižák** v dosahu Hranice upaluje, mimo něj bere s odpustkem – v obou případech bez Pokání.
9. **Křížová výprava** je trvalý příznak strany. Vyhlásí se, jakmile strana nemá žádného Kardinála –
   i když se poslední Kardinál stal v Konkláve Papežem. Proměna v jezdce pak dává vždy Křižáka.
10. **Konkláve:** když padne Papež, nového volí poražená strana na začátku svého tahu
    (je to její první akce). Má-li jen jednoho čistého Kardinála, zvolí se automaticky.
11. **Hříšník** smí o 2 pole odkudkoliv, jsou-li obě pole volná; dvojkrok na poslední řadu je Spása
    (pak Tajný hřích neplatí). Proměna jen v Inkvizitora, Kardinála nebo Misionáře/Křižáka.
12. **Monitum** aplikace zvolá automaticky, když se soupeřův Papež po tahu nově ocitne v dosahu
    Hranic táhnoucího hráče. Papež v dosahu soupeřovy Hranice má na desce pulzující varovný kruh.
13. **Remíza** pravidla nedefinují, proto ji aplikace nevyhlašuje automaticky – jen dohodou hráčů.
    Kdo nemá na začátku svého tahu žádný legální tah, prohrává (Interdikt).
