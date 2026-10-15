# Další kategorie: Pages and export

Stav: schváleno 13. října 2026; rozcestník, osm článků, plochá skupina sidebaru a kontextové odkazy jsou připravené. Postupy byly ověřeny podle aktivních nastavení, exportních plánů a generování PDF. Záznam kontrol je v `docs/superpowers/plans/2026-10-13-pages-and-export-documentation.md`.

## Co má čtenář zvládnout

Připravit čitelné PDF pro zkoušku: zkontrolovat výstup, upravit podobu stránek, doplnit úvodní informace a případně vytvořit výtisk pro jednu postavu nebo scénář s vloženými notovými přílohami.

Zachováme zavedený formát krátkých úkolových článků a plochou skupinu sidebaru na `/editor/export/`. Rozcestník umožní dvě běžné cesty: „chci hned PDF“ a „potřebuji upravit jeho podobu“. Nevytváříme nový systém dokumentace ani obecnou kategorii Script settings; potřebná nastavení vysvětlíme u jejich účelu.

## Společný příklad

`The last door` je připravený ke zkoušce. Nejprve stáhneme celý scénář jako PDF. Potom doplníme autora a datum verze, nastavíme A4 a zkontrolujeme čitelnost replik. Pro herce připravíme výstup se scénami, ve kterých se Alex objevuje, se stránkováním odpovídajícím úplnému scénáři. Pro hudební zkoušku použijeme Integrated score s přílohou k `Opening`.

Každý článek má vlastní stručný vstup a funguje samostatně. Čtenář nemusí postupně projít celé nastavení ani přepsat ukázkový scénář.

## Rozcestník a články

| Článek | Co řeší | URL |
| --- | --- | --- |
| Preview and download a PDF | Otevřít Export, použít Basic, zkontrolovat náhled a stáhnout PDF. Přechod mezi stránkami, zadání čísla stránky, zoom a stav přípravy výstupu. | `/editor/export/pdf/` |
| Set up script pages | Zvolit A4 nebo US Letter, upravit okraje a podle potřeby podobu konkrétního typu bloku: odsazení, řádkování a mezery. Oddělit nastavení celé kategorie Dialogue od formátování vybraných slov. | `/editor/export/layout/` |
| Prepare the title page | Doplnit titul, podtitul, autorské údaje, zdroj, kontakt, copyright, logo a datum verze. V kontextu vysvětlit pevné datum versus Automatic date of export. | `/editor/export/title-page/` |
| Set headers and footers | Vybrat oblast kliknutím v náhledu, napsat text a vložit Script title nebo Draft date pomocí ovládání. Vysvětlit vyhrazené oblasti číslování a jejich formátování. | `/editor/export/headers-footers/` |
| Add introductory pages | V Exportu zapnout Characters, Places, Contents nebo Vocal ranges. Zvolit obsah a pořadí, vysvětlit odkud se údaje berou a jak souvisejí s Initial pages v nastavení scénáře. | `/editor/export/initial-pages/` |
| Export for selected characters | Zapnout Selected characters only, vybrat Alexe a porovnat výstup s Preserve full-script pagination a bez něj. Vysvětlit rozsah filtru podle skutečného chování replik a dalších bloků. | `/editor/export/characters/` |
| Control page breaks and blank pages | Nechat scény začínat na nové nebo liché stránce, nastavit lichý začátek úvodních stran a mezilehlé prázdné stránky. Vysvětlit automaticky přidanou vyrovnávací stránku a indikátor `+1`. | `/editor/export/page-breaks/` |
| Include integrated scores | Vybrat Integrated score, zkontrolovat hudební přílohy, použít Review missing music a ověřit výsledek v náhledu. Doplnění přílohy odkáže do Music and lyrics. | `/editor/export/integrated-score/` |

První článek dá uživateli rychle použitelný výstup. Další články řeší jednotlivé potřeby při jeho úpravě; nejde o povinný osmibodový průvodce.

## Flow a rozsah

Zachováme situace → krátký postup → očekávaný výsledek → potřebné podmínky → navazující úkol.

**PDF:** začneme potřebou poslat scénář na zkoušku. Základní postup nezatížíme všemi exportními volbami. Za kontrolou náhledu nabídneme odkazy podle problému: nevhodné okraje, chybějící údaje, potřeba výtisku pro jednu postavu nebo hudebních příloh. Tisk zmíníme jako následnou práci se staženým PDF, ne jako neověřené samostatné tlačítko editoru.

