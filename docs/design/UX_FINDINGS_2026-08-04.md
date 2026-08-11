# UX nálezy — `apps/web`, 2026-08-04

Vstup pro komplexní UX/UI redesign. Doprovodný inventář: [`UI_MAP_2026-08-04.md`](./UI_MAP_2026-08-04.md).

## Jak číst tenhle dokument

**Optika:** první příchod / objevitelnost. Otázka u každého nálezu zní „co se stane člověku, který Stagistic otevírá poprvé a nikdo mu nic nevysvětlil", ne „co obtěžuje mě po padesáté".

**Měřítko:** [`PRODUCT.md`](../../PRODUCT.md) — všech pět principů platí beze změn, včetně *professional discretion*. K tomu obecné heuristiky použitelnosti a reálné toky z mapy. **`DESIGN.md` měřítko není** — je zastaralý a soulad s ním se nekontroloval.

**Dvě kategorie, které se nemíchají:**

| Značka | Význam |
|---|---|
| 🐞 **bug** | Chová se jinak, než chtěl autor kódu. Dá se opravit teď, nezávisle na redesignu. |
| 🎨 **redesign input** | Kód dělá, co má; problém je v návrhu. Patří do zadání redesignu, ne do rychlé opravy. |

**Priorita:** `Critical` = blokuje nebo mate prvního uživatele · `Important` = stojí ho čas a jistotu · `Polish` = drhne.

Vše ověřeno živě v prohlížeči, ne jen ze zdroje. Čísla jsou naměřená.

---

## Shrnutí

| # | Nález | Kat. | Priorita |
|---|---|---|---|
| B1 | Pravý sidebar fyzicky překrývá text scénáře pod 1200 px | 🐞 | Critical |
| B2 | Editor toolbar má výchozí prohlížečový focus ring, hlavička designový | 🐞 | Critical |
| B3 | Ozubené kolo `Open settings` otevírá jen `Appearance` | 🐞 | Important |
| B4 | Empty-enter chooser překrývá předchozí řádek a stojí mimo textový sloupec | 🐞 | Important |
| B5 | Chooser nabízí 6 ze 7 typů bloků — chybí `Notes` | 🐞 | Important |
| B6 | Panel `structure-markers` je hotový, ale z UI nedosažitelný | 🐞 | Important |
| B7 | Typ bloku neexistuje v přístupnostním stromě | 🐞 | Important |
| B8 | Návrhy postav nemají `aria-activedescendant` ani vybranou položku | 🐞 | Important |
| B9 | Po vytvoření scénáře není kurzor v dokumentu | 🐞 | Important |
| B10 | Přeuspořádání scén jde jen myší | 🐞 | Important |
| B11 | `Undo` je aktivní, i když není co vrátit | 🐞 | Polish |
| B12 | `/script/:id/settings` vykreslí prázdno, než se scénář načte | 🐞 | Polish |
| B13 | Export: `Characters` jako `h3` i `h4`, `h1` uvnitř `complementary` | 🐞 | Polish |
| B14 | Všechny modály zůstávají v DOM i zavřené | 🐞 | Polish |
| B15 | Tři konzolová hlášení při běžném průchodu | 🐞 | Polish |
| R1 | Zkratky nikde v UI — kompletní systém bez jediné nápovědy | 🎨 | Critical |
| R2 | Prázdný editor neřekne, co má člověk udělat | 🎨 | Critical |
| R3 | Sidebary jsou vzájemně výlučné až do 1469 px | 🎨 | Critical |
| R4 | Vizuální hierarchie bloků je plochá a u `ACT`/`Scene` obrácená | 🎨 | Important |
| R5 | Na home jsou tři rovnocenné vstupy a žádný primární | 🎨 | Important |
| R6 | Dvě konkurenční menu v hlavičce, nastavení bez vlastní URL | 🎨 | Important |
| R7 | `aside` a `lyrics` nemají z `dialogue` viditelnou cestu | 🎨 | Important |
| R8 | Export nemá navigaci po stránkách náhledu | 🎨 | Important |
| R9 | Patička běží i v editoru | 🎨 | Polish |
| R10 | Vyhledávání a řazení se zobrazí i u jediného scénáře | 🎨 | Polish |
| R11 | Tooltipy nenesou zkratky a mají nulovou prodlevu | 🎨 | Polish |

---

# 🐞 Bugy

## B1 — Pravý sidebar fyzicky překrývá text scénáře pod 1200 px

**Priorita: Critical** · `packages/app-routes/src/routes/script/editor/sidebar/sidebarViewport.ts:3`

Pod 1200 px se sidebar přepne do overlay režimu (`OVERLAY_MAX_WIDTH = 1199`), ale plátno pod ním nezmenší svou šířku. Sidebar má 302 px a leží na textu.

Naměřeno na example scriptu, `elementFromPoint` na konci nejdelšího řádku:

| Šířka | Pravý okraj řádku | Levý okraj sidebaru | Zakryto | Co je na konci řádku |
|---|---|---|---|---|
| 1440 | 887 | 1137 | — | `p.block` |
| 1200 | 767 | 897 | — | `p.block` |
| **1100** | 869 | 797 | **72 px** | `aside.sidebar` |
| **1024** | 831 | 721 | **110 px** | `aside.sidebar` |
| **1000** | 818 | 697 | **121 px** | `aside.sidebar` |

