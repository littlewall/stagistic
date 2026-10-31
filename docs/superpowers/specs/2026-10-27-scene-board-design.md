# Board — přehled scén po aktech

Nový pohled skriptu vedle Editoru a Exportu. Digitální obdoba autorovy zdi: scény po aktech, outline scény, barevné lístečky postav. Board je živý (vždy odpovídá aktuálnímu scénáři) a je to pracovní plocha, ne jen přehled.

## Cíl a hranice

- Přepínač pohledů v hlavičce: **Editor · Board · Export**. Cesta `/script/:scriptId/board/:lens`, výchozí lens `wall`. Totéž pod `/snapshots/:snapshotId` jen pro čtení.
- Board má čtyři pohledy (lens): **Wall · Matrix · Arcs · Numbers**.
- Akty a scény se vždy odvozují ze scénáře (`buildScriptStructureOutline`). Board nemá vlastní seznam scén. Přidat scénu na boardu = vložit scene heading do scénáře.
- Uživatelská metadata (outline scény, věty postav, ruční přítomnost, hodnoty oblouků) jsou v DB a navázaná na identitu scény. `SCRIPT_DOCUMENT_SCHEMA_VERSION` se nemění.
- Mimo rozsah: French scenes, samotné mazání scén na boardu (board jen přenese do editoru), přesun aktů, oblouky dějových linií (jen postavy), skupiny postav jako samostatné položky, tisk a export boardu.

## Research (shrnutí)

- Rozložení „sloupce/sekce aktů s kartami“: Final Draft Beat Board, Arc Studio Plot Board, Scrivener Corkboard. Rozložení „matice scéna × linie/postava“: Plottr, Dabble, ručně kreslená tabulka J. K. Rowlingové, dramaturgická konfigurační matice (Pfister, Marcus).
- Živá vazba: nejlíp funguje model WriterDuet (karty jsou filtrovaný pohled na tentýž dokument). Jednorázové „Send to Script“ z Final Draftu je příklad, jak to nedělat.
- Úrovně zapojení postav: Aeon Timeline (participant / observer), Story Grid (on-stage / off-stage referred).
- Automatickou přítomnost postav odvozenou ze scénáře nedělá žádný zkoumaný nástroj. Plottr neumí založit postavu přímo z karty.
- Oblouky: Arc Studio Story Arcs. Osa X jsou beaty, tečku lze táhnout nahoru/dolů, osa Y nemá definovaný význam, tečky jedné linie spojuje čára.

## Model postav ve scéně

### Doklad ve scénáři

Postava je ve scéně podle scénáře, když v ní má:

- repliku (cue v bloku `character`), nebo
- character tag v režijní poznámce (`stageDirection`; jinam tag napojit nejde).

Jiné bloky (`note`, `dialogue`, `lyrics`, `aside`) se nepočítají. Úroveň „zmíněná“ se ruší. Scéna sahá od svého scene headingu po další scene heading nebo act heading. Doklad pro skupinu (`kind = group`) platí pro každého jejího člena.

### Záznam na kartě (DB)

Záznam na dvojici scene heading × postava existuje, když uživatel postavu na kartu přidal nebo jí napsal větu:

- `note`: jedna věta (posun nebo motivace postavy ve scéně), nebo prázdné;
- `arcValue`: celé číslo −3 až +3, nebo prázdné (pro Arcs).

Existence záznamu znamená „postava je na kartě“. Záznam nezávisí na scénáři: když uživatel postavu ze scény ve scénáři smaže, záznam i věta zůstanou. Udržovat je aktuální je na uživateli; Board jen ukáže rozdíl.

### Výsledné zobrazení

| Stav | Zobrazení |
|---|---|
| Ve scénáři, bez záznamu | plné kolečko |
| Ve scénáři, se záznamem | plné kolečko a věta |
| Jen záznam, bez dokladu ve scénáři (přidaná ručně nebo ze scénáře smazaná) | prázdné kolečko, případně věta |

- Postavu s dokladem ve scénáři z karty odebrat nejde; jde jen smazat její věta (a oblouk). Postavu bez dokladu jde z karty odebrat (smaže záznam).
- Nepotvrzené postavy (klíč bez záznamu v katalogu) se zobrazí neutrálně, bez editace. Potvrdit je jde přímo z čipu.
- Board pracuje jen s jednotlivými postavami; skupiny se nezobrazují na Wall, v Matrix, v Arcs ani v Numbers.
- Pořadí na kartě: postavy s větou podle první repliky ve scéně (bez repliky na konec), pak stack ostatních ve scénáři, pak ostatní jen na kartě.
- Filtr postav počítá i postavy jen na kartě.