**Podoba stránek:** vysvětlíme rozdíl mezi nastavením dokumentu a nastavením konkrétního exportu. U vzhledu bloků použijeme malou změnu Dialogue a ukážeme její dopad. Ovládání Next element a Shortcut patří do již hotového Writing your script; tady se znovu nevysvětluje.

**Úvod dokumentu:** title page oddělíme od automaticky sestavených přehledů. Údaje uživatel vyplňuje ve scénáři, zatímco v Exportu rozhoduje o zařazení a podobě přehledů. Contents může obsahovat scény, hudební čísla nebo obojí; před psaním ověříme také vazbu na stránkování výsledného výstupu.

**Výtisk pro postavu:** začneme potřebou, aby se Alex při zkoušce orientoval podle stejných stran jako ostatní. Preserve full-script pagination vysvětlíme na konkrétním výsledku a poté ukážeme variantu bez zachování rozmístění. Nebudeme předem slibovat, že filtr odstraní všechny bloky, ve kterých Alex nemluví; jeho přesný rozsah ověříme v exportním plánu.

**Hudební výstup:** nepřepisujeme návod na přidávání příloh. Ukážeme, kdy vybrat Integrated score, proč nestačí libovolná hudební PDF příloha a jak se z upozornění dostat přímo ke konkrétní hudební položce.

## Obtížně objevitelné chování v kontextu

- **Nastavení versus export:** podobu scénáře a volby aktuálního výstupu budeme rozlišovat u konkrétních postupů. Před finálním textem ověříme jejich uložení, potvrzení a chování při přepnutí šablony či opětovném otevření Exportu.
- **Náhled:** výstup se po změně voleb připravuje znovu. Postup uvede očekávaný stav a kdy je dostupné Download PDF; nezaměníme starý viditelný náhled za zaručeně dokončený nový výstup.
- **Show notes:** pracuje s bloky Note ve scénáři. Není to přepínač komentářových vláken z Finding and reviewing.
- **Záhlaví a zápatí:** nejdřív se vybírá konkrétní oblast v náhledu. Proměnné se vkládají tlačítky; uživatel nemusí psát jejich technickou syntaxi. Některé oblasti mají pevný význam pro čísla stránek.
- **Datum:** Automatic date of export je odlišné od pevně zadaného data verze. Dopad na title page a vložené Draft date ověříme společně.
- **Přehledy:** exportní volby určují zahrnutí Characters, Places, Contents a Vocal ranges. Údaje o postavách, místech a hudbě se spravují v příslušných částech editoru; návod nabídne přímé odkazy, pokud přehled není úplný.
- **Filtrovaný výstup:** zapnutí Selected characters only nabídne výběr postav. Preserve full-script pagination umožňuje zachovat vztah ke stránkám úplného scénáře. Před psaním ověříme společné repliky, skupiny, nepotvrzené postavy a případ bez vybraných postav.
- **Liché stránky:** při zarovnání mohou vzniknout prázdné strany navíc. Indikátor `+1` vysvětlíme u výsledku, nikoli jako samostatnou „skrytou funkci“.
- **Integrated score:** upozornění uvádí chybějící Integrated score PDF; Review missing music nabídne přímé otevření konkrétní položky ve správci. Ověříme umístění příloh i chování, když některá chybí.

## Hranice vůči ostatním kategoriím

- Scripts and files řeší editovatelné soubory a zálohy. PDF představíme jako výstup k předání a tisku, s přímým odkazem na stažení editovatelného balíčku.
- Writing your script řeší psaní, formátování výběru a flow bloků. Zde se věnujeme celkové podobě stránky a výstupu.
- Characters a Acts and scenes poskytují zdrojové údaje pro přehledy. Neopakujeme jejich správu ani vysvětlování skupin.
- Music and lyrics řeší připojení a typ hudební přílohy. Zde ji zahrnujeme do konkrétního PDF výstupu.
- Finding and reviewing řeší připomínky. Bez ověřené podpory neslibujeme jejich zařazení do PDF.
- Neotevíráme technický popis sazebního systému ani Stagistic Syntax.

## Vizuální a jazykové zásady