`document.scrollingElement.scrollWidth === window.innerWidth` na všech šířkách — vodorovný scroll neexistuje, takže **zakrytý text není dosažitelný jinak než zavřením sidebaru**. 1000 px je přitom vlastní deklarované minimum aplikace (`UnsupportedScreenGate.tsx:7`).

**Dopad:** Uživatel na 13" notebooku otevře scénář, sidebar `Characters` je při příchodu otevřený a on prostě nevidí konce vět. Nemá důvod tušit, že text pokračuje — nic to nenaznačuje.

**Směr:** Overlay musí buď plátno posunout/zúžit, nebo přes něj ležet jen dočasně (a sám se zavírat při psaní). Dokud jde o overlay, nesmí být otevřený při příchodu.

Snímky: `f4-05/06/07-sidebar-overlay-clip-*.png`

---

## B2 — Editor toolbar má výchozí prohlížečový focus ring, hlavička designový

**Priorita: Critical** · `packages/ui/styles/base.css` (token), `packages/editor/src/editor/components/toolbar/`

Naměřeno tabováním celou aplikací:

| Prvek | `outline` |
|---|---|
| `Go to home`, `ScriptMenu`, `Editor`, `Export`, `Open settings` | `2px solid oklch(0.58 0.0699 277.48)` |
| `Show left sidebar`, `Undo`, `Redo`, `Bold`, `Italic`, `Underline`, `Select right sidebar panel` | `1px auto rgb(0, 95, 204)` |

Ta druhá hodnota je Chrome UA default — tedy **nikdo ten stav nenavrhl**. Rozdíl je i v kontrastu a v dark módu vypadá jako chyba vykreslení.

`PRODUCT.md:39` požaduje „keyboard navigation" jako explicitní závazek, i bez formální WCAG certifikace.

**Dopad:** Člověk, který zkouší ovládat editor z klávesnice — tedy přesně ta cílová skupina, co píše scénáře — vidí půlku aplikace se systémovým modrým rámečkem a půlku s fialovým. Působí to nedodělaně a v dark módu je modrý ring hůř čitelný.

**Směr:** Jeden focus token aplikovaný přes sdílenou třídu/mixin na všechny interaktivní prvky, ne per-komponentu. Editor toolbar a sidebar toolbar dnes ten token nedědí.

Snímek: `f4-08-focus-ring-toolbar.png`

---

## B3 — Ozubené kolo `Open settings` otevírá jen `Appearance`

**Priorita: Important** · `packages/ui/src/layout/header/AccountMenu.tsx:38`, obsah `:22-28`

Tlačítko má `aria-label="Open settings"` a ikonu ozubeného kola. Popover obsahuje výhradně nadpis `Appearance` a přepínač témat. Skutečná nastavení — `Script settings`, `Attribute manager`, `Export to .stagistic` — jsou schovaná pod šipkou u názvu scénáře (`AppHeader.tsx:193`).

**Dopad:** Ozubené kolo je univerzálně chápaný vstup do nastavení. První uživatel, který hledá kde nastavit titulní stranu nebo formát stránky, klikne sem, uvidí přepínač světlo/tma a **usoudí, že aplikace nic dalšího nenabízí**. Cesta přes název scénáře není nijak naznačená — chevron u titulku vypadá jako dekorace.

**Směr:** Buď ikonu přejmenovat na to, co dělá (`Appearance`, paleta/půlměsíc místo ozubeného kola), nebo do ní přesunout skutečná nastavení. Dvě menu s překrývajícím významem v jedné hlavičce jsou samostatný redesign vstup — viz **R6**.

Snímky: `f4-04-appearance-popover-light-1440.png`, `f10-02-script-menu.png`

---

## B4 — Empty-enter chooser překrývá předchozí řádek a stojí mimo textový sloupec

**Priorita: Important** · `packages/editor/src/editor/components/emptyEnterChooser/EmptyEnterBlockChooserOverlay.tsx:157-171`

Naměřeno při prázdném bloku na `top 337`, výška 38:

| | `top` | `left` | rozměr |
|---|---|---|---|
| Chooser | 310 | 248 | 173 × 32 |
| Předchozí blok | 282 | — | končí na 337 |
| Textový sloupec | — | 295 | 592 |

Chooser tedy začíná 27 px **nad** místem, kde stojí kurzor, zasahuje do právě napsaného řádku a jeho levý okraj je 47 px vlevo od textu.

Tlačítka jsou 26 × 26 px s roztečí 28 px — pod běžným minimem cíle a bez odstupů mezi sousedy.

**Dopad:** Nabídka se objeví přes text, který uživatel právě napsal, a vypadá jako artefakt, ne jako nabídka vázaná na aktuální řádek. Vazba „tohle se týká místa, kde stojím" se ztrácí přesně ve chvíli, kdy je nejdůležitější.

**Směr:** Zarovnat chooser na levý okraj textového sloupce a posadit ho pod baseline aktuálního bloku, ne nad něj. Cíle zvětšit na ≥ 32 px.

Snímky: `f3-06-empty-enter-chooser.png`, `f3-07-empty-enter-chooser-tooltip.png`

---

## B5 — Chooser nabízí 6 ze 7 typů bloků — chybí `Notes`

**Priorita: Important** · `packages/editor/src/editor/tiptap/extensions/emptyEnterChooserState.ts:38-45`

```
['scene', 'stageDirection', 'character', 'aside', 'dialogue', 'lyrics']
```

Menu `Change block type` v toolbaru přitom nabízí sedm položek včetně `Notes`, a `Notes` má vlastní zkratku `0` (`packages/script/src/blocks/specs/`).

