# Další kategorie: Acts and scenes

Stav: členění a příklad odsouhlaseny 7. 10. 2026. Rozcestník a šest článků jsou připraveny v `apps/docs/src/content/docs/editor/structure/`. Postupy byly ověřeny podle zdrojů; živé ověření v prohlížeči zatím neproběhlo.

## Upřesnění podle implementace

Při podrobném ověření se ukázalo, že původní návrh zahrnoval tři nedostupné funkce. Sidebar umí přesouvat jednotlivé scény, ale ne celý akt; neumí sbalit seznam scén pod aktem. Správa scény nabízí přiřazení míst, nikoli pole pro editaci synopsis. Články tyto funkce neslibují. Ochrana první scény se týká explicitního odstranění nadpisu; nepřenášíme ji bez důkazu na převod typu.

## Co má čtenář zvládnout

Rozdělit scénář na scény a případně akty, najít potřebnou část a přesunout ji i s obsahem. Potom doplnit údaje scény, upravit číslování a pochopit, co se stane při odstranění strukturálního nadpisu.

Akty nejsou povinný předpoklad práce se scénami. Rozcestník vysvětlí, že Scene zahajuje scénu a Act seskupuje následující scény. Nadpis proto ovlivňuje strukturu scénáře, nikoli jen vzhled textu.

Kategorie zůstane na `/editor/structure/`. Rozcestník nabídne jednotlivé úkoly; stejných šest článků bude dostupných přímo v sidebaru jako u Characters a Writing your script. Novou kategorii ani samostatnou část Script settings nepřidáváme.

## Společný příklad

Navážeme na Robinův a Alexův rozhovor z Writing your script. Tentokrát ukážeme jeho místo v celku:

| Akt | Scéna | Dění |
| --- | --- | --- |
| `The departure` | `At the door` | Robin chce odejít, Alex ho zdržuje. |
| `The departure` | `Outside` | Oba vyjdou před dům. |
| `The return` | `Back inside` | Vrátí se pro zapomenutou věc. |

To jsou ukázkové texty v editoru, nikoli zápis Stagistic Syntax. Místa mohou být například `House` a `Street`; jejich přiřazení vysvětlíme až při správě údajů scény.

Příklad poskytne návaznost celé kategorii, ale každý článek bude fungovat samostatně. Nebudeme vyžadovat přepsání všech scén ani dokončení předchozího návodu.

## Rozcestník a články

| Článek | Co řeší | URL |
| --- | --- | --- |
| Add acts and scenes | Založit scénu na požadovaném místě, pokračovat jejím obsahem a volitelně přidat akt. Upravit text nadpisu. Vysvětlit, kterou část scénáře nový nadpis oddělí. | `/editor/structure/add/` |
| Navigate and collapse scenes | Najít scénu přes Structure sidebar, rozpoznat aktivní scénu a údaj o stránce. Sbalit obsah scény v editoru a znovu ho zobrazit; seznam scén v sidebaru zůstává viditelný. | `/editor/structure/navigate/` |
| Rearrange scenes | Přesunout scénu se vším obsahem a změnit její zařazení pod akt, myší i z klávesnice. Vysvětlit, co se přemístí společně a co znamená místo vložení. | `/editor/structure/rearrange/` |
| Manage scene details | Upravit text nadpisu v editoru, otevřít správu scény a přiřadit místa. Správu sdílených míst vysvětlit v rámci tohoto úkolu. | `/editor/structure/details/` |
| Customize scene numbering | Najít Scene numbering ve Script settings a vybrat dostupné provedení. Vysvětlit automatické číslování po změně pořadí a rozdíl mezi číslem a textem nadpisu. | `/editor/structure/numbering/` |
| Change or remove a heading | Změnit Scene na běžný blok nebo odstranit její nadpis. Popsat zachování textu, ztrátu údajů scény a ochranu první scény. V samostatné části vysvětlit odstranění aktu a zachování jeho scén. | `/editor/structure/headings/` |

Pořadí vede od vytvoření struktury přes každodenní orientaci a změny až k nastavení a odstranění hranic mezi částmi. Nevytváříme samostatný seznam skrytých funkcí; každou vysvětlíme u konkrétní potřeby.

## Flow jednotlivého článku

Použijeme již schválenou strukturu: situace → krátký postup → očekávaný výsledek → potřebné výjimky → navazující úkol.

Například Rearrange scenes začne situací: scénu `Outside` potřebujete přesunout pod druhý akt. Postup ukáže místo uchopení a vložení. Výsledek výslovně uvede, že se přesunula celá scéna včetně replik a scénických poznámek. Potom vysvětlí přesun z klávesnice a omezení přesunu celého aktu.

