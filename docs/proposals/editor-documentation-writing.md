# Další kategorie: Writing your script

Stav: členění a příklad odsouhlaseny 6. 10. 2026, následně schváleno doplnění úpravy flow. Rozcestník a sedm článků jsou připraveny v `apps/docs/src/content/docs/editor/writing/` k obsahové kontrole. Postupy byly ověřeny podle zdrojů a základní tok psaní i prakticky v samostatném zkušebním scénáři.

## Co má čtenář zvládnout

Napsat krátký úsek scénáře, rozlišit repliku od poznámky a pokračovat v práci bez překvapivých změn typu bloku. Kategorie vysvětluje tok psaní; zadávání a správu postav propojuje s již hotovými návody Characters.

Články pokračují v angličtině. Každý má vlastní situaci, krátký postup, očekávaný výsledek a jen potřebné navazující odkazy. Stejný postup může čtenář najít samostatně i při prvním čtení celé kategorie.

## Společný příklad

Robin otevře dveře, řekne, že je čas odejít, a pak tiše dodá důvod. Alex odpoví.

| Typ obsahu | Ukázka textu |
| --- | --- |
| Stage direction | `Robin opens the door.` |
| Character | `ROBIN` |
| Dialogue | `We should go.` |
| Aside | `quietly` |
| Dialogue | `Before they find us.` |
| Character | `ALEX` |
| Dialogue | `Give me a moment.` |

To je příklad obsahu v editoru, ne zápis Stagistic Syntax. Na začátku článku o scénických poznámkách stačí první věta; článek o replikách si vystačí s Robinovou promluvou. Čtenář nemusí přepisovat celý příklad ani dokončovat předchozí návod.

## Rozcestník a články

Rozcestník `/editor/writing/` stručně vysvětlí, že typ bloku určuje roli textu a dostupné chování kláves. Potom nabídne úkoly:

| Článek | Co řeší | URL |
| --- | --- | --- |
| Choose and change a block type | Vybrat typ pro nový text, rozpoznat současný typ a změnit již napsaný blok. Krátké vysvětlení hlavních typů přímo u jejich použití. | `/editor/writing/blocks/` |
| Continue writing | Pokračovat dalším mluvčím nebo stejnou replikou; pochopit rozdíl mezi klávesou na konci textu, uprostřed textu a v prázdném bloku. | `/editor/writing/flow/` |
| Customize your writing flow | Ve Script settings upravit navazující typ bloku a číselnou zkratku; vrátit jednotlivé volby nebo celé nastavení typu na výchozí hodnoty. | `/editor/writing/customize-flow/` |
| Write dialogue and asides | Napsat repliku, vložit poznámku k promluvě a pokračovat dialogem. Vysvětlit význam přepnutí přes Tab v této situaci. | `/editor/writing/dialogue/` |
| Write stage directions | Popsat dění na scéně, odlišit poznámku od Aside a použít dostupné odsazení. Odkázat na postavy a hudbu přímo při potřebě vložit jejich odkaz. | `/editor/writing/stage-directions/` |
| Format your text | Vybrat text, použít dostupné zvýraznění a odstranit ho. Odlišit úpravu vybraných slov od změny typu celého bloku. | `/editor/writing/formatting/` |
| Keyboard shortcuts | Stručná reference se skutečnými podmínkami a odkazy na jednotlivé postupy; rozlišit platformy a nastavitelné zkratky. | `/editor/writing/shortcuts/` |

Pořadí nabízí cestu od základní orientace k běžnému psaní. Přehled zkratek je poslední, protože sám nenahradí vysvětlení úkolů.

## Rozdělení odpovědností mezi články

- **Blocks:** jak zvolit nebo změnit typ; ovládání přes nabídku a rychlá změna. Kompletní výklad všech kombinací kláves zde neopakujeme.
- **Flow:** jak se pokračuje, co vznikne a kam se přesune kurzor. Zde patří prázdný blok, rozdělení již napsaného textu a vliv nastavení následujícího typu.
- **Dialogue:** konkrétní použití Aside a návrat k promluvě. Na flow odkáže u pokračování další replikou.
- **Stage directions:** vlastní význam Tab pro odsazení a odstranění odsazení. `@` vede na hotový návod Characters; `#` na připravovanou oblast Music and lyrics, bez opakování budoucího kompletního postupu.
- **Formatting:** značky ve vybraném textu. Nastavení vzhledu stránek patří do Pages and export.
- **Shortcuts:** orientační tabulka, nikoli další výklad stejných postupů.

