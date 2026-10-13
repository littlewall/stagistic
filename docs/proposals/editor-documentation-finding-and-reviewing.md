# Další kategorie: Finding and reviewing

Stav: návrh členění a příkladu k odsouhlasení. Funkce byly předběžně ověřeny v aktivním toolbaru a komentářovém panelu i v jejich obsluze. Rozcestník, uživatelské články ani navigace zatím nejsou změněné.

## Co má čtenář zvládnout

Najít konkrétní místo ve scénáři, změnit běžnou formulaci a přidat k textu připomínku. Projít komentáře, odpovědět, označit hotovou připomínku a vrátit omylem provedenou textovou úpravu.

Navrhuji šest krátkých článků na `/editor/review/` a plochou skupinu sidebaru jako u ostatních dokončených kategorií. Hledání a nahrazování budou samostatné úkoly. U komentářů oddělíme založení poznámky, práci s jejím vláknem a orientaci mezi více připomínkami.

## Společný příklad

V `The last door` Alex říká `Wait for me.`. Při úpravách chceme najít jeho repliku a vyzkoušet `Give me a moment.`. K vybranému textu přidáme poznámku `Could Alex sound less urgent?`, odpovíme `Changed the line.` a po kontrole vlákno označíme jako vyřešené.

Pro hromadné nahrazování použijeme běžnou frázi, například `a moment` → `a little longer`, s omezením na Dialogue. Přejmenování postavy nebo hudební položky ponecháme jejich vlastní správě.

Příklad navazuje na hotové kategorie, ale každý článek bude fungovat samostatně. Není potřeba přepisovat celý scénář ani dokončit předchozí návod.

## Rozcestník a články

| Článek | Co řeší | URL |
| --- | --- | --- |
| Find text in your script | Otevřít hledání v editoru, zadat frázi, přečíst počet výsledků a přecházet mezi nimi. V kontextu vysvětlit Match case, Match whole word a Search in pro typy bloků; ukázat návrat k plnému hledání. | `/editor/review/find/` |
| Replace text | Rozbalit druhý řádek hledání, zadat náhradu a změnit jeden výskyt nebo všechny výsledky. Vysvětlit platnost filtrů, prázdnou náhradu a návrat pomocí Undo. | `/editor/review/replace/` |
| Add a comment | Vybrat pasáž a přidat komentář přes nabídku u výběru nebo zkratku. Samostatně vysvětlit komentář k celému bloku přes Block actions, dokončení draftu a zrušení. | `/editor/review/comment/` |
| Reply and resolve comments | Odpovědět ve vlákně, upravit zprávu, Resolve a Reopen. Odlišit vyřešení od odstranění, mazání odpovědi od celého vlákna a nabídku Undo po odstranění vlákna. | `/editor/review/threads/` |
| Review your comments | Otevřít Comments, najít připomínku u textu a přepnout Anchored/List. Použít All/Open/Resolved, sbalit či otevřít kartu a najít Detached vlákna, která už nemají odpovídající místo v textu. | `/editor/review/comments-view/` |
| Undo and redo edits | Vrátit textovou změnu nebo nahrazení a znovu ji provést přes toolbar či klávesy. Odlišit historii úprav editoru od Undo v oznámení o odstranění komentáře a od obnovení souboru ze zálohy. | `/editor/review/history/` |

Pořadí vede od nalezení a úpravy textu k poznámkám a jejich zpracování. Poslední článek poskytne cestu zpět, ale předchozí návody na něj odkážou přímo tam, kde uživatel něco mění.

## Flow článků

Zachováme situace → krátký postup → očekávaný výsledek → potřebné podmínky → navazující úkol.

Find text in your script začne potřebou najít `Wait for me.`. Nejprve ukáže základní hledání a přechod na výsledek, teprve potom filtry pro příliš mnoho nebo žádné výsledky. Nezačneme popisem všech ovládacích prvků vyhledávacího pole.

Replace text bude rozlišovat jednu zkoušenou formulaci a hromadnou změnu. Čtenář nejdřív uvidí rozsah výsledků svého hledání a potom zvolí Replace nebo Replace all. Zde patří konkrétní vliv omezení na Dialogue, nikoli obecný technický popis regulárních výrazů.

Add a comment ukáže vazbu připomínky na zvolená slova. Variantu pro celý blok vysvětlí až u potřeby komentovat celou repliku. Reply and resolve comments pak pokračuje životem téže připomínky, zatímco Review your comments řeší orientaci v celém souboru poznámek.

## Obtížně objevitelné chování v kontextu

