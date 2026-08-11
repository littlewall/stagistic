# Zapracování UX nálezů

Zdroj: [`docs/design/UX_FINDINGS_2026-08-04.md`](docs/design/UX_FINDINGS_2026-08-04.md)

Track: **bugy podle priority**. Redesign vstupy (R1–R11) čekají na zodpovězení 10 otázek ze sekce „Co redesign musí rozhodnout".

Commity nedělám — po každém nálezu předávám k vizuální kontrole.

## Critical

- [x] **B1** — Pravý sidebar fyzicky překrývá text scénáře pod 1200 px
      Oddělené „dokované" a „překryvné" otevření v `useSidebarLayout`; pod 1200 px
      startují oba sidebary zavřené, otevřený drawer se neukládá do `localStorage`
      a v jednu chvíli může být otevřený jen jeden.
- [x] **B1a** — Pod 1200 px se nevysunula hlavička sidebaru (nešlo přepnout panel)
      `.toolbarRow` měl v `@media (max-width: 1199px)` napevno oba postranní sloupce
      na šířku přepínací lišty, takže se hlavička otevřeného sidebaru vešla jen
      z ~56 px — panel select se odřízl a zbyl jen zavírací křížek. Sloupce nesou
      stav otevření samy (`buildRootStyle`), takže override zmizel.
- [x] **B1b** — Music cue značky prosvítaly skrz otevřený drawer
      Overlaye plátna (music range 3–20, block actions 4, návrhy 6, chooser 7)
      soupeřily z-indexem přímo se sidebarem (2), protože `.canvasHost` nebyl
      vlastní stacking context. Přidané `isolation: isolate` je uzavře pod drawer.
- [x] **B2** — Editor toolbar má výchozí prohlížečový focus ring, hlavička designový
      V `base.css` chybělo jakékoli globální pravidlo pro focus, takže čtyři CSS
      moduly editoru (`EditorToolbar`, `Editor`, `SidebarPanelSelect`,
      `EditorSidebarToolbar`) propadly na UA outline Chromu. Přidané pravidlo je
      celé v `:where()` (specificita 0,0,0) — přebije UA styl, ale prohraje s každou
      komponentou, takže záměrné alternativní indikátory (`HomeRoute`, `ScriptActionsMenu`)
      zůstávají. Plátno a `MusicPill` jsou vynechané záměrně. `SyncIndicator` má
      `<span tabIndex={0}>`, na který element-scoped pravidlo nedosáhne — dostal vlastní ring.

## Important

- [x] **B3** — Ozubené kolo `Open settings` otevírá jen `Appearance`
      Zvolený směr: menu zůstává (poroste), mění se ikona. Ozubené kolo → paleta
      (`AppearanceIcon`), `aria-label` `Open settings` → `Appearance`, přibyl tooltip
      (bylo jediné ikonové tlačítko hlavičky bez něj). Tlačítko přešlo z `.avatarTrigger`
      na `.iconButton` — nepředstírá avatar, takže sedí velikostí i barvou k `New script`
      a `Import script`. `.avatarTrigger` byl jediný uživatel, smazán.
- [x] **B4** — Empty-enter chooser je zarovnaný na začátek textového sloupce
- [x] **B5** — Chooser nabízí jen `Scene`, `Stage direction` a `Character`
- [x] **B7** — Typ bloku neexistuje v přístupnostním stromě
      Každý blok zůstává `<p>` kvůli stránkování, ale renderer nyní přidává
      `aria-roledescription` z kanonického `BLOCK_ITEMS`; živý node view i
      serializované HTML tak rozliší `ACT`, `Scene`, `Dialogue` a ostatní typy.
- [x] **B8** — Návrhy postav nemají `aria-activedescendant` ani vybranou položku
      Aktivní možnost má unikátní `id` a `aria-selected="true"`; fokusovaný editor
      ji propojuje přes `aria-activedescendant` a `aria-controls`. Po zavření
      návrhů se oba atributy z editoru odstraní.
- [x] **B9** — Po vytvoření scénáře není kurzor v dokumentu
      Multi-act šablona obsahuje `ACT ONE`, který obecná kontrola prázdného
      dokumentu považovala za text, a proto nezapnula autofocus. Nové úzké
      pravidlo pro initial focus bere šablonu s jediným `ACT ONE` jako nepopsanou;
      kurzor se pak umístí do prázdného Scene bloku. Sémantika dokumentu ani
      výchozí název Scene se nemění.
- [x] **B10** — Přeuspořádání scén jde jen myší
      Structure sidebar nyní vedle myšího sensoru registruje i klávesový. Na
      úchytu scény `Space`/`Enter` začne a potvrdí přesun, šipky mění pozici a
      `Escape` ho zruší; po dokončení se fokus vrátí na úchyt.

## Polish

- [x] **B11** — `Undo` je aktivní, i když není co vrátit
      `disabled` už byl navázaný na `undoDepth(state) > 0` (`useToolbarState.ts:51`) —
      to bylo v pořádku. Skutečná chyba byla v `useEditorLifecycle.ts`: načtení
      obsahu (`setContent`) a doprovodné transakce (`sanitizeScriptBlocks`, zápis
      `settings` atributu) nenesly `addToHistory: false`, takže samotné otevření
      scénáře přidalo krok do historie a Undo zprovoznilo, přestože nešlo o
      uživatelovu akci. Přidán `addToHistory: false` na všechny transakce
      v inicializačním bloku (`setContent` přes `.chain()`, protože sama komanda
      tuhle možnost nenabízí; `sanitizeScriptBlocks`; zápis `settings`).