### Identita scény

Záznamy (věty, outline, barva, místa) visí na ID scene headingu:

1. **Rozdělení scény** (nový heading uprostřed): nová scéna nemá nic, původní si nechá vše. Postavy, jejichž repliky odešly do nové scény, mají v původní prázdné kolečko.
2. **Smazání headingu** (scéna splyne s předchozí): metadata se smažou; modaly pro smazání a převod headingu to řeknou.
3. **Undo smazání**: heading se vrátí se stejným ID a s ním i metadata. Smazání je proto jen deaktivace; definitivně se metadata neaktivních scén mažou až při vytvoření draftu nebo verze.
4. **Kopie scény** (copy/paste): vložený heading dostane nové ID a metadata se nekopírují.
5. **Přesun scény** ID zachová, metadata jdou s ní.

## Wall

- Akty jsou sekce pod sebou. Uvnitř sekce jsou karty scén v mřížce s pevnou šířkou karty, zalamované zleva doprava. Scény před prvním aktem se řídí výchozím aktem z `buildScriptStructureOutline`.
- **Hlavička aktu**: název (přejmenování na místě), menu se smazáním aktu. Smazání se nejprve zeptá: první skutečný akt (výchozí sekce bez headingu se nepočítá, i když před ním scény jsou) nechá své scény bez aktu, pozdější je předá předchozímu skutečnému aktu; žádná scéna se nemaže. Potvrzení i zrušení (Escape) funguje, undo vrátí i akt. Smazání odstraní jen act heading, scény zůstanou (stejně jako v editoru). (Potvrzovací modal přidán na přání uživatele 30. 10. 2026.)
- **Nový akt**: „+ Add act“ na konci boardu (a před scénami bez aktu, viz dále). „+ Add act“ je sázené jako název aktu (eyebrow, stejná výška řádku) a stojí tam, kde by stál další název aktu. Scény před prvním aktem (např. po smazání prvního aktu) mají místo názvu totéž tlačítko; přidá act heading před ně. (Akt založený přímo u scény „Start new act here“ z menu karty odebrán na přání uživatele 30. 10. 2026.)
- **Přejmenování na místě** (akt i scéna): text se stane editovatelným tam, kde stojí (contenteditable, jen prostý text na jednom řádku), takže se nic neposune. Editaci ukazuje jemné podbarvení. Enter i opuštění pole uloží, Escape vrátí původní název. Mezera na začátku ani dvojitá mezera se nenapíše. Prázdný název scény se nepřijme.
- **Karta scény**:
  - číslo scény, název (text scene headingu, přejmenování na místě), počáteční strana „p. 12“ (dokud strana není známá, nezobrazí se nic);
  - outline (= `script_scenes.synopsis`), víceřádková editace na místě (Enter = nový řádek, uloží opuštění pole nebo Cmd/Ctrl+Enter, Escape zruší). Prázdný outline drží jeden řádek a „Add scene outline“ ukáže jen při hoveru nebo fokusu karty;
  - postavy podle modelu výše: postavy s větou jako řádky (barevná linka vlevo, jméno, věta; u postavy jen na kartě čárkovaná linka), ostatní jako kolečka (plné ve scénáři, prázdné jen na kartě). Na editovatelném Boardu je každé kolečko samostatné tlačítko, kolečka se proto nepřekrývají; read-only Board má jedno tlačítko se jmény. Klik na kolečko nebo řádek otevře popover: věta (uloží se zavřením popoveru i kliknutím mimo nebo Cmd/Ctrl+Enter, Escape zahodí), „Remove from card“ jen pro postavu bez dokladu, „Clear note“ pro postavu ve scénáři s větou (bez oblouku se záznam smaže celý), u nepotvrzené postavy jen „Confirm character“;
  - přidání postavy: nenápadné „+“ za kolečky (viditelné při hoveru nebo fokusu karty) otevře hledání s potvrzenými postavami, které na kartě nejsou; psaní zaměří první shodu. Neznámé jméno nabídne „Create “NAME”“; jméno, které už má postava nebo skupina, ne. Nová postava nemá uloženou barvu, dostane barvu z palety editoru odvozenou z ID (stejně jako každá potvrzená postava bez barvy);
  - akce „Open in Editor“ skočí na scene heading v editoru;
  - menu karty nic nemaže ani nezakládá: smazání scény se děje v editoru, kde autor vidí celý obsah scény, akty mají vlastní tlačítka a menu. („Start new act here“ i „Delete scene…“ z menu karty odebrány na přání uživatele 30. 10. 2026; dříve „Delete scene…“ jen přepínala do editoru.)
