# Syntax — návrh technické reference

Stav: schváleno 14. října 2026 s upřesněním čtenáře: implementátoři formátu v jiných nástrojích a nadšenci do text-only editorů. Overview, sedm kapitol, úplný příklad a tabulka značek jsou připravené. Balení souborů má pouze stručný hraniční odkaz do Editoru. Ověření je v `docs/superpowers/plans/2026-10-14-syntax-reference-documentation.md`; na tuto vlnu naváže krátký obsah LP.

## Účel a čtenář

Syntax popisuje textový formát `.stagistic` pro implementátory do jiných nástrojů a nadšence do text-only editorů. Čtenář má najít konkrétní pravidlo, jeho kontext, platný příklad a podmínky jeho interpretace. Pravidla budou srozumitelná bez znalosti interního modelu editoru Stagistic.

Zůstává samostatnou skupinou vedle Editoru. Uživatelské psaní v aplikaci má své návody; na ty Syntax odkáže tam, kde je čtenář hledá. U Syntax nepředpokládáme, že uživatel editoru bude soubory ručně zapisovat.

Referenci postavíme na aktuálním podporovaném chování formátu. Nebudeme z ní odvozovat neexistující veřejné API nebo slib budoucí integrace.

## Doporučený formát

Rozcestník `/syntax/` představí formát a nabídne tři vstupy:

- **Format reference:** pravidla podle oblasti formátu.
- **Complete example:** souvislý platný soubor s odkazy k použitým pravidlům.
- **Marker reference:** rychlé dohledání zápisu a významu znaku v daném kontextu.

Každá kapitola reference má stejnou vnitřní strukturu:

1. Co zápis reprezentuje a kde platí.
2. Základní forma a krátký platný příklad.
3. Pravidla rozpoznání a význam výsledku.
4. Varianty, kolize a omezení.
5. Související pravidla a případný odkaz do Editoru.

Použijeme tabulky, stručné odstavce a celé ukázky souboru nebo řádků. Stejný znak může mít více významů podle místa a stavu čtení; tato závislost musí být přímo u pravidla. Rozcestníky a reference zůstanou v existujícím systému Starlight/Lucode.

## Navržené stránky

| Stránka | Obsah | URL |
| --- | --- | --- |
| File model and interpretation | Účel `.stagistic`, rozdělení na frontmatter a tělo, význam řádků a prázdných řádků, kontext rozpoznávání a souhrn typů bloků. Také hranice textového souboru vůči `.stepkg`, normalizace při exportu/importu a rozsah zachovaných dat. | `/syntax/reference/` |
| Frontmatter | Umístění a delimitery, podporovaná pole a jejich typy, titul, credits, datum a ostatní údaje titulní strany. Volitelná a prázdná data, uvozování hodnot a chybové případy podle aktuálního zpracování. | `/syntax/reference/frontmatter/` |
| Acts and scenes | Zápis nadpisů, interpretace `#` a `##`, scénář bez aktů a s akty. Rozpoznání struktury v souboru a způsob, jakým ji zapisuje serializace. | `/syntax/reference/structure/` |
| Cues, dialogue and asides | Rozpoznání mluvčího, vynucený cue přes `@`, názvy v uvozovkách, společné cue s `/`, zápis cue a řeči na jednom řádku, Aside a pokračování promluvy. Vazba na rozpoznání Dialogue/Lyrics a oddělení promluv. | `/syntax/reference/speech/` |
| Stage directions and notes | Samostatná scénická akce, vynucení přes `!`, reference postavy uvnitř akce, parentetický text podle kontextu a autorské poznámky `[[ ... ]]`. Rozdíl mezi referencí postavy a cue na začátku bloku. | `/syntax/reference/directions/` |
| Music and lyrics | Zápis hudebních značek `@@music` a `@@out`, čísla a názvy, vyhodnocení hudebních úseků a Hitů podle podporovaného chování. Lyrics, tabulátorové úrovně, `~` a pokračování promluvy. | `/syntax/reference/music/` |
| Inline text and literals | `*`, `**`, `_`, kombinace podporovaných značek, uvozované názvy a jejich escapování. Rozdíl mezi doslovným textem a znakem, který aktivuje pravidlo; konkrétní rozsah podporovaného escapování. | `/syntax/reference/text/` |
| Complete example | Jeden celý soubor od frontmatter po poslední scénu, s krátkým rozborem použitých částí. Zachováme příběh `When Night Falls` ze současné stránky a upravíme jej podle ověření parserem. | `/syntax/examples/` |
| Marker reference | Stručná tabulka znak / kontext / význam / příklad / odkaz na podrobné pravidlo. Bude zahrnovat také bílé místo, tabulátory a `~`, nikoli jen viditelné prefixy. | `/syntax/markers/` |