U sbalení ukážeme účel: schovat rozepsanou scénu, abyste se mohli soustředit na další část. Přímo zde uvedeme, že sbalení obsah neodstraňuje.

## Obtížně objevitelné chování v kontextu

- **Vytvoření:** vložení strukturálního nadpisu ovlivní hranice scény nebo aktu; nejde jen o změnu typografie. Zvláštní chování kláves v nadpisu vysvětlíme v tomto článku, až ho prakticky ověříme.
- **Orientace:** sbalení scény schová její tělo v editoru, nikoli položku v sidebaru. Sbalení seznamu pod aktem není dostupné.
- **Přesouvání:** scéna se přesouvá se svým obsahem až k další Scene nebo Act hranici. Akt je v sidebaru cílovou skupinou, ne přetahovaným celkem.
- **Údaje:** místa patří ke scéně a mohou být sdílená. Text nadpisu se upravuje v editoru. Synopsis se nyní v manažeru needituje.
- **Číslování:** nastavení patří do této kategorie, protože řeší orientaci ve scénách. Vzhled nadpisů a tiskové rozvržení zůstanou v Pages and export.
- **Odstranění:** Delete scene heading zachová obsah a přiřadí ho k předchozí scéně; odstraní synopsis a přiřazení míst. Nepředstavíme tuto akci jako odstranění celé scény s textem.
- **Změna typu:** při převodu Scene na běžný blok zůstane text nadpisu, ale odstraní se synopsis a přiřazení míst. Ochrana první Scene před explicitním odstraněním není společným omezením pro všechny strukturální operace.
- **Odstranění aktu:** odstraní se blok Act, nikoli následující scény. Výsledek jejich seskupení vysvětlíme na příkladu.

## Hranice vůči ostatním kategoriím

- Writing your script vysvětluje obecné typy bloků a tok psaní. Zde odkazujeme na jeho přehled; strukturální výjimky popisujeme při práci s nadpisy.
- Characters a Music and lyrics řeší vlastní entity. V této kategorii jejich správu neopakujeme.
- Pages and export řeší vzhled nadpisů, stránky a tiskový výstup. Článek o číslování na tuto oblast odkáže při potřebě upravit vzhled.
- Syntax zůstává technickou referencí. K práci s akty a scénami ji uživatel nepotřebuje.

## Vizuální zásady

Zachováme angličtinu uživatelských článků, bílé klávesy se symbolem a názvem, tenké skutečné ikony editoru vedle popisků a kód pro konkrétní psaný text. Totéž platí pro nadpisy a descriptions. Ikony bez textu ukážeme u příslušného kroku; pojmenujeme jejich účinek.

## Ověření před psaním

Případné živé ověření: na samostatném zkušebním scénáři ověřit vložení Scene a Act, úpravu nadpisu, pokračování přes klávesy, navigaci, sbalení těla scény, přesun scény mezi akty, místa, číslování po přesunu a převod či odstranění nadpisu. Zvlášť ověřit první scénu a hranice přesouvání. Implementace nyní slouží jako podklad pro všechny postupy; články nejsou označené za prakticky otestované.

Při praktickém ověření respektovat předání sdíleného prohlížeče uživateli z předchozího úkolu; bez nového předání ho nepřebírat.

Zdrojové body pro další ověření:

- `packages/app-routes/src/routes/script/editor/structure/ScriptStructureSidebar.tsx`
- `packages/app-routes/src/routes/script/editor/structure/StructureRowAct.tsx`
- `packages/app-routes/src/routes/script/editor/structure/StructureRowScene.tsx`
- `packages/app-routes/src/routes/script/editor/structure/StructureSidebarContextActions.tsx`
- `packages/editor/src/editor/hooks/actBlockMutations.ts`
- `packages/editor/src/editor/hooks/structureReorder.ts`
- `packages/editor/src/editor/hooks/sceneReorder.ts`
- `packages/editor/src/editor/tiptap/extensions/sceneCollapse/`
- `packages/app-routes/src/routes/script/editor/scene/DeleteSceneHeadingModal.tsx`
- `packages/app-routes/src/routes/script/editor/scene/ConvertSceneHeadingModal.tsx`
- `packages/app-routes/src/routes/script/attribute-manager/deleteAttributeManagerScene.ts`
- `packages/app-routes/src/routes/script/settings/panels/element/ElementNumericControls.tsx`

## Další krok

Rozcestník, šest článků a samostatná plochá skupina sidebaru jsou připravené k redakční kontrole. Výsledky kontrol a omezení živého ověření jsou v `docs/superpowers/plans/2026-10-07-acts-and-scenes-documentation.md`. Dokumentace zatím nebyla nasazena.