**Dopad:** Chooser je nejpřirozenější místo, kde se první uživatel dozví, jaké typy bloků vůbec existují — objeví se sám, bez hledání. Pokud tam `Notes` chybí, znamená to, že jeden ze sedmi typů nemá **žádnou** objevitelnou cestu: není v chooseru, jeho zkratku nikde nevidí (viz **R1**), takže zbývá jen menu v toolbaru.

**Směr:** Buď seznam sjednotit s toolbarem, nebo vědomě zdůvodnit, proč je `Notes` jinde (a doplnit mu jinou objevitelnou cestu). `act` z chooseru vynechaný být může — akty se zakládají ve struktuře.

---

## B6 — Panel `structure-markers` je hotový, ale z UI nedosažitelný

**Priorita: Important**

| Krok | Kde |
|---|---|
| ID definované | `routes/script/settings/settingsMenu.ts:12` |
| Otypované | `settingsMenu.ts:65` |
| Zaregistrované | `routes/script/editor/settings/registry.tsx:54` |
| Implementované | `settings/structure-markers/StructureMarkersSettingsPanel.tsx` |
| **V navigaci** | **ne** — `scriptSettingsMenu` na `settingsMenu.ts:71-122` ho neobsahuje |

**Dopad:** Hotová funkce, kterou nikdo nikdy neuvidí. Pro prvního uživatele neexistuje.

**Směr:** Doplnit položku do `scriptSettingsMenu`, nebo panel a jeho registraci odstranit. Aktuální stav je nejhorší z obou.

---

## B7 — Typ bloku neexistuje v přístupnostním stromě

**Priorita: Important** · `packages/editor/src/editor/tiptap/scriptBlock/`

Každý blok se do DOM vykreslí jako `<p>` bez `role` a bez `aria-*`. Typ nese hashovaná CSS-module třída a nestandardní atribut `blocktype` (malými písmeny, protože ho React propustí jen tak). V přístupnostním stromě jsou proto **všechny bloky `paragraph`** — scéna, replika i poznámka nerozeznatelně.

Zároveň to znamená, že typ bloku je vizuálně nesen **výhradně** stylem (viz **R4**), bez textové ani sémantické záložní vrstvy.

**Dopad:** Odečítač obrazovky přečte scénář jako souvislý proud odstavců. Ztratí se jediná strukturní informace, kterou scénář má.

**Směr:** Doplnit `aria-roledescription` nebo `data-block-type` s čitelnou hodnotou plus `aria-label` na blok. Zároveň to otevře cestu k CSS selektorům, které nejsou závislé na hashované třídě.

---

## B8 — Návrhy postav nemají `aria-activedescendant` ani vybranou položku

**Priorita: Important** · `packages/editor/src/editor/components/characterSuggestions/`

Overlay je `role="listbox" aria-label="Character suggestions"`, položky `role="option"`. Naměřeno: **všechny položky mají `aria-selected="false"`** a plátno na overlay neodkazuje přes `aria-activedescendant`. Přitom šipky výběr vizuálně posouvají a `Enter`/`Tab` ho potvrdí (`extensions/characterTagInput/keyDownHandlers.ts:231, 246`).

**Dopad:** Vizuálně to funguje, pro odečítač je to nefunkční seznam bez kurzoru.

**Směr:** Nastavovat `aria-selected` na aktivní položce a propojit ji s `contenteditable` přes `aria-activedescendant`. Stejný vzor prověřit i u návrhů hudby.

Snímek: `f5-05-character-tag-suggestions.png`

---

## B9 — Po vytvoření scénáře není kurzor v dokumentu

**Priorita: Important** · `packages/editor/src/editor/components/editorShell/EditorShell.tsx`

Změřeno hned po `Create script`:

- `document.activeElement` → `BODY`
- toolbar: `button "Change block type" [disabled]` s popiskem `"Select block in editor"`
- dokument: `ACT ONE` + jeden prázdný blok typu `scene`

**Dopad:** Uživatel právě řekl „chci psát scénář" a dostal prázdnou stránku, kde nic nebliká, a jedinou nabídku typů bloků má vypnutou s hláškou „Select block in editor". Musí uhodnout, že má kliknout do prázdna. To je nejhorší možný první dojem z produktu, jehož jediným účelem je psaní.

**Směr:** Po vytvoření dát fokus do prvního prázdného bloku. Řeší to zároveň disabled toolbar i chybějící kurzor jedním krokem.

Snímek: `f3-02-editor-new-script-empty.png`

---

## B10 — Přeuspořádání scén jde jen myší

**Priorita: Important** · `routes/script/editor/structure/ScriptStructureSidebar.tsx`

Každá scéna má `button "Drag scene"`. Klávesová alternativa (šipky, `Move up` / `Move down`, kontextové menu) nebyla nalezena ani v aria stromě, ani ve zdroji.

`PRODUCT.md:39` slibuje „keyboard navigation".

**Dopad:** Přeuspořádání scén je jedna z mála strukturních operací v aplikaci a je dostupná právě jedním způsobem.

**Směr:** Přidat na `Drag scene` klávesový režim (`Space` uchopí, šipky posunou, `Enter` položí) nebo dvě jednoduché položky `Move up`/`Move down` v menu akcí scény.

---

## B11 — `Undo` je aktivní, i když není co vrátit

**Priorita: Polish** · `packages/editor/src/editor/components/toolbar/`

