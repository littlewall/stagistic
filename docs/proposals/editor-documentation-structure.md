# Uživatelská dokumentace — návrh kategorizace

Návrh k revizi. Aplikace `apps/docs` obsahuje úvod a rozcestníky těchto oblastí. Podrobné články zatím nejsou napsané ani vystavené jako prázdné odkazy. Veřejné názvy jsou prozatím anglické, podle současného webu a editoru; tento návrh je český.

## Základní rozdělení

| Část | Pro koho a k čemu |
| --- | --- |
| **Editor** — uživatelská příručka aplikace | Pro autora, který píše, upravuje a odevzdává scénář v editoru. |
| **Syntax** — technická reference formátu | Pro práci s textovým formátem, převody a budoucími integracemi. |

Úvod `/` je společný rozcestník na dvě rovnocenné sekce: `/editor/` a `/syntax/`. Obě mají vlastní úvodní splash stránku, podrouty a oddělenou navigaci. Odkazy Editor a Syntax jsou trvale v hlavičce; vyhledávání je společné. Začátky práce v aplikaci patří na `/editor/getting-started/`. Znalost syntaxe se nepředpokládá. Další aplikace později získá vlastní sekci vedle Editoru.

## Kategorie a plánované články

Kategorie odpovídají práci autora. „Nastavení“, „Zkratky“ a „FAQ“ netvoří oddělené zásobníky informací: konkrétní nastavení a nejasnosti patří k činnosti, kterou ovlivňují. Krátký přehled zkratek bude pouze druhou cestou k témuž vysvětlení.

### 1. Začínáme — Getting started

Vstup `/editor/getting-started/`. První kontakt s editorem a základní způsob práce, bez podrobného vysvětlování všech panelů.

| Článek | Navržená URL | Rozsah |
| --- | --- | --- |
| Orientace v editoru | `/editor/getting-started/workspace/` | Dokument, toolbar, postranní panely, stavový řádek; kde hledat další nápovědu. |
| První scéna | `/editor/getting-started/first-scene/` | Krátký průchod scénou, postavou, replikou a scénickou poznámkou. |

### 2. Scénáře a soubory — Scripts and files

Rozcestník `/editor/scripts/`. Život dokumentu mimo samotné psaní; tiskový export patří do poslední kategorie.

| Článek | Navržená URL | Rozsah |
| --- | --- | --- |
| Vytvoření a správa scénářů | `/editor/scripts/manage/` | Nový scénář, otevření, pojmenování, duplikace, hledání a řazení na úvodní obrazovce. |
| Ukládání a zálohy | `/editor/scripts/saving/` | Co znamená stav uložení, kde data zůstávají, jak získat zálohu; ověřit aktuální webovou a desktopovou variantu. |
| Import a přenos souborů | `/editor/scripts/files/` | Podporované vstupní a editovatelné výstupní formáty, přenos mezi instalacemi. |
| Smazání scénáře | `/editor/scripts/delete/` | Dostupné ovládání a skutečný rozsah smazání; neslibovat neověřenou obnovu. |

### 3. Psaní scénáře — Writing your script

Rozcestník `/editor/writing/`. Tok psaní a chování bloků. Postavy a hudební odkazy mají své vlastní kategorie.

| Článek | Navržená URL | Rozsah |
| --- | --- | --- |
| Druhy bloků a jejich změna | `/editor/writing/blocks/` | Význam jednotlivých bloků, výběr typu, změna typu a cyklování. |
| Pokračování v psaní | `/editor/writing/flow/` | Enter, Shift+Enter, prázdný blok, dělení textu a volba dalšího bloku. |
| Repliky a poznámky k promluvě | `/editor/writing/dialogue/` | Dialogue a aside, přepínání pomocí Tab a návrat do promluvy. |
| Scénické poznámky | `/editor/writing/stage-directions/` | Stage direction, odsazení, rozdíl proti aside; odkazy na postavy a hudbu vedou do jejich článků. |
| Formátování textu | `/editor/writing/formatting/` | Dostupné značky, výběr textu a ovládání formátování. |
| Přehled klávesových zkratek | `/editor/writing/shortcuts/` | Stručná reference s odkazy na postupy; rozlišit macOS a Windows/Linux. |

### 4. Dějství a scény — Acts and scenes

Rozcestník `/editor/structure/`. Význam a organizace struktury; typografická nastavení patří do vzhledu stránek.

