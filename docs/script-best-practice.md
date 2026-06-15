# Script Editor — Best Practices & Design Decisions

> Specifikace chování muzikálového script editoru (SaaS).
> Vychází z ANMT *A Crash Course in Writing Musicals* a z rozhodnutí učiněných během návrhu.
> Princip: **jeden obsah, mnoho views**. Editor drží sémantiku, sazbu řeší export.

---

## 0. Základní principy

1. **Jeden obsah, mnoho views** — Outline, Song spotting, Edit, Cue/Sync view a exporty jsou pohledy nad jednou datovou strukturou.
2. **Sémantika v editoru, sazba v exportu** — co je v editoru dekorace/struktura, se do pagination a page breaků promítá až při exportu. V editoru je plynulý tok.
3. **Vlastní interní specifikace** (serializovatelná do textu).
4. **Computed číslo, stabilní `id`** — pořadová čísla (scény, cues, stránky) se počítají; identita entit je stabilní, aby odkazy nepadaly.
5. **Warningy, ne tvrdé bloky** — kontrola konvencí nesmí blokovat kreativní psaní. Lint upozorňuje, nezakazuje (až na případy, které by porušily integritu dat).

---

## 1. Struktura dokumentu

- Hierarchie **Akt → Scéna** je nadřazená číslování i formátování.
- **Nová scéna = nová strana** (v exportu).
- **Cue nikdy nepřesahuje hranici scény** — ani fallback „do konce scény". Scéna je tvrdá hranice pro spany i číslování.
- Automatické stránkování ve formátu **Akt–Scéna–strana**.

---

## 2. Sémantické bloky

### 2.1 Stage direction
Automatické formátování podle pozice ve scéně:
- **Initial** (první ve scéně): odsazení 3", bez závorek.
- **Subsequent** (následné): 1" z obou stran, v závorkách.

### 2.2 Aside
- Sémanticky vázaný k replice (mezi Character a Dialogue).
- Pokud je to celá věta, editor nabídne **povýšení na Stage direction**.

### 2.3 Lyrics
- Úrovně zanoření (A, B, C) přes `Tab` / `Shift+Tab`.
- Vizualizace struktury písně (AABA) jako `sectionLevel`.

### 2.4 Simultánní zpěv
- Datový model umožňuje seskupení stop (Character + Lyrics) pod sebou.
- Při exportu/renderu se transformuje do **tabulkových sloupců** (dle normy).