Na čerstvě vytvořeném scénáři je `Undo` enabled. Ověřeno, že stisk nic nerozbije — historie je prázdná, akce je no-op. `Redo` je ve stejné chvíli správně disabled.

**Dopad:** Drobná lež o stavu. První uživatel, který si Undo zkusí a nic se nestane, ztrácí důvěru v to, že tlačítka v tomhle produktu odpovídají skutečnosti.

**Směr:** Navázat `disabled` na `editor.can().undo()`, stejně jako to už dělá `Redo`.

---

## B12 — `/script/:id/settings` vykreslí prázdno, než se scénář načte

**Priorita: Polish** · `packages/app-routes/src/routes/script/ScriptSettingsRoute.tsx:10-12`

Během načítání route vrací `null`; teprve pak přesměruje na `…/editor?settingsModal=1` (`:23`).

**Dopad:** Kdo si uloží odkaz na nastavení, uvidí po otevření bílou stránku, než se PGlite nastartuje. Boot databáze v prohlížeči není okamžitý.

**Směr:** Vrátit `<LoaderOverlay>` místo `null` — komponenta už v aplikaci existuje a používá se při bootu.

---

## B13 — Export: `Characters` jako `h3` i `h4`, `h1` uvnitř `complementary`

**Priorita: Polish** · `routes/script/export/ExportControlPanel.tsx`, `packages/ui/src/export/ExportPanel.tsx`

Dvě věci najednou:

1. `heading "Export" [level=1]` je vnořený v `complementary "Export controls"`. Hlavní nadpis stránky žije uvnitř doplňkového orientačního bodu, zatímco `region "PDF preview"` — vlastní obsah — žádný nadpis nemá.
2. Řetězec `Characters` se objevuje jako `h3` (sekce `Input`) i jako `h4` (uvnitř `Characters and places`), s různým významem.

**Dopad:** Navigace po nadpisech vrátí dvakrát `Characters` a hlavní nadpis stránky na místě, kde ho nikdo nečeká.

**Směr:** `h1` přesunout nad panel do hlavního regionu, náhledu dát vlastní nadpis, a druhý `Characters` přejmenovat podle toho, co skutečně řídí (např. `Character outlines`).

Snímek: `f9-01-export-light-1440.png`

---

## B14 — Všechny modály zůstávají v DOM i zavřené

**Priorita: Polish** · `packages/ui/src/dialogs/ModalDialog.tsx`

Playwright na `[role="dialog"], dialog` v editoru bez otevřeného modálu vrací **13 shod**. Vykreslují se tedy všechny dialogy naráz, jen skryté.

**Dopad:** Vedle zbytečné práce při vykreslování to komplikuje ladění a testování a zvyšuje riziko, že se v skrytém dialogu ocitne fokusovatelný prvek.

**Směr:** Modály připojovat až při otevření. `ModalDialog` je navíc ruční `<dialog>` s vlastním focus trapem, zatímco zbytek aplikace stojí na `react-aria-components` — sjednocení je samostatné rozhodnutí do redesignu.

---

## B15 — Tři konzolová hlášení při běžném průchodu

**Priorita: Polish**

| Hlášení | Kdy |
|---|---|
| `[TanStack DB] [scripts] orderBy with limit requires an index on "updatedAt" … Falling back to loading all data.` | při každém načtení knihovny |
| `flushSync was called from inside a lifecycle method. React cannot flush when React is already rendering.` | settings modal / export |
| `<Focusable> child must be focusable. Please ensure the tabIndex prop is passed through.` | některý `Tooltip` trigger |

**Dopad:** Poslední dvě jsou skutečné vady. `Focusable` znamená, že nějaký tooltip je pro klávesnici nedosažitelný — přímo souvisí s **R11**. `flushSync` může způsobit ztracené vykreslení.

**Směr:** Dohledat trigger bez `tabIndex`, doplnit index na `updatedAt` v TanStack DB kolekci, `flushSync` odložit mimo lifecycle.

---

# 🎨 Vstupy pro redesign

## R1 — Zkratky nikde v UI — kompletní systém bez jediné nápovědy

**Priorita: Critical**

V kódu existuje plnohodnotný systém zkratek:

| Vstup | Efekt | Zdroj |
|---|---|---|
| `Ctrl`+`1…7`,`0` (macOS) / `Alt`+`…` (jinde) | Změna typu bloku | `handlers/shortcuts.ts:16-36` |
| `Alt`+`Enter` / `Shift`+`Alt`+`Enter` | Cyklení typů vpřed/vzad | `handlers/index.ts:106-108` → `handlers/shortcuts.ts:71-94` |
| `Enter` | Blok typu `nextElement` | `handlers/index.ts:110-112` |
| `Enter` na prázdném | Chooser | `handlers/enter.ts:205` |
| `Tab` | Vlastní handler | `handlers/index.ts:114-116` |

Za běhu se z toho **nezobrazí nic**. Ověřeno: menu `Change block type` má u sedmi položek jen ikonu a název; tooltipy nesou jen popisek (`Bold` → „Bold", chooser → „Scene"); gutter také ne. Jediná zmínka je sr-only odstavec „Use the toolbar or keyboard shortcuts to change block types and formatting." (`packages/editor/src/editor/components/EditorCanvas.tsx:62`) — tedy věta, kterou vidoucí uživatel nikdy neuvidí, a která navíc žádnou konkrétní zkratku neuvádí.

Číslo `6` přitom není přiřazené žádnému typu, což u čísel `1,2,3,4,5,7,0` působí jako chyba — ale zjistit to jde jen ze zdroje.