| Článek | Navržená URL | Rozsah |
| --- | --- | --- |
| Dějství, scény a místa | `/editor/structure/acts-and-scenes/` | Vytvoření, názvy, místa a vazba na obsah scénáře. |
| Navigace a přesouvání | `/editor/structure/navigation/` | Postranní panel, přechod do scény, přesouvání a sbalování. |
| Číslování scén | `/editor/structure/numbering/` | Číslování a jeho dostupné nastavení. |
| Změna nebo odstranění nadpisu | `/editor/structure/headings/` | Konverze a odstranění; vysvětlit, co se stane s obsahem scény. |

### 5. Postavy — Characters

Rozcestník `/editor/characters/`. Všechny postupy, jejichž hlavním předmětem je postava: zadání mluvčího, více mluvčích i odkaz v poznámce.

| Článek | Navržená URL | Rozsah |
| --- | --- | --- |
| Zadání mluvčího | `/editor/characters/speakers/` | Nové jméno, našeptávání, výběr existující postavy a dokončení zadávání. |
| Potvrzené a nepotvrzené postavy | `/editor/characters/confirmation/` | Význam stavu, jeho označení a postup potvrzení; rozlišit od dokončení zadávání jména. |
| Více postav v jedné replice | `/editor/characters/multiple-speakers/` | Zadávání dalších jmen přes `+` a `/`; význam a pořadí ověřit před psaním. |
| Skupiny postav | `/editor/characters/groups/` | Pojmenované skupiny, členství a použití ve scénáři; vysvětlit rozdíl proti více mluvčím v jednom bloku. |
| Odkaz na postavu v poznámce | `/editor/characters/references/` | Zahájení zadávání přes `@`, výběr a úprava odkazu, návrat k běžnému textu. |
| Správa postav | `/editor/characters/manage/` | Jména, údaje, barvy, výskyty a dostupné operace ve správci postav. |

### 6. Hudba a zpěv — Music and lyrics

Rozcestník `/editor/music/`. Hudební čísla, jejich odkazy a text zpěvu tvoří související pracovní oblast.

| Článek | Navržená URL | Rozsah |
| --- | --- | --- |
| Hudební čísla | `/editor/music/numbers/` | Vytvoření, názvy, číslování a hudební panel. |
| Odkaz na hudbu v poznámce | `/editor/music/references/` | Zahájení hudebního odkazu přes `#`, našeptávání, music pill a navazující text. |
| Text zpěvu a mluvený text | `/editor/music/lyrics/` | Lyrics, přepínání typu bloku, poznámky k promluvě a pokračování zpěvu. |
| Noty a přílohy | `/editor/music/attachments/` | Připojení a správa podporovaných souborů; odkaz na tisk s vloženými notami. |

### 7. Hledání a připomínkování — Finding and reviewing

Rozcestník `/editor/review/`. Orientace podle textu a práce s připomínkami. Dokumentace nebude slibovat spolupráci nebo historii verzí, které nebyly ověřeny.

| Článek | Navržená URL | Rozsah |
| --- | --- | --- |
| Hledání ve scénáři | `/editor/review/search/` | Hledaný text, výsledky, navigace a dostupné filtry. |
| Komentáře | `/editor/review/comments/` | Komentování vybraného textu, vlákna a zobrazení komentářů. |
| Zpět a znovu | `/editor/review/undo-redo/` | Dostupné vracení úprav a jeho hranice; odlišit od záloh dokumentu. |

### 8. Stránky a export — Pages and export

Rozcestník `/editor/export/`. Převod rukopisu do podoby určené ke čtení, zkoušení nebo předání.

| Článek | Navržená URL | Rozsah |
| --- | --- | --- |
| Vzhled stránek | `/editor/export/page-layout/` | Rozměry, okraje, formátování prvků, vizuální preference a strukturální značky. |
| Titulní a úvodní strany | `/editor/export/front-matter/` | Údaje o dokumentu, titulní strana, úvodní strany, logo, záhlaví a zápatí. |
| Export scénáře | `/editor/export/script/` | Šablona, náhled a dostupné výstupní formáty. |
| Výběr obsahu a stránkování | `/editor/export/content/` | Filtry postav, zalomení, prázdné strany a obsah exportu. |
| Export s notami | `/editor/export/integrated-scores/` | Vložené partitury, náhled a skutečná omezení výstupu. |

## Syntax — technická reference

Vstup `/syntax/`. První skutečný obsah bude **Stagistic Syntax** na `/syntax/reference/`, převzatý z existující technické reference. Pokud délka později vyžádá rozdělení, rozdělíme jej podle formátu, nikoli podle ovládání editoru. API a další technické kapitoly nyní nevytváříme.

Stránka LP `/editor/syntax` zůstane jako stručné představení, motivace a několik ověřených srovnání s Fountain, s odkazem na úplnou referenci.