- [x] **B12** — `/script/:id/settings` vykreslí prázdno, než se scénář načte
      `ScriptSettingsRoute` při `useScripts().isLoading` vracel `null` — prázdnou
      bílou stránku, než PGlite dokončí boot a route přesměruje do editoru
      s otevřeným settings modalem. Ostatní routy v této rodině (`HomeRoute`,
      `ScriptWorkspaceRoute`, `ScriptEditorRoute`) na stejný stav už používaly
      `LoaderOverlay` — sjednoceno, `ScriptSettingsRoute` teď dělá totéž.
- [x] **B13** — Export: `Characters` jako `h3` i `h4`, `h1` uvnitř `complementary`
      Dvě samostatné věci: `ExportControlPanel` měl `<h1>Export</h1>` přímo uvnitř
      `<aside aria-label="Export controls">` — hlavní nadpis stránky žil uvnitř
      doplňkového landmarku. `h1` teď sedí v obalovém `<div>` mimo `<aside>` (grid
      layout zůstal stejný, jen `.header`/`.controls` rozdělené na dva grid itemy).
      `ExportPreview` ("PDF preview" region) nemělo žádný nadpis — text `Preview`/
      `N pages` byl `<span>`, teď je to `<h2>` (vizuálně beze změny, `font: inherit`).
      Druhý `Characters` (h4 v `InitialPagesModule`, řídící "Show character
      outlines" a pořadí) přejmenován na `Character outlines` podle finding-em
      navrženého směru — `CharacterFilterModule`'s h3 `Characters` (filtr, které
      postavy se exportují) zůstal beze změny.
- [x] **B14** — Všechny modály zůstávají v DOM i zavřené
      `ModalDialog` vždy vykreslovalo `<dialog>` a jen ho přepínalo mezi
      `showModal()`/`close()` podle `isOpen` — element v DOM zůstával i zavřený,
      proto Playwright na `[role="dialog"], dialog` bez otevřeného modálu našel
      všech 13. Přidán interní stav `isMounted`: při `isOpen → true` se nejdřív
      připojí (`isMounted = true`), až pak proběhne `showModal()` (potřebuje
      existující ref); při `isOpen → false` se nejdřív zavolá `close()` a vrátí
      fokus, teprve pak se `isMounted` shodí a `<dialog>` zmizí z DOM úplně.
      Žádný z ~15 konzumentů (`CreateGroupModal`, `NewScriptModal`, …) se
      neměnil — všichni jen předávají `isOpen` dál. Tři testy, které dřív
      ověřovaly "zavřeno, ale pořád v DOM" (`dialog?.open === false`), upraveny
      na "po zavření element zmizí" — to je přesně opravované chování, ne
      regrese. Sjednocení s `react-aria-components` zůstává mimo scope (finding
      to výslovně řadí do redesignu).
- [x] **B15** — Tři konzolová hlášení při běžném průchodu
      `scriptsCollection` má explicitní `BasicIndex` nad `updatedAt`, takže dotaz
      `orderBy(updatedAt).limit(...)` už nespadne na úplné načtení kolekce; regresní
      test přímo ověřuje, že TanStack DB nehlásí chybějící index. Zbývající dvě
      hlášení byla vedlejším účinkem obsahu zavřených modálů: jeho odpojení v B14
      zabrání spuštění skrytých tooltipů a lifecycle efektů. Cílený browser průchod
      triggeru Appearance už `flushSync` ani `<Focusable>` nehlásí.

## Kontroly po každém nálezu

```
npx tsc -b
./node_modules/.bin/stylelint "**/*.{css,scss}"
./node_modules/.pnpm/eslint@8.57.1/node_modules/eslint/bin/eslint.js . --ignore-pattern 'tmp/**'
pnpm test
pnpm -C packages/<balíček> test:browser
```

`pnpm exec eslint` nefunguje — binárka není v `node_modules/.bin`, proto ta plná cesta.

Baseline před začátkem: `tsc` čistý, `stylelint` exit 0, `eslint` 255 chyb (pre-existing),
`pnpm test` 602 passed / **1 failed**, `packages/editor` browser 120 passed / **1 failed**,
`packages/app-routes` browser 71 passed.

Dva červené testy jsou pre-existing — ověřeno přes `git stash` na čistém stromu:

- `packages/app-routes/src/routes/home/example-script/prepareExampleScriptDocument.test.ts:38`
  (`stageDirection` × `musicStart`)
- `BlockActionMenu.browser.test.tsx` → `supports keyboard submenu navigation and restores trigger focus`

Ani jeden není součástí nálezů B1–B15; kdyby se měly řešit, jsou to samostatné položky.
Pozor: neúspěšný běh browser testu přepíše tracked screenshot v `__screenshots__/` —
po takovém běhu ho vrátit přes `git checkout --`.