Celkem sedm kapitol reference a dvě podpůrné stránky. Stávající `/syntax/reference/` se stane vstupní kapitolou, takže jeho URL zůstává použitelné.

## Sidebar a navigace

Zachováme dvě ploché skupiny s okamžitými odkazy, které podporuje mobilní drawer theme:

- **Format reference:** Syntax overview a sedm kapitol.
- **Examples and lookup:** Complete example a Marker reference.

Hlavička nadále nabízí přímý vstup do Syntax vedle Editoru. Značky v rychlé tabulce odkazují na konkrétní kapitolu či nadpis; úplný příklad odkazuje na pravidla, která v něm čtenář vidí.

## Co převezmeme ze současné stránky

| Současná část LP | Místo v docs |
| --- | --- |
| The core idea | Syntax overview a File model and interpretation |
| Frontmatter | Frontmatter |
| Acts & scenes | Acts and scenes |
| Cues & dialogue, Asides | Cues, dialogue and asides |
| Stage directions | Stage directions and notes |
| Music, Lyrics, Soft breaks | Music and lyrics, s odkazy na promluvy |
| Quoting, Inline marks | Inline text and literals; příslušné kapitoly používají stejné pravidlo |
| Full example | Complete example |
| Marker reference | Marker reference |

Přesun doplní pravidla, která současný stručný popis nevyjadřuje dost přesně. Především interpretaci nadpisů bez aktů, závislost významu na kontextu a hranice importu/serializace. Přitom zachová všechny dosavadní tematické oblasti.

## Důležité hranice reference

- **Formát souboru a vstup editoru:** spouštěcí znak nebo ovládání v editoru nemusí být znakem v souboru. Hudební pill v UI a `@@music` v textovém formátu potřebují vlastní popis.
- **Kontext:** velká písmena, parentetický řádek nebo `@` nelze popsat jedním pravidlem bez informace o tom, kde se nacházejí. Příklady ukážou potřebné sousední řádky.
- **Struktura:** aktuální parser určuje režim aktů podle přítomnosti nadpisu s `##`. `#` proto není ve všech souborech automaticky akt. Pravidlo popíšeme spolu se zápisem One-act a Multi-act.
- **Úplnost dat:** stručně vymezíme, že textový formát není záloha všech dat aplikace. Balení, přenos a `.stepkg` odkážeme do dokumentace Editoru; vlastní reference se věnuje textu a jeho interpretaci.
- **Normalizace:** import a export mohou zachovat význam podporovaného zápisu bez zachování původních bajtů, mezer nebo všech interních identifikátorů. Žádnou širší garanci round-trip nevyslovíme bez ověření.
- **Ověřené versus plánované:** kapitoly popíšou aktuálně podporovaná pravidla. Návrhy rozšíření nedostanou stejné označení jako fungující syntax.
- **Chyby:** uvedeme doložené neplatné formy a dostupný kontext chyby. Nevytvoříme neexistující kódy chyb ani stabilní validační API.

## Ukázky a jejich ověřování