- **Hledání:** editor má vlastní hledání ve scénáři, odlišné od hledání názvu scénáře na domácí stránce a od hledání v knowledge base.
- **Výsledky:** Enter v hledacím poli přechází dopředu, Shift + Enter zpět. Filtry podle typu bloku a shody slov mohou měnit počet výsledků; potřebujeme ukázat jejich odstranění.
- **Náhrada:** pole Replace with je v rozbalitelném řádku. Enter v tomto poli nahrazuje výskyt, Command/Ctrl + Enter všechny výsledky. Význam téže klávesy závisí na poli, ve kterém je fokus.
- **Rozsah:** hledání pracuje s běžným textem bloků; inline hudební pill přerušuje textový úsek a není nahrazována jako jeho název. Správu názvů entit odkážeme do Characters a Music and lyrics.
- **Draft komentáře:** výběr pasáže a komentář k celému bloku jsou různé způsoby ukotvení. Přesné chování bez výběru, při změně výběru a při zrušení ověříme před finálním postupem.
- **Vlákno:** Resolve ponechá připomínku jako vyřešenou. Reopen ji vrací do otevřeného stavu; u vyřešené karty se nyní nezobrazuje pole pro odpověď.
- **Zobrazení:** Anchored zarovnává karty k jejich místům ve scénáři. List umožní systematický průchod podle scén a zahrnuje i Detached komentáře. Filtr stavu platí pro procházený soubor připomínek.
- **Změna textu:** pokud připomínka ztratí ukotvení, nebudeme tvrdit, že se automaticky odstraní. Vysvětlíme hledání ve skupině Detached podle skutečné implementace.
- **Odstranění:** po odstranění vlákna aplikace nabízí Undo v oznámení. Tento postup odlišíme od toolbaru Undo pro úpravy scénáře.
- **Historie:** nebudeme slibovat, že Undo vrací každou změnu nastavení, přílohu nebo trvale uchovává verze scénáře. Popíšeme skutečný rozsah historie textového editoru a odkážeme na vlastní zálohu.

## Hranice vůči ostatním kategoriím

- Scripts and files řeší hledání scénáře v knihovně a vlastní soubory či zálohy. Zde hledáme a revidujeme obsah otevřeného scénáře.
- Writing your script řeší psaní a formátování. Zde jsou navazující revize, komentáře a návrat provedených textových úprav.
- Characters a Music and lyrics řeší přejmenování propojených entit. Náhradu obyčejné formulace nebudeme představovat jako náhradu těchto operací.
- Acts and scenes a Music and lyrics poskytují strukturální navigaci. Zde jde o nalezení textu a připomínek, bez opakování jejich sidebarů.
- Pages and export řeší výslednou podobu dokumentu. Zde nebudeme slibovat export komentářů bez ověření dostupného výstupu.
- Komentáře popíšeme jako poznámky uložené u scénáře. Nepředpokládáme živou spolupráci účtů ani cloudové sdílení.

## Vizuální a jazykové zásady

Anglické články, schválené bílé klávesy se symbolem a názvem, tenké skutečné ikony ovládání bez textu a kód pro psané fráze i příklady komentářů. Stejné provedení platí v nadpisech a descriptions.

Zkratky vždy popíšeme s platformou a místem fokusu. Ovládání pro otevření nahrazování se na macOS a Windows/Linux liší. Tři tečky pro akce vlákna a trychtýř filtru ukážeme podle skutečných komponent, ne univerzální náhradní ikonkou.

## Ověření před psaním

Ověřit aktivní hledání a klávesy přes useEditorSearch, rozsah a výsledky filtrů, přechod do sbalené scény, nahrazení jednoho i všech výsledků, prázdnou náhradu a Undo. U komentářů ověřit výběr slov i celý blok, dokončení/zrušení draftu, odpověď a její editaci, Resolve/Reopen, oba režimy zobrazení, filtry, Detached, odstranění zprávy i vlákna a obnovu přes oznámení. Před tvrzením o historii po zavření editoru ověřit její životnost.

Případný živý průchod pouze na zkušebním scénáři po novém předání sdíleného prohlížeče. Bez něj označit ověření jako kontrolu podle aktivních zdrojů a relevantních existujících testových očekávání.

Zdrojové body:

- `packages/editor/src/editor/components/EditorToolbar.tsx`
- `packages/editor/src/editor/hooks/useEditorSearch.ts`
- `packages/editor/src/editor/model/toolbarShortcutLabels.ts`
- `packages/editor/src/editor/tiptap/extensions/search/`
- `packages/ui/src/molecules/SearchControl/`
- `packages/editor/src/editor/components/SelectionToolbarOverlay.tsx`
- `packages/editor/src/editor/components/blockActions/commentActions.ts`
- `packages/editor/src/editor/components/CommentMarkersOverlay.tsx`
- `packages/editor/src/editor/tiptap/extensions/comments/`
- `packages/app-routes/src/routes/script/editor/comments/`
- `packages/db/src/repo/comments.ts`

## Další krok po odsouhlasení

Ověřit konkrétní postupy, napsat rozcestník a šest článků, doplnit sidebar a kontextové odkazy. Potom provést nezávislou obsahovou kontrolu a kontroly projektu docs.