Anglické články, stejné bílé klávesy se symbolem a názvem, skutečné tenké ikony u ovládání bez textu. Psané hodnoty a příklady patří do kódu, včetně nadpisů a descriptions. Názvy ovládacích prvků odpovídají editoru.

Screenshoty mohou později pomoci u schématu stránky a výběru oblastí záhlaví. Návrh na ně nespoléhá; základní postup musí být srozumitelný samostatně.

## Ověření před psaním

Projít aktivní vstup do Exportu a nastavení, uložení změn, layout a styl jednotlivých bloků, title page a její datum/logo, vyhrazené buňky záhlaví a zápatí, počáteční stránky a jejich zdrojová data. Potom ověřit filtr postav včetně společných replik, chování číslování, liché začátky a vyrovnávací prázdné strany, zařazení Integrated score příloh, chybějící přílohy a aktuálnost stahovaného náhledu.

Zdrojové body:

- `packages/app-routes/src/routes/script/settings/panels/registry.tsx`
- `packages/app-routes/src/routes/script/settings/ScriptSettingsModalProvider.tsx`
- `packages/app-routes/src/routes/script/settings/panels/page-layout/`
- `packages/app-routes/src/routes/script/settings/panels/element/`
- `packages/app-routes/src/routes/script/settings/panels/document-info/`
- `packages/app-routes/src/routes/script/settings/panels/header-footer/`
- `packages/app-routes/src/routes/script/settings/panels/initial-pages/`
- `packages/app-routes/src/routes/script/export/`
- `packages/export/src/plan/`
- `packages/export/src/transcript/`
- `packages/export/src/initialPages/`
- `packages/export/src/titlePage/`

Předběžná kontrola je podle zdrojů, nikoli živý průchod či vizuální ověření. Sdílený prohlížeč zůstává nedotčený do nového předání.

## Ověřené upřesnění při psaní

- Filtr postav zachovává celé scény s odkazy na vybrané postavy nebo jejich skupiny a příslušné akty. Nevytváří výpis samotných replik; ostatní řečníci a scénické poznámky v zachovaných scénách zůstávají.
- Preserve full-script pagination ponechá původní reference a rozmístění uvnitř zachovaných stran a skryje bloky nezahrnutých scén. Částečně zachovaná strana může mít volná místa; celé strany s pouze vynechaným obsahem se odstraní. Zarovnávací prázdné strany mohou zůstat. Bez této volby se zachované scény znovu vysází.
- Výběr nabízí potvrzené jednotlivé postavy. Contents používá filtrovaný scénář, zatímco přehledy postav, míst a hlasových rozsahů čerpají z úplných údajů scénáře.
- Exportní skupiny se skutečně jmenují Content, Opening pages a Page flow. Zařazení a podobu počátečních stran PDF řídí Opening pages; podobně pojmenovaný panel Initial pages v Script settings není přepínačem zařazení do exportu.
- Script settings se ukládá automaticky. Nastavení aktuálního exportu se zachová při přepnutí šablony, ale po opuštění a novém otevření Exportu začíná Basic s výchozími volbami.
- Během přepočtu i po chybě může zůstat starší PDF. Články proto uvádějí čekání na dokončení aktualizace a kontrolu nového náhledu před stažením; dostupnost Download PDF není potvrzením dokončení nové verze.
- Show notes ovládá bloky Note, nikoli komentáře. Hide in editor v záhlaví/zápatí neodstraní obsah z PDF.
- Title je zároveň názvem scénáře. Logo přijímá PNG/JPEG do 2 MB a autorské tabulky nabízejí samostatné Add author a Add credit row.
- První scéna aktu se řeší s nadpisem aktu; exportní přepínače nových či lichých začátků se použijí na další scény. Ruční počet prázdných stran je oddělený od automatického vyrovnání.
- Integrated score používá hudební úseky, nikoli bodové Hity, a přílohy ze slotu Integrated score. Notové strany se vloží za stranou s účinným koncem úseku; chybějící příloha se nevloží. Blok s koncem musí být ve výstupu zahrnutý: při konci v Note je potřeba Show notes a při konci ve filtrované scéně její zahrnutí. Hudební Contents v této šabloně získá odkazy na notové části.

## Další krok

Redakčně projít připravené články a příklady. Živý průchod zůstává možný po novém předání sdíleného prohlížeče; tato vlna jej neobsahuje.