- **Vložení scény**: před každou kartou je v mezeře nenápadný svislý proužek; pod kurzorem nebo při fokusu se přes okraje karet rozšíří do průsvitného proužku s „+“ a tooltipem „Add scene“. Za poslední scénou aktu je čárkovaná karta „+ Add scene“ (v prázdném aktu jediná). Obojí otevře na daném místě kartu s polem pro název, tlačítkem ⏎ a ✕. Enter s neprázdným názvem vloží scene heading, Escape zruší bez zásahu do dokumentu.
- **Přesun scény**: drag & drop karty v rámci aktu i mezi akty, také z klávesnice (jako structure sidebar). Přesouvá se celý segment scény (`moveSceneSegment`). Úchytem je celá karta (kromě tlačítek a názvu v editaci); název přejde do editace až kliknutím, takže kartu jde táhnout i za něj. Během tažení se ostatní karty průběžně odsouvají (i mezi akty) a čárkovaná kopie tažené karty stojí tam, kam by scéna dopadla; tažená karta má stín. Proužky pro vložení scény jsou během tažení skryté. Zrušení (Escape) vrátí původní pořadí, dokument se mění až po puštění.
- **Filtr postav** (více postav): scény s vybranou postavou zvýrazní její větu a ostatní postavy ztlumí. Scény bez ní se sbalí do tenkého řádku (číslo a název), mezery v jejím příběhu tak zůstanou vidět.
- Šířka karty 18rem.

## Lišta Boardu (varianta A)

Mockup: lišta s menu, schválená 2026-10-27.

- Jeden řádek pod hlavičkou aplikace, oddělený hairline. Vlevo záložky pohledů (Wall · Matrix · Arcs · Numbers), aktuální má ink podtržení (navigace, ne výběr). Zobrazují se jen hotové pohledy.
- Vpravo dvě tlačítka: **filtr postav** a **View**.
- **Filtr postav**, stavy tlačítka:
  - nic nevybráno: „Characters ▾“;
  - jedna postava: barevná tečka + jméno + ▾;
  - víc postav: překrývající se barevné tečky vybraných postav + počet („3 characters“) + ▾;
  - při výběru má tlačítko stav výběru (Creamed Corn) a ✕ „Clear character filter“ je uvnitř ovládacího prvku mezi popiskem a šipkou ▾ (vizuálně jeden prvek, v DOM samostatné tlačítko, ne vnořené). Šipka zůstává na pravém okraji, nic na konci lišty neposkakuje.
- **Popover filtru**: vyhledávací pole „Find character…“, seznam postav (zaškrtávátko, barevná tečka, jméno, „N scenes“), vybrané řádky ve stavu výběru, dole „Clear filter“. Pořadí podle prvního výskytu ve scénáři, postavy bez scén na konci.
- **Popover View**, nadpis „Show on cards“: nezávislá pozitivní zaškrtávátka, každé něco přidává. Outline (od kroku 3) a „Characters“ (postavy na kartě). Bez vnoření a bez neaktivních stavů. Nahrazuje přepínač hustoty. Volba „Mentioned characters“ s krokem 3 zmizí spolu s úrovní „zmíněná“.
- Počáteční strana pochází ze stránkování editoru (`scenePlacement.startPage`). Číslování se může lišit od exportu. Když stránkování není k dispozici nebo je po změně na boardu zastaralé, karta stranu neukazuje.

## Matrix

- Řádky jsou postavy (pořadí podle prvního výskytu), sloupce scény s nenápadným oddělením aktů.
- Buňka: ■ s větou (plná barva), ● ve scénáři, ○ jen na kartě (bez dokladu ve scénáři), prázdná buňka = postava ve scéně není.
- Hover ukáže větu. Klik otevře stejný popover jako čip na Wall.
- V hlavičce řádku je jméno, barva a počet scén.

## Arcs