**Dopad:** Tohle je jádro celého problému „appka nevede uživatele". Scénáristický editor stojí a padá na rychlosti přepínání typů bloků. Uživatel, který zkratky nezná, kliká myší do menu u každého řádku — a nikdy se nedozví, že to jde jinak. Produkt se před ním tváří pomaleji, než je.

**Směr:** Zkratky patří všude, kde se akce nabízí — do menu `Change block type` napravo od názvu, do tooltipů, do gutteru. Sekundárně: `Alt`+`Enter` cyklení a řetězení přes `Enter` jsou to nejcennější, co editor umí, a zaslouží si vlastní, jednorázově zobrazenou nápovědu (viz **posouzení kontextového bloku** níže).

Snímky: `f3-04-block-type-menu-open.png`, `f3-08-block-gutter-hover.png`

---

## R2 — Prázdný editor neřekne, co má člověk udělat

**Priorita: Critical** · `routes/script/ScriptEditorRoute.tsx`

Nový scénář = `ACT ONE` + jeden prázdný `scene` blok. Žádný placeholder, žádný náznak, co se stane po `Enter`, co znamená `scene`, kde je zbylých šest typů. Toolbar je v tu chvíli navíc vypnutý (**B9**) a pravý sidebar `Characters` ukazuje „No characters on stage yet. Add a character block to start building your cast." — tedy instrukci k akci, kterou uživatel neumí provést, protože „add a character block" není nikde vysvětlené.

`PRODUCT.md` staví na *distraction-free* psaní. To ale znamená **odstranit rušivé prvky**, ne odstranit orientaci.

**Dopad:** Nejkritičtější okamžik celého produktu — prázdná stránka. Uživatel buď začne psát naslepo a zjistí, že se text chová divně (velká písmena, centrování), nebo zavře záložku.

**Směr:** Prázdný stav plátna má nést jednu větu o mechanice řetězení (`scene → stage direction → character → dialogue`, `Enter` posouvá dál) a jeden odkaz na chooser. Zmizí při prvním znaku a už se nevrátí. Prázdný stav sidebaru `Characters` má odkazovat na konkrétní akci, ne na pojem.

Snímek: `f3-02-editor-new-script-empty.png`

---

## R3 — Sidebary jsou vzájemně výlučné až do 1469 px

**Priorita: Critical** · `sidebar/sidebarViewport.ts:1,4`, `sidebar/useSidebarLayout.ts:198-238`

```
SIDEBAR_EXCLUSIVE_QUERY = '(max-width: 1469px)'
EXCLUSIVE_MAX_WIDTH = 1469
```

Pod 1470 px otevření jednoho sidebaru zavře druhý (`toggleLeft`/`toggleRight` na `:212-238`). Oba se přitom inicializují jako otevřené (`:105-106`) a effect na `:198-210` pak levý zavře.

1470 px je nad rozlišením většiny notebooků. Na 13"–16" stroji tedy **`Structure` a `Characters` nemohou být vidět zároveň nikdy**.

Vedlejší efekt: `Structure` je při příchodu zavřený ne proto, že by to někdo navrhl, ale protože ho ten effect zavřel.

**Dopad:** První uživatel vidí jen `Characters` a nemá důvod tušit, že existuje osnova scénáře. Když ji najde, zmizí mu postavy. Vzniká dojem, že aplikace „přepíná režimy", ne že má dva panely.

**Směr:** Rozhodnout, jestli mají oba panely koexistovat na 1280–1470 px (užší sidebary? zúžený textový sloupec?), nebo jestli je správně jeden panel s přepínačem sekcí. Dnešní stav je třetí varianta, kterou nikdo nezvolil. Souvisí s **B1**.

Snímky: `f7-02/03-sidebar-exclusivity-*.png`

---

## R4 — Vizuální hierarchie bloků je plochá a u `ACT`/`Scene` obrácená

**Priorita: Important** · `packages/editor/src/editor/styles/`, naměřeno na `--size-scale: 1.08`

**Všech sedm typů má `font-size: 17.28px` a `line-height: 20.736px`.** Rozlišuje se jen tučností, verzálkami, řezem, odsazením a odstupem:

| Typ | Váha | Case | Řez | Dekorace | Odsazení | `padding-top` |
|---|---|---|---|---|---|---|
| ACT | 700 | uppercase | normal | underline, tracking 0.35 px | 0 | **17.28 px** |
| Scene | 700 | uppercase | normal | — | 0 | **34.56 px** |
| Stage direction | 400 | — | normal | — | 0 | 17.28 px |
| Character | 700 | uppercase | normal | — | 207.2 px | 17.28 px |
| Aside | 400 | lowercase | italic | `(` `)` | 176.1 px | 0 |
| Dialogue | 400 | — | normal | — | 103.6 px | 0 |
| Lyrics | 400 | uppercase | italic | — | 103.6 px | 0 |

Dvě věci:

1. **`ACT` a `Scene` jsou skoro k nerozeznání** — stejná velikost, váha, verzálky, barva i odsazení. Liší se jen podtržením a nepatrným prostrkáním u `ACT`.
2. **Hierarchie je obrácená.** `Scene` dostává dvojnásobný odstup shora než `ACT`, přestože je to nižší úroveň struktury. Vizuálně tak scéna působí jako důležitější předěl než akt.

Jednotná velikost je legitimní odkaz na strojopisný scénář (`Courier Prime`, PDF výstup) — to se zpochybňovat nemá. Problém je, že **na obrazovce ta konvence nemá oporu**, kterou má na papíře: čtenář papírového scénáře ví, co je akt. První uživatel neví.