## Kam patří nenápadné funkce

| Funkce nebo situace | Hlavní článek | Další cesta k nalezení |
| --- | --- | --- |
| `@` ve scénické poznámce | Postavy → Odkaz na postavu | Scénické poznámky, hledání „character tag“, „mention“, „@“. |
| `#` ve scénické poznámce | Hudba → Odkaz na hudbu | Scénické poznámky, hledání „music pill“, „music cue“, „#“. |
| Další jméno přes `+` nebo `/` | Postavy → Více postav v jedné replice | Zadání mluvčího, hledání „multiple speakers“, „unison“. |
| Tab v promluvě a poznámce | Psaní → Repliky a poznámky k promluvě | Přehled zkratek. |
| Tab pro odsazení | Psaní → Scénické poznámky | Přehled zkratek. |
| Enter na prázdném bloku | Psaní → Pokračování v psaní | Druhy bloků, přehled zkratek. |
| Cyklování a rychlá změna typu bloku | Psaní → Druhy bloků | Přehled zkratek. |
| Sbalení scén a změna nadpisu | Struktura → Navigace / Změna nadpisu | Rozcestník struktury. |

Tabulka určuje místo vysvětlení. Neslouží jako hotový popis chování. Při psaní každého článku ověříme podmínky, dokončení, zrušení, změny již vložené položky a rozdíly podle platformy.

Pro výrazy jako `@`, `#`, `+` a `/` nebude hlavní cestou samotné vyhledávání symbolu: tokenizace vyhledávače jej nemusí uchovat. Použijeme srozumitelné názvy a související slova přímo v obsahu článku.

## Vnitřní struktura aplikace

```text
apps/docs/
  astro.config.mjs          # Doména, navigace, vzhled, vyhledávání.
  moon.yml                 # dev / build / preview / typecheck / lint.
  src/content.config.ts    # Schéma a načítání obsahu.
  src/content/docs/
    index.md               # Hlavní rozcestník.
    editor/index.md        # Úvod sekce Editor, banner splash.
    editor/getting-started/index.md  # Začínáme.
    editor/<kategorie>/
      index.md             # Rozcestník kategorie.
      <tema>.md            # Budoucí konkrétní návod.
    syntax/index.md        # Úvod sekce Syntax, banner splash.
    syntax/reference/index.md  # Budoucí úplná specifikace.
  src/navigation/sections.ts  # Společný seznam sekcí a navigace.
  src/routeData.ts          # Omezení sidebaru na aktivní sekci.
  src/content/i18n/         # Texty rozhraní dokumentace.
  src/styles/docs.css      # Písmo a barevné proměnné Stagistic.
  public/                  # Favicon a budoucí obrázky.
```

URL vycházejí z tématu, nikoli z jeho pořadí. Soubory `index.md` vytvářejí rozcestníky s krátkými URL. Navigace první verze odkazuje pouze na existující rozcestníky; po odsouhlasení kategorií budou konkrétní články postupně přidávané do explicitní navigace. Rozpracovaná témata zůstanou mimo veřejnou navigaci až do dokončení.

## Vzor konkrétního článku

```markdown
---
title: Refer to a character in a stage direction
description: Insert and edit a character reference while writing a stage direction.
---

Krátké vysvětlení účelu.

## Jak na to
Podmínka, krátký postup, očekávaný výsledek.

## Příklad
Krátká skutečná ukázka v editoru.

## Úprava a zrušení
Jak pokračovat, upravit vloženou položku nebo zadávání opustit.

## Časté otázky
Jen nejasnosti specifické pro tuto činnost.

## Související témata
Nejvýše několik užitečných odkazů.
```

Sekce vynecháme, pokud pro konkrétní téma nemají obsah. FAQ bude běžný text s nadpisy, aby šlo odpověď přečíst, vyhledat a přímo na ni odkázat. Jednoduché kroky vystačí s textem; obrázek nebo krátká animace pomůže tam, kde záleží na poloze kurzoru či chování nabídky.

## Doporučené pořadí psaní po schválení

Nejprve orientace, první scéna a základy toku psaní. Hned poté odkazy na postavy a hudbu a více mluvčích, protože právě tyto interakce jsou obtížně objevitelné. Následuje struktura, ukládání a základní export. Pokročilé nastavení, přílohy a další otázky doplníme postupně; zbývající veřejné rozcestníky do té doby jasně označíme jako připravované.

Rozsah článků je návrh, nikoli požadavek napsat vše najednou. Krátké samostatné články můžeme sloučit, pokud by samostatnost jen komplikovala orientaci.