- Osa X jsou scény se stejnými rozestupy a nenápadnými svislými předěly mezi akty. Osa Y je obecné „lépe ↑ / hůře ↓“ se 7 úrovněmi (−3 až +3), na které se body přichytávají.
- Jedna čára na postavu v její barvě. Čára spojuje sousední body postavy přes scény bez bodu.
- **Aktivní postava**: vždy právě jedna, vybraná v legendě.
  - Aktivní čára je plná a silnější, ostatní ztlumené a needitovatelné.
  - Při najetí do grafu se ukáže „duch“ bodu v barvě aktivní postavy se jménem u kurzoru, přichycený na úroveň.
  - Klik do sloupce scény přidá bod, tah ho posune, smazat ho jde z popoveru nebo klávesou Delete.
  - Klik na ztlumenou čáru nebo bod přepne aktivní postavu.
- Bod ve scéně, kde postava není přítomná, je dutý (změna mimo scénu).
- Hover ukáže postavu, scénu, hodnotu a větu ze Wall.
- Klávesnice: šipky nahoru/dolů mění hodnotu, doleva/doprava přesouvají fokus mezi scénami, výběr aktivní postavy jde přes legendu.
- Legenda zároveň slouží jako filtr zobrazených postav.

## Numbers

- Seznam hudebních čísel s názvem, aktem, scénou, počáteční stranou a zpívajícími (postavy s cue v blocích `lyrics` čísla).
- Klik skočí na číslo v editoru. Ve v1 jen pro čtení.

## Sdílené chování

- Výběr postav ve filtru je společný pro Wall, Matrix a Arcs a pamatuje si se lokálně pro každý skript.
- Board uložené verze nebo snapshotu je jen pro čtení, bez editačních ovládacích prvků.
- Prázdný stav: tichá věta a akce pro vložení první scény, žádná uvítací grafika.
- Typografie, barvy a plochy podle PRODUCT.md a structure sidebaru. Barvy postav z `script_characters.color_hex`.

## Architektura

### Úpravy dokumentu mimo editor

Aktuální obsah dokumentu žije v cachované instanci editoru (`editorSurfaceCache`), ne ve workspace. `initialValue` je stav při načtení. Příkazy (`insertAct`, `renameAct`, `deleteAct`, `moveScene`) dnes běží jen v namountovaném editoru (`useBuildActCommands`), stejně jako publikace živého snapshotu a stránkování.

Návrh, který plán ověří:

- Workspace vystaví „script session“ nad instancí editoru z cache. Když instance neexistuje (Board otevřený jako první), vytvoří ji bez připojení do DOM.
- Board přes ni volá příkazy: `renameScene`, `insertScene`, `moveScene`, `insertAct`, `renameAct`, `deleteAct`. Úpravy jdou do historie editoru, takže Cmd+Z na boardu vrací i změny z editoru.
- Autosave musí běžet i bez namountovaného editoru.
- Board si model počítá sám z dokumentu session při každé změně, nezávisle na `EditorLiveSnapshot`. Počáteční strany čte z posledního snapshotu.
- Úpravy metadat (outline, věty, přítomnost, oblouky) jsou zápisy do DB a nejsou součástí undo historie dokumentu.
- Optimistická odezva (30. 10. 2026): outline, věty i přidání/odebrání postav se na kartě promítnou okamžitě a ukládají se na pozadí přes stejné reaktivní kolekce jako v Editoru. Při chybě se vrátí poslední uložená hodnota; starší zápis ani jeho chyba nesmí přepsat novější úpravu. Nová postava je na kartě vidět už během zakládání v katalogu; zápis přiřazení čeká na její úspěšné založení. Odebrání během ukládání platí i po jeho dokončení.
- Zápisy metadat používají společný indikátor Editoru a Boardu (31. 10. 2026): u pomalejšího zápisu spinner po 600 ms, po úspěchu zelená tečka na 1,2 s, při chybě červená tečka. „Saved“ je tooltip, ne nový viditelný nápis. Počítají se všechny souběžné zápisy včetně potvrzení postavy a jejího přiřazení; chyba v téže skupině přetrvá i po úspěchu jiného zápisu. Přepnutí Editor ↔ Board probíhající ukládání nepřeruší.

### Čistý model

`buildSceneBoardModel(document, characterCatalog, sceneMetadata)` v `packages/script` vrátí akty, scény, doklady postav a výsledné úrovně. Je bez Reactu a DOM a testuje se jednotkově. Wall, Matrix, Arcs i Numbers čtou stejný model.

