# Výklad pravidel v aplikaci (Schizma)

Pravidla v PDF nechávají několik míst otevřených. Aplikace je vykládá takto
(vše je v kódu v `js/engine.js` a `ai/rc_engine.py` a pokryto testy v `tests.html`):

1. **Pořadí vyhodnocení tahu:** tah → Pokání / zahájení Inkvizice → proměna (Spása) Pokání ruší →
   zpověď kajících se figurek hráče, který táhl → dokončení Inkvizice u Hranice (Žár) →
   pád Papeže (Konkláve / Anathema) → Křížová výprava → zajetí → Ignis! →
   kontrola, zda má soupeř tah aktivní figurkou (Interdikt).
2. **Zpověď ve stejném tahu:** pokud figurka sebere a skončí vedle svého zpovědníka, je rozhřešena
   hned na konci téhož tahu. Zpovídají se jen figurky hráče, který právě táhl.
3. **Sousedství při zpovědi:** Kardinál zpovídá jen vodorovně a svisle, Papež na všech 8 sousedních
   polích. Kardinál se zpovídá jen u Papeže, Poutník a Misionář u Kardinála i Papeže. Zajatý zpovědník
   nezpovídá; kající se Kardinál v zajetí se ale smí vyzpovídat u volného Papeže.
4. **Žár je vlastností každé Hranice** (1–3, trvalý). Dosah = čtverec o poloměru Žáru, překážky neblokují.
   Hranice se přemisťuje skokem jen na volné pole v tomto čtverci.
5. **Inkvizice:** Inkvizitor bere mimo dosah vlastních Hranic → oběť je natrvalo ze hry a Inkvizitor
   dostane žeton (v kódu pole `pen` u Inkvizitora). S žetonem nesmí brát. Inkvizice se dokončí na konci
   tahu jeho majitele, stojí-li Inkvizitor vedle (i diagonálně) své Hranice. **Sousedí-li se dvěma
   Hranicemi, které ještě mohou růst (Žár < 3), hráč si vybere, kterou rozpálí** – volba je součástí tahu
   (zápis `c4c3>b2`, v aplikaci dialog). Může-li růst jen jedna, rozpálí se ta. Žeton Inkvizice není
   Pokání – zpověď ho neodstraní a proměna Poutníka se k němu nevztahuje.
6. **Kající se figurka nesmí odstranit nic** – ani Upálením. Jedinou výjimkou je **Svedení** (en passant):
   smí ho provést i kající se Poutník, Pokání mu přitom zůstane (nové pravidlo 8.3).
7. **Papež a bezúhonný Kardinál** padnou jen Upálením (v dosahu soupeřovy Hranice); upálit je smí každá
   nekající se figurka kromě Poutníka (i Křižák a Inkvizitor). Kající se Kardinál je běžný cíl.
8. **Křižák** v dosahu Hranice upaluje, mimo něj bere s odpustkem – v obou případech bez Pokání.
9. **Křížová výprava** je trvalý příznak strany. Vyhlásí se, jakmile strana nemá žádného Kardinála
   (i když se poslední stal v Konkláve Papežem, nebo padl jako oběť Inkvizice) nebo žádného Inkvizitora.
10. **Zajetí** se posuzuje v pozici na konci tahu. Zajatý Papež i Kardinál netáhnou a nezpovídají;
    zajatý Kardinál není způsobilý pro Konkláve. Volba nového Papeže je první akcí poražené strany;
    má-li jediného způsobilého Kardinála, zvolí se automaticky.
11. **Interdikt:** hráč na tahu nemá tah žádnou figurkou kromě Hranic → prohrává.
12. **Poutník** smí o 2 pole odkudkoliv, jsou-li obě pole volná; dvojkrok na poslední řadu je Spása
    (pak Svedení neplatí). Proměna jen v Inkvizitora, Kardinála nebo Misionáře/Křižáka.
13. **Ignis!** (povinné varování, dříve Monitum) aplikace zvolá automaticky, když se soupeřův Papež po tahu
    nově ocitne v dosahu Hranic táhnoucího hráče.
14. **Remíza** pravidla nedefinují, proto ji aplikace nevyhlašuje automaticky – jen dohodou hráčů.
