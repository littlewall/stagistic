# Writing your script: obsah a ověření

Schválený rozsah: `docs/proposals/editor-documentation-writing.md`.

## Výsledek

- Rozcestník `/editor/writing/` a šest úkolových návodů: `blocks`, `flow`, `dialogue`, `stage-directions`, `formatting`, `shortcuts`.
- Samostatná plochá skupina sidebaru Writing your script, kompatibilní s mobilní navigací Lucode.
- Jednotný příklad s Robinem a Alexem; odkazy na již napsané návody Characters.
- Bílé klávesy, podbarvené ukázky vstupu a skutečné ikony formátování i prázdného výběru typů s tenkým tahem.
- Hudba, struktura a tisk zůstávají ve svých kategoriích; připravované články nejsou vydávány za hotové.

## Praktické ověření

Na samostatném lokálním originu `http://localhost:5180/` byl vytvořen zkušební scénář **Documentation writing pilot**, ID `01a11142-fa16-7434-921a-e829cfb30c4c`. Ověřen byl tento průchod:

1. Prázdný Scene: Enter otevře výběr Scene / Stage direction / Character, Escape výběr zavře.
2. Vyplněný Scene pokračuje do Stage direction; vyplněný Stage direction do Character podle výchozího nastavení.
3. Dva stisky Tab přidají dvě úrovně odsazení; Shift + Tab je odstraní.
4. V prázdném Character výběr jiného typu šipkou vlevo a Enter změní existující prázdný blok na Stage direction.
5. Toolbar Change block type nabízí skutečné názvy a číselné zkratky. Volba Character umožní napsat Robin a pokračovat Dialogue.
6. Dialogue `We should go.` → Shift + Enter → Tab → Aside `quietly` → Enter → Dialogue `Before they find us.` → Enter → Character `ALEX` → Dialogue `Give me a moment.`.
7. Vybraný text lze kombinovaně zvýraznit Bold, Italic a Underline; tlačítka používají příslušné skutečné ikony.
8. Uvnitř Dialogue je `Before they find us.` rozděleno na `Before they ` a `find us.`; oba bloky zůstávají Dialogue.
9. Číselná zkratka Control + 5 na macOS mění blok na Dialogue.

Při automatizaci přes sdílený browser musí čtení polohy kurzoru a navazující Enter proběhnout v oddělených voláních po synchronizaci DOM výběru do editoru. Bez ní rychlá dávka šipek a Enter může pracovat se starou polohou. Finální ověření rozdělení proběhlo s tímto odstupem.

Výchozí přechody, nastavitelná přiřazení a varianty prázdných bloků byly také zkontrolovány v implementaci. Windows/Linux modifikátory, cyklování a přepnutí Option + Tab byly ověřeny podle zdrojů, nikoli prohlášeny za prakticky ověřené na všech platformách. Příkazy pro převod scén nebyly ve zkušebním dokumentu provedeny.

## Kontroly dokumentace

- `moon run docs:lint`: prošel.
- `moon run docs:typecheck`: prošel, bez chyb a varování.
- `moon run docs:build`: prošel; 25 stránek včetně aktualizovaného Pagefind indexu. Stávající varování o kolizi vlastní 404 zůstává.
- Vygenerované HTML: 1467 místních odkazů na stránky a soubory, 184 odkazů na nadpisy; žádný chybějící cíl.
- Mobilní šířka 390px: přímé otevření návodu, navigace přes Menu na Write dialogue and asides, tabulky se zkratkami bez vodorovného přetečení celé stránky.
- Nezávislá obsahová kontrola: žádné blokující nálezy; potvrzena shoda postupů s nastavenými výchozími hodnotami a obsluhou kláves.
- `graphify update .`: dokončen po změně navigace.

Bez commitu a bez nasazení. První verze obsahu je připravena k redakční kontrole.

## Doplnění úpravy flow

Uživatel následně odsouhlasil návod `customize-flow` přímo v Writing your script. Kategorie nyní má sedm článků. Continue writing, Keyboard shortcuts, rozcestník a Getting started odkazují na konkrétní nastavení; Getting started také stručně vysvětluje vstup do Script settings. Samostatná kategorie nastavení nevznikla.

Na stejném zkušebním scénáři bylo prakticky ověřeno:

- Open script settings → Block settings → Dialogue.
- Změna Next element z Character na Dialogue, automatické použití a uložení nastavení.
- Enter za vyplněným Dialogue vytvoří další Dialogue.
- Změna Shortcut z 5 na 6; Control + 6 na macOS volí Dialogue a toolbar ukazuje ⌃6.
- Po opětovném otevření nastavení zůstávají nové hodnoty a objeví se Reset. Reset byl aktivován; přesný rozsah obnovení všech polí je ověřen podle implementace `resetBlockSettings`, která odstraňuje celou konfiguraci daného typu. Závěrečné čtení polí po Reset bylo přerušeno převzetím browseru uživatelem.

V `ScriptSettingsModalProvider.tsx` byl opraven popisek macOS zkratky Option → Control, aby odpovídal již existující obsluze kláves a toolbaru. Nový popisek byl ověřen v dialogu. Ovládání kláves se neměnilo.

`docs:lint`, `docs:typecheck` a `docs:build` prošly. Výstup má 26 stránek, 1591 platných lokálních odkazů na stránky a soubory a 199 platných odkazů na nadpisy. Nezávislá kontrola nového článku a souvisejících změn nenašla chyby. `app-routes:typecheck` prošel; první lint běh nalezl již existující nepoužitý catch parametr v čistém `useExportPreview.ts:89`. Izolovaný worker odstranil pouze parametr (`catch (error)` → `catch`), následný `app-routes:lint` prošel. `graphify update .` byl zopakován po obou drobných změnách aplikace.