### 2.5 Postavy
- Registrace přes `@` ve stage directions → indexace přítomnosti postavy na scéně (i bez repliky).
- Základ pro budoucí kontrolu kapitalizace jmen („HE kisses…").

---

## 3. Cue systém

### 3.1 Mentální model
- **Cue je interval (span), ne bod** — časová vrstva nad textem.
- **Trigger je textová reference**, ne kopie textu.
- **Konec je dramatická akce** (např. *grinding halt*) označená uživatelem, ne neviditelný tag.

### 3.2 Anatomie cue
| Vlastnost | Význam |
|---|---|
| `id` | stabilní identita (drží odkazy) |
| `track` | music / lights / sfx / … (určuje barvu a vlastní lane) |
| `type` | `song` \| `reprise` \| `underscore` \| `incidental` \| `sfx` |
| `duration` | **rozsah** (span) nebo **okamžik** (zero-duration) |
| `status` | `open` (nedokončeno) \| `complete` |
| `start` | inline kotva — bold titul v textu (poslední prvek bloku) |
| `end` | kotva konce — tichá (dekorace na bloku) nebo textová (`##`) |
| `trigger` | text-range odkaz na předchozí blok (zdroj `CUE:` ve score) |
| `songRef` | u reprízy odkaz na původní píseň-entitu |
| `number` | **computed** pořadové číslo v rámci tracku |

### 3.3 Dvě nezávislé osy: typ × trvání
- **Typ** = *co to je* (určuje barvu, ikonu, chování v exportu, jestli má lyrics).
- **Trvání** = *jak dlouho zabírá na lince* (rozsah vs. okamžik).
- Nemíchat! „Single-line" není typ, je to *okamžik*. `underscore` je vždy rozsah; `sfx` bývá okamžik (ale nevynucovat natvrdo).
- Default trvání lze odvodit z typu, uživatel může přepnout.

### 3.4 Single Source of Truth (book ↔ score)
- Dialog v řádku `CUE:` partitury je **generován z triggeru** (odkaz na text).
- Změna textu v knize → partitura se synchronizuje.
- Splňuje pravidlo: text ve score musí být **identický** se scriptem.

### 3.5 Underscoring
- Bloky dialogu uvnitř `underscore` spanu dostanou **odvozený příznak** `underscored` (ne ruční flag).
- Renderer/export je ošetří jako „lyric" (page break, vlastní stránka v integrovaném modu).
- V editoru zůstávají běžně editovatelné.

### 3.6 Pravidla překryvu
- **Mezi tracky: překryv povolen** (smysl oddělených lanes — pod písní zhasne světlo, cinkne telefon).
- **Uvnitř hudebního tracku: překryv zakázán** — jeden klavír, hudba se **řetězí** (segue / attacca / 6 → 6A → 6B), ne paralelně.
- Datově: překryv je vlastnost *mezi* tracky; v rámci tracku jsou cue **disjunktní intervaly**.
- Dva hudební zdroje (orchestr + kapela na jevišti) = **další track**, ne překryv. Dveře otevřené.

### 3.7 Vrstvy (lanes)
- Cue patří do **lane** podle tracku: *Music* (default při psaní knihy), později *Lights*, *SFX*, …
- Vrstvy lze skrýt/zobrazit (vizuální filtr; data i integrita zůstávají).

---

## 4. Interakce v editoru (UI/UX)

### 4.1 Vkládání
- **`#`** v stage direction → inline picker → založení/výběr cue (start).
- **`##`** v stage direction → textová kotva **konce** (navázaná na konkrétní poznámku, např. „Music comes to a grinding halt.").
- Start = **bold titul**, poslední prvek bloku, před ním netučný text („bold = první tón").
- `##` konec **není bold** a **nemusí** být poslední prvek bloku.

### 4.2 Vertikální linka (cue lane)
- Napravo od editoru, jedna linka **na track** (barva = identita tracku).
- Start → **barevný puntík** na řádku bloku.
- Nedokončené cue → linka **přerušovaná + gradient do ztracena** do konce scény.
- Po zadání konce → **plná čára s uzavřeným koncem**, obarvený rozsah.

### 4.3 Stav cue — vizuální kódování
- **Barva = track** (hudba/světla/efekty). Barvu nelze „spotřebovat" na stav.
- **Stav (open/complete) = styl čáry** (přerušovaná vs. plná) **+ gradient do ztracena** u nedokončené.
- Plošná opacity jako jediný nositel stavu **NE** (špatně čitelná u světlých barev).

### 4.4 Nastavení konce
Dvě rovnocenné cesty (objevitelnost + flexibilita):
1. **Tichý konec** — hover na linku → světlé puntíky u řádků + **náhled rozsahu** → klik. Žádný text, jen dekorace na hranici bloku.
2. **Textový konec** — `##` uvnitř stage direction.
3. Alternativa k hoveru: na startovním puntíku menu „Nastavit konec…".

### 4.5 Úpravy přes startovní puntík
- Klik na startovní puntík → panel: přepínač **okamžik / rozsah** + výběr **typu**.
- Přetažení koncového puntíku → posun konce (revalidace nepřekryvu).

### 4.6 Co editor vynucuje
- Bold titul = **poslední prvek bloku** (nový text za titul se posune před něj; titul je „sticky").
- Před bold titulem musí být netučný text.
- Konec < start nesmí persistovat.
- V hudebním tracku: žádné dvě cue na stejné pozici / žádný překryv.

---

## 5. Export (pozdější fáze, dveře otevřené)

- **Žádné „cue na nové stránce" v editoru** — čistě export concern.
- Pagination pravidla: book → lyric → music, page breaky.
- **Exportní profily**: Working Draft, Reading, Producer Submission.
- Patička s **datem draftu** (navázaná na checkpointy/verze).
- **Musical Numbers** tabulka do front matter (generovaná z cue listu).

---

## 6. User Stories

Formát: *chci → udělám → na pozadí*.

### Epic A — Založení cue
- **A1 Hudební cue (píseň):** `#` → picker → titul. Vznik `Cue {track: music, type: song, duration: range, status: open}`, bold titul na konec bloku, puntík na lince, přerušovaná linka do konce scény, computed číslo, uložení triggeru (předchozí blok).
- **A2 Jiný track (světlo/SFX):** `#` → přepnout track. Jako A1, ale jiná barva + vlastní lane; číslování per track.
- **A3 Okamžik (SFX cinknutí):** `#` → typ `sfx` → trvání `instant`, `status: complete` rovnou, jen puntík, žádný warning o konci.
- **A4 Repríza:** `#` → vyber existující píseň → „Reprise". Nové cue, `type: reprise`, `songRef` na originál, titul „<Titul> – Reprise".

### Epic B — Ukončení cue
- **B1 Tichý konec:** hover na linku → náhled → klik. End kotva na hranici bloku, `status: complete`, plná čára.
- **B2 Textový konec:** `##` v stage direction; při více otevřených cue dotaz „konec čeho".
- **B3 Fallback (do konce scény):** neuzavřu. `status: open`, přerušovaná/vybledlá, tichý warning. Export = do konce scény.
- **B4 Nové hudební cue bez zavření předchozího:** `#`. **Auto-close** předchozího těsně před startem + toast „Předchozí cue uzavřeno zde – upravit?". Napříč tracky se nezavírá nic.

### Epic C — Úpravy a typy
- **C1 Změna typu:** klik na puntík → osa typ. Přepočet barvy/ikony/exportu; `underscore` vynutí rozsah.
- **C2 Přepnutí okamžik ↔ rozsah:** přepínač na puntíku. Okamžik→rozsah nastaví `open`; rozsah→okamžik zahodí end kotvu.
- **C3 Underscored dialogue:** píšu dialog uvnitř `underscore` spanu → odvozený `underscored` → export jako lyric.
- **C4 Posun konce:** drag koncového puntíku nebo přepis `##`. Revalidace nepřekryvu.

### Epic D — Struktura, číslování, integrita
- **D1 Přesun scény:** čísla cues computed → přečíslování; stabilní `id` drží odkazy.
- **D2 Skupina 6/6A/6B:** výběr → „seskupit". Validace: všechny ve stejné scéně.
- **D3 Lint:** chybějící konec, bold titul není poslední, chybí netučný text před titulem, skupina přesahuje scénu, hudební překryv — vše jako nenápadné warningy.

### Epic E — Vrstvy a views
- **E1 Zapnout/vypnout vrstvu:** filtr vykreslení; data zůstávají. Default při psaní: jen Music.
- **E2 Skladatelský sync view (`CUE:`):** pro každé cue aktuální `CUE:` text z triggeru + příznak „změněno od verze X".
- **E3 Cue list napříč show:** computed tabulka (číslo, titul, track, typ, scéna, status) → základ Musical Numbers.

### Epic F — Export
- **F1 Profily:** dekorace z editoru → pagination pravidla; v editoru plynulý tok.

---

## 7. Edge Cases

Formát: *situace → chování editoru → pozadí/proč*.

### 7.1 Mazání bloků s cue
- **EC1 Smazání bloku se startem** = smazání celé cue (start = identita). Potvrzení; kaskáda + přečíslování; reprise viz EC15.
- **EC2 Smazání bloku s tichým koncem** → cue zpět na `open` + warning, nepadá.
- **EC3 Smazání stage direction s `##`** → jako EC2 (kotva uvolněna).
- **EC4 Smazání bloku uvnitř spanu** → span se zkrátí, kotvy drží; přepočet `underscored`.

### 7.2 Scény
- **EC5 Smazání scény s kompletním cue** → smaže i cues (potvrzení s výpisem), přečíslování.
- **EC6 Cue z fallbacku** → cue je vždy ohraničené scénou; nikdy nepřesáhne hranici. Smazání scény smaže i cue.
- **EC7 Přesun scény mezi akty** → přečíslování cue i stránek; stabilní `id` drží odkazy; pozor na EC12.
- **EC8 Split scény uprostřed spanu** → detekovat protnuté cue, nabídnout *ukončit na konci první scény* (default) nebo *přesunout celé do druhé*. Nikdy tiše přes hranici.

### 7.3 Anchoring a editace textu
- **EC9 Smazání jen znaků `#`/`##`** → kotva žije dál (znak je trigger vzniku, ne perzistence). Start (bold titul) je viditelná reprezentace → smazání = EC1. Konec: viditelný end marker pro cílené zrušení.
- **EC10 Text za bold titul** → auto-posun textu před titul (titul sticky na konci).
- **EC11 Enter v bloku se startem** → titul drží na konci; Enter před titul → titul jde do nového bloku i s kotvou.

### 7.4 Číslování a skupiny
- **EC12 Rozpad skupiny přes scény** → auto-rozpuštění (6B vlastní číslo) + warning.
- **EC13 Vložení cue doprostřed řady** → přečíslování (computed). Ve views ukázat i stabilní `id`/titul (lidská paměť na čísla).
- **EC14 Dvě cue na stejném řádku v hudebním tracku** → odmítnout s vysvětlením (jeden klavír).

### 7.5 Reprise
- **EC15 Smazání originálu s referencemi** → varování + volby: *povýšit první reprízu na originál* (default) / *smazat reprízy* / *zrušit*.
- **EC16 Repríza dřív než originál** → warning (dramaturgicky chyba), ale nezakazovat.

### 7.6 Underscore / odvozené příznaky
- **EC17 Změna `underscore` → `song` s dialogy uvnitř** → dialogy ztratí `underscored`; ukázat náhled dopadu („3 dialogy se přestanou sázet jako lyric").
- **EC18 `underscore` bez textu uvnitř** → legitimní instrumentální podkres, žádný warning.

### 7.7 Undo / redo
- **EC19 Undo po vytvoření cue** → jedna atomická transakce (entita + kotva + dekorace + číslo) se vrátí celá.
- **EC20 Undo po auto-close** → auto-close je součást téže transakce → vrací se konzistentně.
- **EC21 Redo posunu + mezitím editace** → kotvy **relativní** (mark/decoration mapování), ne absolutní offsety.

### 7.8 Copy / paste
- **EC22 Kopie bloku se startem** → paste **nevytvoří duplikát cue**; vloží se jen plain text titulu. (Pokročilá alternativa: „vložit jako nové cue" s novým `id`.)
- **EC23 Duplikace celé scény s cues** → klony s novými `id` a číslováním; reprise: uvnitř kopie přepojit na klon, mimo ponechat na originál. Explicitně ošetřit.

### 7.9 Mezitrackové situace
- **EC24 Stejný řádek = start hudby i světla** → legitimní, dvě linky/barvy, žádný konflikt.
- **EC25 `##` při více otevřených cue** → dialog vypíše **všechna** otevřená cue (i ve skrytých vrstvách) s označením tracku.
- **EC26 Vypnutí vrstvy s nedokončeným cue** → warning zůstává v panelu problémů (integrita se kontroluje i u skrytých vrstev).

### 7.10 Degenerované stavy
- **EC27 Start i konec ve stejném bloku** → nabídnout „přepnout na okamžikové cue?".
- **EC28 Konec před startem** → nevalidní; drag se zastaví na startu, nikdy nepersistovat.
- **EC29 Cue v prázdné scéně (kotvy zůstaly)** → bez startu = EC1; prázdný blok s bold titulem = legitimní rozepsané cue, jen warning „chybí konec".

---

## 8. Tři principy, které řeší většinu edge cases

1. **Start = identita cue** (smazání startu = smazání cue, po potvrzení); **konec = uvolnitelná kotva** (smazání = degradace na `open`, ne pád).
2. **Kotvy jsou relativní** (mark/decoration mapování přes TipTap transakce), ne absolutní offsety → řeší undo/redo, paste, editaci kolem.
3. **Číslo je computed, `id` je stabilní** → řeší přesuny, vkládání, reprise odkazy. Ve views ukazovat i stabilní identitu, ne jen pořadové číslo.

---

## 9. Otevřené / odložené (dveře nechané otevřené)

- Plný datový model (JSON) bloků, cue-spanů a paginace kompatibilní s TipTap.
- Stavový automat vkládání cue (`#` → open → `##`/puntík → complete + auto-close).
- Akceptační kritéria (Given/When/Then) pro rizikové edge cases (EC1, EC8, EC15, EC22/23).
- Další lanes (Lights, SFX) jako plnohodnotné tracky.
- Více hudebních zdrojů (orchestr + jevištní kapela) jako oddělené music tracky.