**Dopad:** Uživatel nemá jak číst strukturu vlastního dokumentu. Při scrollování dlouhým scénářem nepozná, kde končí akt a začíná scéna.

**Směr:** Rozhodnout, jestli obrazovkový režim smí mít jinou typografickou hierarchii než PDF (nejspíš ano — to je přesně ten kompromis „distraction-free vs. použitelné"). Minimálně otočit odstupy, aby `ACT` dostal víc prostoru než `Scene`.

Snímek: `f4-01-editor-example-light-1440.png`

---

## R5 — Na home jsou tři rovnocenné vstupy a žádný primární

**Priorita: Important** · `routes/home/HomeRoute.tsx:128-172`

`New script`, `Import script` a `Create example script` mají identickou vizuální váhu — stejné pozadí, rám, velikost, každý ikona + titulek + popis.

Zajímavý kontrast: jediné plně vyplněné tmavé tlačítko v celé aplikaci je `Download PDF` na obrazovce exportu. Vzor pro primární akci tedy existuje, jen se na home nepoužil.

**Dopad:** První obrazovka po instalaci nabízí tři stejně naléhavé možnosti. `Create example script` je přitom pro prvního uživatele **nejcennější** (viz **R1**, **R2** — příklad je jediné místo, kde uvidí, jak scénář vypadá), a `Import script` naopak nejméně relevantní. Rovnocennost je nechává rozhodovat bez informace.

**Směr:** Zvolit jednu primární akci — a pro persony „první příchod" je to pravděpodobně `Create example script`, ne `New script`. Zbylé dvě potlačit na sekundární váhu.

Snímky: `f1-03-home-empty-light-1440.png`, `f10-01-home-populated-light-1440.png`

---

## R6 — Dvě konkurenční menu v hlavičce, nastavení bez vlastní URL

**Priorita: Important** · `packages/ui/src/layout/AppHeader.tsx:122,193`; `routes/script/settings/settingsMenu.ts:8`

V hlavičce jsou dva vstupy do „nastavení":

| Vstup | Vypadá jako | Obsahuje |
|---|---|---|
| Ozubené kolo `Open settings` (`:122`) | nastavení | `Appearance` + přepínač témat |
| Chevron u názvu scénáře (`:193`) | přejmenování | `Script settings`, `Attribute manager`, `Export to .stagistic` |

Skutečná nastavení scénáře **nemají trvalou URL** — otevírají se query parametrem `settingsModal`, a route `/script/:id/settings` je jen redirect na tenhle parametr (`ScriptSettingsRoute.tsx:23`). Attribute manager URL nemá vůbec.

**Dopad:** Uživatel nemá mentální model, kde co hledat. Nemůže si nastavení uložit do záložek ani poslat odkaz. Zpět z modálu se chová jinak než zpět ze stránky.

**Směr:** Rozhodnout, jestli nastavení scénáře zůstává modál (a pak sjednotit vstup na jedno místo) nebo se stane plnou routou (`/script/:id/settings/:panel`), která by zároveň dala smysl `structure-markers` z **B6**. Rozhodnutí ovlivní i attribute manager.

---

## R7 — `aside` a `lyrics` nemají z `dialogue` viditelnou cestu

**Priorita: Important** · `packages/script/src/blocks/specs/`

Řetězení přes `Enter` (`nextElement` v každém specu):

| Z | Do | Kotva |
|---|---|---|
| `act` | `scene` | `specs/act.ts:14` |
| `scene` | `stageDirection` | `specs/scene.ts:13` |
| `stageDirection` | `character` | `specs/stageDirection.ts:13` |
| `character` | `dialogue` | `specs/character.ts:15` |
| `dialogue` | `character` | `specs/dialogue.ts:15` |
| `aside` | `dialogue` | `specs/aside.ts:15` |
| `lyrics` | `lyrics` | `specs/lyrics.ts:15` |
| `note` | `stageDirection` | `specs/note.ts:13` |

Hlavní smyčka je tedy `character ⇄ dialogue`. Do `aside`, `lyrics` ani `note` **žádná šipka nevede**.

`Enter` tedy sám nikdy nedovede uživatele k `aside`, `lyrics` ani `note`. Do těch se lze dostat výhradně přes zkratku (**neviditelnou**, R1 — `aside.ts:14` = `4`, `lyrics.ts:14` = `7`, `note.ts:12` = `0`), přes menu v toolbaru, nebo přes gutter.

Přitom `aside` a `lyrics` jsou přesně ty typy, které dělají ze Stagisticu **divadelní a muzikálový** nástroj, ne obecný textový editor. Jsou to diferenciátory produktu, schované nejhlouběji.

**Dopad:** První uživatel napíše scénu, postavu a dialog — a tam skončí. Nikdy nezjistí, že aplikace umí zpěv a stranou pronesenou repliku. Píše v Stagisticu obyčejný text.

**Směr:** Toto je nejsilnější argument pro kontextovou nabídku (viz posouzení níže): právě ve chvíli, kdy stojí kurzor v `dialogue`, má smysl ukázat, že `aside` a `lyrics` jsou na dosah jedné klávesy.

---

## R8 — Export nemá navigaci po stránkách náhledu

**Priorita: Important** · `packages/ui/src/export/ExportPanel.tsx`

`region "PDF preview"` obsahuje text `8 pages` a `Zoom out` / `120%` / `Zoom in`. Žádné listování, žádné miniatury, žádný skok na stranu.

**Dopad:** Export je moment ověření — uživatel se chce podívat, jak scénář dopadl, než ho pošle režii. Vidí první stranu z osmi a jediná cesta ke zbytku je stažení PDF. Zpětná vazba, kvůli které obrazovka existuje, je nedostupná.

**Směr:** Přidat listování (`Předchozí` / `Další` / pole se stranou) nebo souvislé svislé scrollování všemi stranami. Nastavení jako `Scenes start on odd pages` bez toho nejde vizuálně ověřit.

Snímek: `f9-01-export-light-1440.png`

---

## R9 — Patička běží i v editoru

**Priorita: Polish** · `packages/ui/src/layout/AppFooter.tsx`

Naměřeno v editoru: patička na `top 870`, výška 30 px, obsah „© Stagistic Editor • Made with 💛 in Prague" | „Public preview (what does it mean?)" | `feedback@stagistic.com`.

**Dopad:** Přímý rozpor s principem *distraction-free* i s *professional discretion*. Emoji v patě pracovní plochy profesionálního nástroje ubírá 30 px svislého prostoru na obrazovce, kde je vertikální místo nejdražší.

**Směr:** Patičku ponechat na home, v editoru a exportu ji vypustit. Odkaz na public preview a kontakt patří do `Appearance` popoveru nebo do hlavičky.

---

## R10 — Vyhledávání a řazení se zobrazí i u jediného scénáře

**Priorita: Polish** · `routes/home/HomeRoute.tsx`

`searchbox "Search scripts"` a `SORT_OPTIONS` (`:33`) se vykreslují bez ohledu na počet scénářů.

**Dopad:** Knihovna s jedním scénářem vypadá jako přeplněná stránka. Ovládací prvky, které nic neovládají, snižují důvěru v to, že ostatní ovládací prvky něco dělají.

**Směr:** Zobrazit filtr až od ~5 scénářů. Do té doby má prostor patřit start akcím (**R5**).

---

## R11 — Tooltipy nenesou zkratky a mají nulovou prodlevu

**Priorita: Polish** · `packages/ui/src/atoms/Tooltip.tsx`

Ověřeno, že tooltipy fungují (`Bold` → „Bold", `Add character` → „Add character", chooser → „Scene"). Ale:

1. Obsahují jen popisek, nikdy zkratku — přestože zkratka existuje (**R1**).
2. `delay = 0` a `closeDelay = 0` → tooltip vyskočí okamžitě při přejetí myší a stejně rychle zmizí. Při pohybu myší přes toolbar to bliká.
3. Ozubené kolo v hlavičce (`Open settings`) tooltip **nemá** vůbec — jediné ikonové tlačítko v hlavičce bez něj.
4. Konzole hlásí `<Focusable> child must be focusable` (**B15**) → některý trigger není dosažitelný z klávesnice, takže se jeho tooltip nikdy nezobrazí tabováním.

**Dopad:** Tooltipy jsou nejlevnější místo, kam se zkratky vejdou. Dnes to místo zůstává prázdné a samotné tooltipy působí neklidně.

**Směr:** Nenulová prodleva při otevření (~500 ms) a nulová při zavření uvnitř téže skupiny. Do tooltipu přidat zkratku jako sekundární řádek.

---

# Posouzení: kontextový blok „co můžeš teď udělat"

Zadání: *nenápadný blok vpravo dole, který se mění podle toho, co uživatel může v danou chvíli udělat (např. kurzor v `dialogue` → zkratka na `aside` a na `lyrics`), vypínatelný. Není to onboarding tour.*

## Verdikt

**Ano, ale ne jako první krok — a ne vpravo dole.**

Ten nápad míří na správný problém. Nálezy **R1** (nulová viditelnost zkratek), **R7** (`aside`/`lyrics` bez cesty) a **R2** (prázdný stav bez orientace) jsou dohromady největší UX dluh aplikace a kontextová nabídka je adresuje všechny naráz. Zároveň je vhodnější než onboarding tour: nezdržuje na začátku, objevuje se v momentě relevance a nechá uživatele psát.

Tři výhrady:

### 1. Většinu problému má vyřešit levnější vrstva

`R1` se ze 70 % vyřeší tím, že se zkratky napíšou do menu `Change block type`, do tooltipů a do gutteru — tedy na místa, která už existují a která uživatel stejně otevře. To je několikahodinová práce bez nové plochy a bez nové rozhodovací zátěže.

Kontextový blok má smysl **až nad touhle vrstvou**, pro to, co se do menu nevejde: řetězení přes `Enter`, `Alt`+`Enter` cyklení, a hlavně vztah mezi typy („z `dialogue` se dostaneš do `aside` a `lyrics`"). To jsou přechody, ne akce — a přechody se do statického menu skutečně nedají napsat.

**Doporučení:** nejdřív zkratky do stávajících povrchů, pak měřit, kolik z problému zbylo.

### 2. Vpravo dole je v tomhle layoutu obsazené

Naměřeno: pravý dolní roh editoru dnes hostí toasty (`Script created`) a nad nimi končí pravý sidebar (302 px široký, otevřený při příchodu). Pod 1200 px sidebar navíc leží na textu (**B1**). Blok vpravo dole by se tedy dělil o prostor s oznámeními a při zavřeném sidebaru by visel v prázdnu.

**Doporučení:** vázat nabídku na **kurzor**, ne na roh obrazovky. Existuje pro to už infrastruktura — gutter bloku (`blockActions/BlockGutterControls.tsx`) se objevuje přesně u aktivního řádku a je to nejpřirozenější místo, kde říct „tady jsi, tohle můžeš". Alternativa: pruh v patě plátna nad footerem, ve stylu stavového řádku — což by zároveň dalo smysl **R9** (patičku nahradit něčím užitečným).

### 3. Nenápadnost se musí definovat v číslech, ne v přídavných jménech

Požadavek „dostatečně nenápadné, aby nerušilo" je v přímém napětí s „dostatečně viditelné, aby to někdo objevil". Tenhle kompromis se nedá vyřešit slovem — musí se rozhodnout konkrétně:

- **Kdy se objeví:** při přesunu kurzoru do bloku jiného typu? Po pauze v psaní? Nikdy během psaní?
- **Jak zmizí:** po prvním použití zkratky, kterou nabízí? Po N zobrazeních? Po zavření?
- **Co se počítá jako „naučeno":** jednou použitá zkratka → nabídka pro daný přechod už se neukazuje. Tohle je klíčové — jinak z nenápadné nápovědy vznikne trvalý prvek UI a princip *distraction-free* padne.

**Doporučení:** navrhnout jako **dočasnou vrstvu, která sama vymírá**, ne jako panel. Vypínač v `Appearance` popoveru (nebo ve `Visual preferences`) je nutný, ale nemá být hlavní cestou ven — správně navržená nabídka se sama přestane ukazovat dřív, než ji někdo bude chtít vypnout.

## Riziko, na které si dát pozor

`PRODUCT.md` princip *professional discretion* a *distraction-free* nejsou v rozporu s nápovědou — jsou v rozporu s **trvalou** nápovědou. Hranice vede tudy: nabídka, která zmizí, jakmile se uživatel naučí, co nabízí, princip neporušuje. Nabídka, kterou vidí i po roce, ano.

---

# Co redesign musí rozhodnout

Otázky, které mapa odhalila, ale nemá je řešit.

| # | Otázka | Souvisí |
|---|---|---|
| 1 | **Smí mít obrazovka jinou typografickou hierarchii než PDF?** Dnes je plátno věrnou předlohou strojopisu (jedna velikost pro všech 7 typů). Pokud ano, otevírá se prostor pro skutečnou vizuální hierarchii; pokud ne, hierarchii musí nést něco jiného než velikost písma. | R4 |
| 2 | **Zůstává nastavení scénáře modálem, nebo se stane routou?** Dnes je to modál bez URL, na který vede redirect z route, která existuje. Rozhodnutí ovlivní i attribute manager a `structure-markers`. | R6, B6, B12 |
| 3 | **Kolik sidebarů může být otevřených naráz a od jaké šířky?** Dnešní 1470 px je nad rozlišením většiny notebooků, takže reálně nikdy dva. Alternativy: užší panely, zúžený textový sloupec, nebo jeden panel s přepínačem sekcí. | R3, B1 |
| 4 | **Jak se řeší overlay režim pod 1200 px?** Posun plátna, zúžení, nebo dočasný overlay, který se sám zavírá? Dnešní stav (překryv bez kompenzace) není žádná z variant. | B1 |
| 5 | **Která akce je na home primární?** Pro persony „první příchod" mluví data pro `Create example script`, ne pro `New script`. | R5 |
| 6 | **Kde končí *distraction-free* a začíná neinformovanost?** Konkrétně: smí být na prázdném plátně věta o mechanice? Smí být zkratka v menu? Smí být kontextová nabídka? Tohle je základní kompromis celého redesignu a měl by být rozhodnutý explicitně, ne po jednotlivostech. | R2, R9, kontextový blok |
| 7 | **Jak se zobrazují zkratky napříč aplikací?** Jeden vzor (menu / tooltip / gutter / nabídka), ne čtyři. Včetně toho, jestli se řeší rozdíl macOS `Ctrl` vs. `Alt` jinde. | R1, R11 |
| 8 | **Zůstává vlastní `ModalDialog`, nebo se dialogy sjednotí na `react-aria-components`?** Dnes běží dvě různé implementace focus trapu vedle sebe. | B14 |
| 9 | **Co je náhled exportu?** Jednostránkový kontrolní obrázek, nebo plnohodnotná prohlížečka? Určuje, jestli má smysl investovat do listování a miniatur. | R8 |
| 10 | **Zůstává `Notes` sedmým rovnocenným typem bloku?** Dnes chybí v chooseru a jeho jediná cesta je menu v toolbaru — buď je to opomenutí, nebo skryté rozhodnutí, že jde o typ druhé kategorie. | B5 |

---

## Co v téhle analýze není

| Oblast | Proč |
|---|---|
| Chybové stavy | Nepodařilo se je vyvolat bez zásahu do kódu — PGlite běží lokálně, síťová chyba nepřipadá v úvahu. Prázdné buňky ve stavové matici v mapě jsou samy o sobě nález, který nešel doložit snímkem. |
| Hudební toky do hloubky | Rozsah, rail, přílohy a `IntegratedScore` šablona vyžadují scénář s notovým materiálem. Struktura je doložená ze zdroje, chování ne. |
| Varianty `--size-scale` | Neprovedeno. |
| Výkon na dlouhém dokumentu | Example script má 8 stran; chování na plnovečerním scénáři nebylo měřeno. |
| Soulad s `DESIGN.md` | Záměrně — `DESIGN.md` je zastaralý a nebyl měřítkem. |