Acts a Scenes zmíníme v přehledu typů, ale jejich vytváření, přesouvání a správu necháme v Acts and scenes. Lyrics představíme jako typ pro zpěv; podrobný hudební tok patří do Music and lyrics.

## Jak vysvětlíme obtížně objevitelné chování

Klávesy popíšeme tam, kde řeší konkrétní potřebu. U každé relevantní interakce uvedeme výchozí typ bloku, polohu kurzoru, výsledek a způsob dalšího psaní.

Ze zdrojů editoru už vyplývá:

- Enter na konci obsahu může vytvořit další typ podle nastavení; rozdělení textu uprostřed obvykle zachovává typ. Strukturální bloky mají zvláštní pravidla.
- Enter v prázdných blocích pro psaní má vlastní nabídku. Přesný výběr, dokončení a zrušení ověříme v rozhraní.
- Shift + Enter v Dialogue vytváří další Dialogue. Nebudeme jej automaticky nazývat „zalomením řádku uvnitř stejného bloku“.
- Tab přepíná Dialogue nebo Lyrics na Aside. Návrat z Aside závisí na předchozím obsahu. Enter a Tab proto nepředstavíme jako zaměnitelné klávesy.
- Ve Stage direction Tab přidává odsazení, Shift + Tab ho odstraňuje; implementace povoluje nejvýše dvě úrovně.
- Rychlé přepínání, cyklování a číselné zkratky jsou různé operace. Číselné zkratky používají na macOS Control, na Windows/Linux Alt; jejich přiřazení vychází z nastavení.

Tyto poznatky určují obsah návodů, nikoli hotové uživatelské postupy. Přesné kombinace a viditelné názvy ovládacích prvků doplníme po praktickém ověření.

## Vizuální a jazykové zásady

Použijeme již schválené provedení: bílé klávesy s rámečkem a stínem, symbol klávesy spolu s názvem, tenké skutečné ikony editoru vedle popisků a kód s podbarvením pro všechny konkrétní znaky i ukázkové věty. To platí také pro nadpisy a úvodní popisy.

Typ bloku a název ovládacího prvku jsou názvy rozhraní; odlišíme je od textu, který čtenář píše. Ikona ovládání typu bloku se mění podle aktivního typu, proto ji nebudeme vydávat za jednu trvale stejnou ikonku.

## Ověření před napsáním finálních postupů

Na samostatném zkušebním scénáři ověřit nabídku typů, změnu již napsaného bloku, Enter na konci a uprostřed repliky, nabídku v prázdném bloku, průchod přes Aside, odsazení a jeho odstranění, formátování a zrušení jednotlivých operací. Výchozí chování odlišit od uživatelského nastavení.

Relevantní zdroje:

- `packages/editor/src/editor/tiptap/scriptBlock/handlers/enter.ts`
- `packages/editor/src/editor/tiptap/scriptBlock/handlers/tab.ts`
- `packages/editor/src/editor/tiptap/scriptBlock/handlers/shortcuts.ts`
- `packages/editor/src/editor/tiptap/extensions/EmptyEnterChooserExtension.ts`
- `packages/editor/src/editor/model/blockQuickToggle.ts`
- `packages/editor/src/editor/components/toolbar/BlockTypeSelect.tsx`
- `packages/editor/src/editor/components/blockActions/BlockTypeMenu.tsx`
- `packages/editor/src/editor/components/toolbar/InlineMarksGroup.tsx`
- `packages/script/src/blocks/specs/`

Sidebar nyní obsahuje samostatnou skupinu Writing your script se stránkou Overview a přímými odkazy na sedm návodů. Script settings nevytváří samostatnou kategorii: jednotlivá nastavení patří k příslušným úkolům. Getting started má krátký přehled vstupu do nastavení. Návrh výše zachycuje schválený rozsah; podrobné ověřené postupy jsou v článcích.