Krátké příklady mají dokládat konkrétní pravidlo. U kontextových pravidel uvedeme celý potřebný úsek, nejen vytržený řádek. Samostatně ukážeme zápis bez aktů a s akty.

Při psaní ověříme příklady aktuálním parserem a serializací. Posoudíme výsledné typy bloků, značky a metadata, nejen to, že parser nevyhodí výjimku. Výstup serializace popíšeme podle skutečně generované formy; alternativy přípustné při importu nebudeme automaticky označovat jako standardní exportní zápis.

Technická reference nemusí používat klávesové pills pro samotné znaky formátu: znaky a soubory se zobrazí jako kód. Pokud bude opravdu potřeba popsat stisk klávesy v aplikaci, platí již domluvené bílé `kbd` se symbolem a názvem.

## Návaznost na LP

Po připravení úplné reference upravíme původní LP stránku na domluvený krátký úvod: co je Stagistic Syntax, proč vznikla, několik konkrétních příkladů rozdílů oproti Fountain a přímý odkaz do docs. Původní LP URL zůstane zachované.

Porovnání s Fountain bude samostatná redakční práce nad ověřenými pravidly obou formátů. V této referenci nevytvoříme nedoložené tvrzení, že jiný formát určitou funkci vůbec neumí, ani obecný konkurenční přehled.

## Zdrojové body

- `apps/landing/src/data/syntaxGuide.ts`
- `apps/landing/src/components/syntax-guide/`
- `apps/landing/src/pages/editor/syntax.astro`
- `packages/script/src/parsing/parseStagistic.ts`
- `packages/script/src/parsing/frontmatter.ts`
- `packages/script/src/parsing/inline.ts`
- `packages/script/src/parsing/literals.ts`
- `packages/script/src/parsing/resolveMusicModes.ts`
- `packages/script/src/parsing/types.ts`
- `packages/script/src/serialization/serializeStagistic.ts`
- `packages/script/src/serialization/serializeInline.ts`
- `packages/script/src/serialization/frontmatter.ts`
- `packages/script/src/syntax/lineDetection.ts`
- Existující testy parseru a serializace; hranice přenosného balíčku v implementaci `.stepkg`.

## Ověřené upřesnění při psaní

- Reference uvádí pořadí rozpoznávání v řeči i mimo ni. Prázdný řádek ukončí řeč; `~` ji ponechá. Prefixy nadpisu a vynucené akce musí začínat v prvním sloupci.
- Význam `#` závisí na předběžném hledání raw `##` řádků. Hlavní příklad používá akt a scénu; kapitola struktury ověřuje také samotné scény.
- Frontmatter má sedm podporovaných klíčů. Null celé frontmatter i credits je přijaté; ostatní nepovolené skaláry/klíče jsou vysvětlené. Datum se kontroluje podle tvaru, nikoli kalendářní platnosti.
- Rozpoznání dvojtečky aktuálně spolehlivě nechrání uvozované cue názvy. Toto omezení je uvedené přímo u inline cue a provázané s tabulkami i kapitolou literálů.
- Při ověření byly doložené limity zpětného zápisu: uppercase Dialogue z inline cue, doslovné znaky důrazu, Hit uvnitř pokračující řeči a opětovné tokenizování dekódovaných cue názvů. Dokumentace neslibuje všeobecný round-trip.
- Hity vycházejí ze sousedních parsovaných bloků. Běžná validace otevřených čísel a tolerantní Hit větev jsou odlišené; doporučený výstup používá kladná jedinečná čísla.
- Všech 22 publikovaných textových ukázek bylo spuštěno parserem a porovnáno s ručně stanoveným pořadím typů bloků. Úplný příklad má 18 bloků a ověřené metadata, reference, tabulátor i hudební režim.

## Další krok

Redakčně projít technickou referenci. Potom připravit krátký úvod LP s motivací, ověřenými rozdíly oproti Fountain a odkazem do docs.
