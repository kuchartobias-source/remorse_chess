# Schizma

Online hra šachové varianty **Schizma** – dva papežové, jen jedna pravá víra. Pokání, zpověď,
Žár Hranic, upalování na hranici, Ignis!, konkláve a křížové výpravy.

**Hrát:** https://kuchartobias-source.github.io/remorse_chess/

Původní nápad na tuto šachovou variantu (Remorse Chess) má [@bardelo_bardalini](https://www.instagram.com/bardelo_bardalini/) na Instagramu.

## Jak hrát ve dvou

1. Na úvodní stránce zvol barvu a klikni na **Založit online hru**.
2. Zkopíruj odkaz z panelu **Pozvi soupeře** a pošli ho soupeři.
3. Soupeř odkaz otevře, klikne na **Hrát za …** a můžete hrát. Každý hraje na svém zařízení.

Rozehranou hru lze kdykoliv znovu otevřít stejným odkazem (aplikace si pamatuje, za kterou barvu hraješ).
V online hře je i **chat** (s rychlými frázemi). K dispozici je také režim **Na jednom zařízení**
a **Proti stroji** – soupeřem je neuronová síť, která se hru učí sama hraním proti sobě
(čtyři úrovně: Misionář, Kardinál, Inkvizitor, Papež – hledají 1 až 4 půltahy dopředu; výpočet běží přímo v prohlížeči). Dokud není síť pro
Schizma hotová, hraje průběžně natrénovaná verze.

## Technika

- Čistý HTML/CSS/JavaScript bez buildu, hostováno na GitHub Pages.
- Pravidla: `js/engine.js` (bez závislostí), testy v `tests.html` (otevři v prohlížeči přes lokální server,
  např. `python -m http.server`).
- Tahy mezi hráči putují přes veřejný relay [ntfy.sh](https://ntfy.sh) – posílají se jen tahy, barva hráče a zprávy z chatu
  pod náhodným 12znakovým názvem místnosti, žádná jména ani osobní údaje. Server zprávy drží asi 12 hodin;
  rozehraná partie je navíc uložená v prohlížeči obou hráčů. Bezplatný limit ntfy.sh je 250 zpráv denně na IP adresu (počítají se tahy i zprávy v chatu).
- Výklad nejasných míst pravidel je v [RULES-NOTES.md](RULES-NOTES.md).
- Síť pro hru proti stroji: `model/net.bin` (MLP 1826 → 192 → 64 → 1, váhy float32; vstup zahrnuje i pole v dosahu Hranic) a `js/ai.js`
  (kódování pozice včetně úrovně Žáru, hodnocení, prohledávání 1–2 půltahů); počítá se ve Web Workeru.

Grafika figurek i animace jsou vlastní tvorba (SVG + CSS). Zvukové efekty se syntetizují přímo
v prohlížeči (WebAudio). Hudba na pozadí je vlastní instrumentální skladba v dórském modu na D, kterou hrají skutečné
nahrávky nástrojů z VCSL (CC0) v dozvuku kamenné lodi chrámu: antifona, hymnus, estampie (tanec),
verše, organum, žalozpěv a mezihra se střídají v náhodném pořadí. Po vyhlášení Křížové výpravy hudba
přejde do válečné nálady (bubny, fanfáry, válečný hymnus) a pád Papeže doprovodí znělka Konkláve.
Nahrávky se stahují hned při načtení stránky; prohlížeč zvuk obvykle pustí až po prvním kliknutí.
Podrobnosti a licence: [music/CREDITS.md](music/CREDITS.md). Zapíná a vypíná se ikonou noty.

Předchozí varianta (Kajícné šachy) je dostupná v historii repozitáře.
