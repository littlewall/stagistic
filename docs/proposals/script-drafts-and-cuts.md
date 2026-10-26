# Drafts, versions a Cuts

Stav: odsouhlaseno 9. 10. 2026. Plán fáze 1: `docs/superpowers/plans/2026-10-09-script-snapshots.md`.

## Proč

Dramatici si mezi drafty vedou dvě věci ručně. Datované nebo číslované kopie souboru („2026.10.02 The door – new final monologue“, v01, v02, datovaná PDF) a jeden soubor pro vyškrtnutý materiál („Deleted Material“, „graveyard“, „Darlings“, „SLOSH PILE“). Do něj ukládají celé scény a beaty, ne jednotlivé změny jazyka. Nové verze zakládají vědomě, „když by mi bylo líto o současný stav přijít“. Hlavní bolest: opravy v exportované kopii mimo nástroj a následné ruční porovnávání verzí.

Zdroj: [r/playwriting – How do you save/archive between drafts](https://www.reddit.com/r/playwriting/comments/1ww005s/how_do_you_savearchive_between_drafts_including/).

Stagistic nabídne obě věci přímo u scénáře:

- **Drafts a versions:** pevné, jen pro čtení uložené stavy celého scénáře.
- **Cuts:** odkladiště materiálu, ze kterého si autor bere.

Ani jedno není automatické ukládání. Draft, version i cut vznikají jen vědomou akcí uživatele.

## Drafts a versions

Oba druhy jsou pevný snapshot aktuálního scénáře se stejnými akcemi. Liší se účelem a pojmenováním.

| Druh | Účel | Označení |
| --- | --- | --- |
| Draft | Rozpracovaný stav k určitému datu. | Automatické číslo, např. „Draft 4“, a volitelný důvod, např. `new final monologue`. |
| Version | Stav pro konkrétní účel: finální znění, festival, zájezd. | Povinný název, např. „Edinburgh Fringe 2026“, a volitelná poznámka. |

Pravidla:

- **Čísla:** dostávají je jen drafty. Rostou v rámci scénáře a po smazání se znovu nepoužijí, např. 1, 2, 4.
- **Mark as version:** existující draft jde označit jako version s názvem, např. když se ukáže, že Draft 7 šel na festival. U version zůstane původ „from Draft 7“. Opačný směr nenabízíme.
- **Úpravy:** po vytvoření jde upravit jen důvod, název a poznámku.
- **Paralelní vývoj:** version se nedá dál upravovat. Kdo chce zájezdovou verzi rozvíjet souběžně s hlavní linkou, vytvoří z ní nový scénář přes Restore as new script.
- **Přehled:** každý snapshot si ukládá počet stránek a scén pro výpis bez načítání celého obsahu.

### Výběr zobrazeného stavu

Vedle názvu scénáře v app baru je výběr zobrazeného stavu: „The door · Current ▾“, „The door · Draft 3 ▾“, „The door · Edinburgh Fringe 2026 ▾“.

Nabídka obsahuje:

1. **Current:** pracovní verze, jediná upravitelná.
2. **Versions:** podle názvu.
3. **Drafts:** od nejnovějšího. Počet není omezený, proto se seznam posouvá a od určité délky nabídne filtrování.
4. **Akce:**
   - Save as new draft…
   - Save as version…
   - Manage drafts and versions…: dialog pro přejmenování, Mark as version a smazání.

Výběr se propisuje do URL, takže funguje odkaz i tlačítko Zpět.

### Zobrazení draftu nebo version

Vše je jen pro čtení: editor, Attribute manager, nastavení, titulní strana a panely Structure, Characters, Music a Comments. Panely ukazují data snapshotu, nikoli aktuálního scénáře. Komentáře jsou viditelné, ale nejde přidávat, odpovídat ani uzavírat.

Povolené akce:

| Akce | Výsledek |
| --- | --- |
| Copy | Kopírování textu do schránky. |
| Copy to cuts | Uloží výběr nebo scénu do Cuts aktuálního scénáře. Slouží k vytěžení materiálu ze starých draftů. |
| Restore to this script | Nejdřív automaticky uloží aktuální stav jako nový draft s důvodem „Before restoring Draft 3“, potom obnoví snapshot a přepne na Current. |
| Restore as new script | Vytvoří samostatný scénář z celého snapshotu. |
| Export | PDF nebo `.stepkg` přesně ve stavu snapshotu. |

Stav jen pro čtení je zřejmý z označení v app baru a z akcí Restore a Export vedle něj. Banner nepřidáváme.

### Rozsah obnovy do aktuálního scénáře

Obnova vrací napsaný scénář, ne prostředí kolem něj.

| Přepíše | Ponechá |
| --- | --- |
| Text a bloky | Nastavení scénáře |
| Akty, scény a jejich metadata (barva, synopse, lokace) | Titulní stranu |
| Postavy a skupiny | Cuts |
| Hudbu | Drafty a versions |

**Komentáře následují text.** Po obnově zůstane aktivní každé aktuální vlákno, jehož kotva v obnoveném textu existuje (blok podle ID, rozsah podle značky v textu). Ostatní aktuální vlákna se odstraní. Neztratí se, zůstanou v automaticky uloženém draftu „Before restoring Draft 3“. Značky vláken, která v aktuálním scénáři už neexistují, se z obnoveného textu odstraní. Smazané komentáře se tedy obnovou nevrátí.

Tím se obnova liší od Replace existing u `.stepkg`, která nahrazuje celý snapshot včetně nastavení a komentářů.

## Cuts

Cuts jsou odkladiště scénáře. Autor sem materiál odkládá a pak si z něj bere nebo kopíruje. Položka se nikdy nevrací na původní místo automaticky.

**Co sem patří:** celá scéna, výběr (beat, replika, pasáž) nebo nový materiál, třeba prototyp scény či útržek dialogu.

**Jak se sem dostane:**

- Move to cuts: u scény v akcích nadpisu scény, u výběru v kontextové nabídce. Materiál ze scénáře zmizí. Jen v Current.
- Copy to cuts: totéž, ale materiál ve scénáři zůstane. V Current i ve snapshotu.
- New cut: v panelu Cuts autor začne psát nový materiál.

**Položka obsahuje:**

- Název: výchozí je nadpis scény nebo první řádek, jde přepsat.
- Obsah: upravitelný, ve formátování scénáře.
- Původ: např. „Act II, Sc. 3 · cut after Draft 3“ nebo „from Draft 2“ u kopie ze snapshotu.
- Datum.

**Jak se z něj bere:**

- Insert at cursor: vloží kopii na místo kurzoru a položka v Cuts zůstane.
- Copy: zkopíruje obsah do schránky.

Položku autor smaže sám. Smazání je trvalé a vyžaduje potvrzení. Vystřižený materiál navíc zůstává v draftech vzniklých před vystřižením.

**Hranice:** Cuts nemají verze, nejsou součástí snapshotů, obnova je nemění a nepatří do PDF.

**Umístění:** panel Cuts v sidebaru vedle Structure, Characters, Music a Comments. Je to nástroj pro chvíle psaní, ne pro správu.

## Označení draftu v dokumentu

Nic se nemění automaticky. Titulní strana už má datum draftu v režimu `auto` (dnešní datum) nebo `manual`. Hlavička a patička znají token `{{draft_date}}`.

Návrh doplní:

- **Režim data na titulní straně From latest draft or version.**
- **Token `{{draft}}` pro hlavičku a patičku:** vypíše „Draft 4“, nebo název version.

Výchozí nastavení zůstává beze změny.

- **Export snapshotu** použije jeho označení a datum.
- **Export aktuálního scénáře** v novém režimu použije poslední draft nebo version.
- **Neuložené změny:** pokud se scénář od posledního snapshotu změnil, dialog exportu nabídne Save as draft and export a Save as version and export.

## Technický základ

- **`script_snapshots`:** `id`, `script_id` (cascade), `kind` (`draft` | `version`), `number` (jen u draftů, unikátní v rámci scénáře), `name`, `note`, `payload_storage_key`, `document_schema_version`, `summary_metadata`, `created_at`, `created_by`. Obsah je `StepkgSnapshot` sestavený stejně jako `.stepkg` (`readScriptPackageSource`), bez cuts, uložený komprimovaně ve `FileStorage` mimo databázi. Číslo draftu přiděluje čítač `scripts.last_draft_number`.
- **`script_cuts`:** `id`, `script_id` (cascade), `kind` (`scene` | `passage` | `new`), `title`, `content_json` (`ScriptNode[]`), `scene_meta`, `origin_label`, `source_snapshot_id`, `cut_after_draft_number`, `document_schema_version`, `created_at`, `updated_at`.
- **Schéma dokumentu:** `SCRIPT_DOCUMENT_SCHEMA_VERSION` se nemění. Snapshot i cut si ukládají verzi schématu. Starší obsah se migruje stejnou cestou jako import `.stepkg`.
- **Zobrazení snapshotu:** editor a panely čtou data ze snapshotu přes stejné rozhraní jako aktuální scénář, s vypnutými zápisy.
- **Vložení cutu:** bloky dostanou nová ID a značky postav se přemapují podle klíče postavy, podobně jako `duplicate/remapIds.ts`. Hudební značky zůstanou, jen pokud položka hudby ve scénáři existuje.
- **Obnova:** částečné nahrazení podle tabulky výše. Využije části `importPackage`, ale nesmí přepsat nastavení, titulní stranu, cuts ani snapshoty. Komentáře se vyřeší podle pravidla „komentáře následují text“.
- **Přílohy:** snapshot se na soubory příloh odkazuje a nekopíruje je. Odstranění přílohy nesmí smazat soubor, na který odkazuje existující snapshot.
- **Záloha:** `.stepkg` aktuálního scénáře bude obsahovat i cuts jako novou volitelnou položku balíčku. Snapshoty v balíčku jsou fáze 4.
- **Synchronizace:** snapshoty se nemění, takže stačí operace vložení. Výjimkou jsou název, poznámka a druh. Cuts jsou malé měnitelné řádky.

## Fáze

1. **Drafts a versions:**
   - vytvoření,
   - výběr v app baru,
   - zobrazení jen pro čtení,
   - Restore to this script a Restore as new script,
   - Export a Save as … and export,
   - Manage (přejmenování, Mark as version, Delete).
2. **Cuts:** panel, Move/Copy to cuts pro scénu i výběr, Copy to cuts ze snapshotu, New cut, Insert at cursor, cuts v `.stepkg`.
3. **Označení draftu v dokumentu:** režim titulní strany a token hlavičky a patičky.
4. **Compare a navazující práce:**
   - přehled změn po scénách mezi snapshotem a aktuálním stavem nebo mezi dvěma snapshoty, postavený na stabilních ID bloků,
   - snapshoty v `.stepkg`,
   - synchronizace.

## Mimo rozsah

- Automatická historie a průběžné snapshoty.
- Sledování změn po řádcích (track changes).
- Úpravy snapshotu, větvení a slučování. Souběžná práce na jiné verzi vede přes nový scénář.
- Verze jednotlivých scén (alternates). Vrátíme se k nim, až pro ně uživatelé projeví potřebu; technicky by šlo o cuts navázané na scénu.

## Odsouhlaseno

- Název odkladiště je Cuts.
- Komentáře se ve snapshotu ukládají a zobrazují; obnova je neobnovuje jako aktivní.
- Označení draftu v dokumentu je volba v nastavení, nikoli automatika.
- Snapshoty jde mazat; čísla draftů se znovu nepoužijí.
- Výběr zobrazeného stavu je v app baru vedle názvu scénáře; snapshoty jsou celé jen pro čtení, včetně Attribute manageru.
- Smazání cutu je trvalé s potvrzením.
- Počet snapshotů není omezený.
- Rozlišení Draft a Version: drafty číslované, versions pojmenované, převod pouze Draft → Version.
- Komentáře po obnově následují text: vlákna bez kotvy se odstraní a zůstanou v automatickém draftu před obnovou.
- Copy to cuts ze snapshotu jako jediný zápis povolený při prohlížení snapshotu.