### Data

- **Outline**: existující `script_scenes.synopsis`. Přibude zápisové API v repository (podle vzoru `replaceSceneAssignments`, klíč `sceneHeadingBlockId`) a reaktivní zdroj + hook v `app-core`.
- **Záznamy postav**: nová tabulka `script_scene_characters`: `script_id` (FK `scripts`, cascade), `heading_block_id`, `character_id` (FK `script_characters`, cascade), `note`, `arc_value`, `created_at`, `updated_at`; PK (`script_id`, `heading_block_id`, `character_id`). Bez FK na `script_scenes`, aby smazání headingu záznamy hned nezničilo. Aktivní jsou záznamy, jejichž heading je v dokumentu.
- **Deaktivovaná metadata scén**: projekce dnes řádky zmizelých scén maže i se synopsí, barvou a místy. Nová tabulka `script_detached_scenes` (`script_id`, `heading_block_id`, `synopsis`, `color_hex`, `location_ids`, `detached_at`) je při zmizení scény převezme a při návratu headingu se stejným ID vrátí.
- **Úklid**: vytvoření draftu nebo verze (včetně záložního draftu při obnovení) smaže neaktivní záznamy postav i řádky `script_detached_scenes` daného skriptu. Snapshot obsahuje jen aktivní data.
- Po změně schématu spustit `moon run db:db-compile-migrations`.
- **Stepkg**: nová volitelná sekce `data/scene-characters.json` (`sceneCharacters.v1`), jen aktivní záznamy. Import starších balíčků bez sekce funguje. Remap ID bloků a postav ji zahrnuje. Duplikace skriptu ji kopíruje.
- **Undo**: změny metadat (outline, věty) nejsou v historii dokumentu; v poli platí Escape a vlastní undo prohlížeče.

## Rizika

- **Úpravy bez namountovaného editoru** (undo, autosave, instance bez DOM). Plán musí nejdřív ověřit tuto cestu, před jakoukoli editací na boardu.
- **Identita scény**: metadata visí na `headingBlockId`; pravidla viz „Identita scény“. Copy/paste musí headingu přidělit nové ID (ověřit v plánu).
- **Stránkování** se počítá jen v namountovaném editoru. Po změně struktury na boardu jsou strany do návratu do editoru zastaralé, případně se stránkování spustí na pozadí.
- **Výkon**: model se přepočítává při každé změně dokumentu. Přepočet má být inkrementální nebo debounce, aby velké skripty nezpomalily editor.

## Pořadí dodávek

Každý krok lze samostatně mergnout.

1. **Wall jen pro čtení**: route, přepínač v hlavičce, `buildSceneBoardModel`, sekce aktů, karty s názvem, stranou a automatickými postavami, filtr, hustota, Open in Editor a Delete scene… (obojí jen navigace). Outline přijde až s metadaty v kroku 3, protože pro `synopsis` zatím neexistuje čtecí ani zápisové API.
2. **Script session a editace struktury**: přejmenování a vložení scény, přesun scény, nový, přejmenovaný a smazaný akt, undo.
3. **Metadata scén a postav**, ve dvou mergnutelných částech:
   - **3a data**: tabulky, API, deaktivace a úklid, stepkg, modaly, zrušení úrovně „zmíněná“;
   - **3b karta**: outline, věty, přidání a odebrání postavy, založení nové postavy, volba Outline.
4. **Matrix.**
5. **Arcs.**
6. **Numbers.**

## Akceptační kritéria

- Změna ve scénáři (nová replika, přejmenovaný scene heading, nový akt) se po návratu na Board projeví bez reloadu.
- Přesun karty na boardu přesune celý segment scény ve scénáři. Cmd+Z ho vrátí.
- Scéna vložená na boardu je v editoru normální scene heading na správném místě.
- Postava s replikou je na kartě vždy. Ručně přidaná postava bez dokladu má čárkovaný okraj, který zmizí po napsání její repliky.
- Věty, outline a oblouky přežijí přesun scény, reload, snapshot a obnovení verze.
- V Arcs je vždy jasné, které postavě patří přidávaný nebo posouvaný bod.
- Board uložené verze nejde editovat.
- Kontroly: `moon run root:typecheck`, `moon run root:lint`, `moon run root:test`, `moon run app-routes:test-browser`, pro DB `moon run db:test`.
