# Audit šablon, stránkování a mezer mezi bloky

> **Decision 2026-10-29:** User accepted block-style-only templates and grouping all adjacent same-type blocks except Act/Scene. Implementation is tracked in [the correction plan](../superpowers/plans/2026-10-29-block-templates-export-corrections.md). The observations/results below intentionally retain the pre-fix audit baseline; they are not post-fix results.


Datum: 2026-10-29. Stav: ověřený audit a doporučení, **bez změny chování aplikace**.
Navazuje na [původní research](2026-10-27-script-format-templates.md) a
[dosavadní design](../superpowers/specs/2026-10-27-script-format-templates-design.md).
Původní design tímto není automaticky nahrazen.

## Doporučení

**Pro nynější verzi doporučuji omezit zámek i aplikování šablon na blokové styly.**
Page format, Header/footer a Page flow by zůstaly nezávislými nastaveními scénáře
a exportu. Případné předvolby stránek lze nabídnout později jako samostatné,
editovatelné presety. Názvy a popisy šablon pak musí výslovně říkat, že jde o
blokové styly inspirované daným formátem, nikoli o garantovanou úplnou shodu dokumentu.

Důvodem není množství odlišných norem. Spíše jsme zaměnili doporučené hodnoty a
jednostránkové ukázky za povinné zákazy a současně svázali stránkové reference
s jednou konkrétní buňkou footeru. Současná implementace navíc obsahuje obecné
chyby stránkování, které samotné zúžení šablon nevyřeší.

Alternativa s plným stránkovým profilem je možná, ale potřebuje samostatný model
pravidel, provenance a závislostí. Nestačí přidat několik výjimek do UI.

## Co je standard, doporučení a naše rozhodnutí

Rozlišuji čtyři úrovně: explicitní instrukci v konkrétním průvodci; doporučení;
hodnotu pouze ukázanou v příkladu; oblast, o které zdroj nic neříká. Poslední dvě
úrovně samy neopravňují k zamčení všech alternativ.

DG na své [oficiální stránce](https://www.dramatistsguild.com/script-formats)
označuje formáty za doporučení, nikoli univerzální požadavky. Uvádí volitelnost
hlaviček/patiček a doporučuje ověřit preferenci jednostranného či oboustranného
tisku u příjemce. **Nenalezl jsem podklad pro zákaz spodního průběžného číslování,
parity stran ani pro povinné vložení not přímo do libreta.** Nepřítomnost zákazu
ovšem není dokladem, že libovolný příjemce přijme libovolnou kombinaci.

| Předvolba | Ověřený primární podklad pro stránky | Co z něj nesmíme udělat |
|---|---|---|
| Stagistic Default | Naše vlastní produktová předvolba; nikoli externí standard. | Převlékat interní rozhodnutí za povinnost DG/Concord. |
| DG Traditional | [Ukázka](https://www.dramatistsguild.com/sites/default/files/2020-01/traditionalformat-New.pdf): Letter, čitelné číslo nahoře vpravo; poznámka připouští prostou i složenou paginaci. | Povinně právě `{{page}}.` a povinně prázdný střed footeru; povinné CONT'D či pokračování scén bez zlomu. |
| DG Modern | [Ukázka](https://www.dramatistsguild.com/sites/default/files/2019-12/modernformat-New.pdf): Letter, číslo nahoře vpravo, vyznačené odsazení pro vazbu. Nové akty/scény zde nejsou předvedeny. | Z jedné stránky odvozovat zákaz nových stran nebo povinnost opakovat jméno po zlomu. |
| DG Musical | [Ukázka](https://www.dramatistsguild.com/sites/default/files/2019-12/musicalformat-New.pdf): Letter; připouští různé paginace. Verše a sloky jsou odlišeny, mezera odděluje sloky. | Z ní odvozovat pravidla pro kombinovaný book/score dokument nebo zákaz jeho dodatečného číslování. |
| Samuel French / Concord — Manuscript | Odkaz „Samuel French Format“ na stránce DG vede na [General/SFI guide](https://www.dramatistsguild.com/sites/default/files/2020-01/General-SFI-Formatting-Guidelines-Complete.pdf). Ten doporučuje nové stránky pro akty/scény, preferuje souvislé číslování od textu hry a instrukcí vylučuje číslování titulního listu. U pokračování řeči uvádí `(Cont.)`. | Zaměnit doporučení složené značky za jediný přípustný zápis; zakázat další footer. Současná [stránka Concord](https://www.concordtheatricals.com/resources/submissions) sama detailní typografický standard nepublikuje. |
| Sketchworks | [Vlastní jednostránková ukázka](https://www.sketchworkscomedy.com/downloads/Sketch-Formatting-Sample.pdf): Letter, číslo nahoře vpravo. `(CONT’D)` je příklad pokračování **na stejné stránce**. | Z ukázky dokazovat pravidla zlomu řeči přes stránku, aktů, scén, oboustranného tisku či footeru. |

Geometrie všech čtyř individuálních PDF byla ověřena `pdfinfo`: 612 × 792 pt.
Všechny byly také vyrenderovány a vizuálně prohlédnuty. To prokazuje rozměr
ukázky, nikoli univerzální zákaz jiného papíru. UK/BBC není mezi implementovanými
šesti předvolbami, proto není součástí kombinatorické matice.

Proscenium je implementační reference, nikoli autorita pro závaznost pravidel.
GitHub URL ani API se v tomto běhu nepodařilo znovu načíst; dřívější závěry
odvozené pouze z jeho JSON nepovažuji za nové ověření standardu.

## Rozsah skutečného ověření

[Strojové výsledky](2026-10-29-template-export-audit-results.json) obsahují:

- **288 kombinací**: šest předvoleb; Basic/Integrated; liché scény vypnuto/zapnuto;
  tři varianty obsahu; žádný/jeden ruční prázdný list; v Integrated chybějící,
  jednostránkové či dvoustránkové score. Basic se neopakuje pro neexistující score.
- **35 samostatných sestav**: 2–8 generovaných stran a 0–4 strany not.
- Dvě varianty filtru postavy: zachování původní paginace versus nové stránkování.
- Výpočet souřadnic tří sousedních lyrics/dialogue a měření skutečného editoru
  v Chromium se stejnými hodnotami 1 em před i za blokem.

To jsou **diagnostická pozorování**, nikoli zelené regresní testy správnosti.
Probe ověřoval, že byly případy provedeny a zaznamenány. Zelený běh sběru dat
neznamená, že chování aplikace je správné.

Matice není úplný důkaz všech dokumentů: neobsahuje všechny délky textu, všechny
přílohy a jejich PDF PageLabels, překrývající se hudební rozsahy, všechny stavy
drafů/verzí ani všechny kombinace obsahových filtrů. Nezkoušela skutečné kreslení
výsledného PDF s importovanou partiturou. Geometrické riziko importu níže plyne
z kódu a výpočtu, nikoli z vizuální kontroly takto sestaveného PDF.

## Ověřené problémy

### 1. Zamčené false není zachováno v účinku

DG Traditional/Modern/Musical a Sketchworks předepisují v kódu
`sceneOnNewPage: false`. `PageBreakModule` ale zobrazuje
`sceneOnNewPage || sceneOnOddPage`; plánovač používá stejnou disjunkci.
Zamčená uložená hodnota může zůstat false, zatímco přepínač je zaškrtnutý a
export vloží zlom. Zůstane-li volba lichých stran zapnutá z dřívějška, problém
nastane už samotným aplikováním takové šablony.

V matici: 96 případů ze 288. Viz `PageBreakModule.tsx:21` a
`deriveBasicExportPlan.ts:171`. V UI jsou nyní **liché**, nikoli sudé strany;
pro sudé by platila tatáž závislost.

Pravidlo opravy: lichá/sudá strana je zpřesnění nové stránky. Nesmí být samostatnou
cestou kolem pevného zákazu. Je-li false jen předvolba bez opory v zákazu zdroje,
nemá se vůbec vydávat za pevné omezení.

### 2. První scéna aktu obchází pravidlo pro scény

`deriveBasicExportPlan.ts:162–174` vynechává první scénu každého aktu. To chrání
dvojici akt + scéna před zbytečným rozdělením, ale současně ignoruje požadavek
na novou/lichou stránku této scény.

Ověřené Basic příklady s lichými scénami:

- DG Musical: scény A/B/C začínají na fyzických stranách textu **1 / 3 / 4**.
- Sketchworks: **1 / 3 / 3** — dvě různé scény dokonce sdílejí stránku.

Je potřeba stránkovat celý počáteční celek aktu se scénou, ne pravidlo pro první
scénu přeskočit. Toto není specifická výjimka standardu, ale obecná chyba plánování.

### 3. Šablona vypíná průběžná čísla Integrated score

`definitions/common.ts:21` vynucuje prázdný střed footeru u pěti pojmenovaných
šablon. `getIntegratedFooter` v `transcript/headerFooter.ts:176` přitom získá
pravidlo pro číslování vložených stran pouze z footerové buňky s `{{page_number}}`.
`drawPdf.ts:87` bez tohoto pravidla žádné integrované číslo nekreslí.

Ve všech **120 kombinacích pojmenované šablony a přítomné partitury** tak chybí
generované průběžné číslo score. Zápis `{{page_number}}` do této buňky nepřežije
resolver zamčené šablony. Původní čísla uvnitř cizího PDF mohou existovat, ale
nejsou automaticky čísly sloupce `score` v našem obsahu.

Číslování sestavy proto musí být samostatná exportní politika. Nemá se zapínat
náhodnou přítomností textového tokenu v jedné dekorativní buňce.

### 4. Obsah a záhlaví používají různé čítače

`transcribeExportPlan.ts:255` ukládá do obsahu index strany textu včetně
vložených prázdných stran. `withHeaderFooter` pro `{{page}}` prázdné strany
nepočítá. Ověřený Samuel French/Basic příklad: druhá scéna je v obsahu na
straně **3**, ale na této stránce je jediná viditelná značka **I-2-2.**

U 252 kombinací se čítače rozcházejí. Samotný rozdíl dvou čítačů nemusí být chyba,
pokud jsou oba zřetelně vytištěné a sloupce pojmenované. U předvoleb s prázdným
footerem ovšem druhý čítač na stránce vůbec není.

Nutno výslovně oddělit stabilní identifikátor hudby, značku stránky libreta,
číselnou pozici ve výsledné sestavě a případné původní číslo vloženého PDF.
Odkaz v obsahu musí používat zvolený, skutečně dohledatelný identifikátor stránky.

### 5. Integrated assembly má obrácenou paritu

`planIntegratedAssembly.ts:76` odvozuje `nextWouldBeEven` z čítače generovaných
stran, a nikoli z počtu všech dosud sestavených stran. Test je navíc obrácený:
po dvou stranách by následovala třetí, tedy lichá. Čítač nezahrnuje přidané noty.

- Ve 144 maticových případech s přítomným score začínalo score na sudé straně.
- Ve všech 28 samostatných sestavách s přítomným score rovněž začínalo na sudé.
- DG Musical s jednou stranou score vrátí následující scénu na výslednou stranu 6;
  se dvěma stranami na 7. Pravidlo proto neplatí nezávisle na délce přílohy.

Existující test s názvem „inserts a score on an odd book page“ dokonce očekává
číslo 4. Zelená stávající sada tedy správnost parity nepotvrzuje. Oprava musí
ověřovat invariant nad **finální** sestavou a zohlednit již vložené prázdné listy.

### 6. Filtr postavy rozchází čísla scén a hudby

Při `preserveFullScriptPagination: true` se tělo připravuje z plného dokumentu,
ale `deriveContentsPlan` dostane `filteredDoc` (`deriveBasicExportPlan.ts:126–133`).
Z něj se znovu odvodí pořadí scén i hudby.

Ověřený příklad po odstranění první scény: obsah uvádí retained scénu 1 a hudbu
**1)**, zatímco v těle je cue **2) Second song**. S novou paginací jsou obě
hodnoty 1), což je jiný, konzistentní režim. Toto je problém identifikátorů,
nikoli pouze footeru. Zachovaný režim musí sdílet původní index a pouze filtrovat
jeho položky.

### 7. První značka nové aktové stránky může použít předchozí scénu

Při začátku aktu B zvolí `currentPage.mark ??=` značku aktového bloku. Její
`sceneNumber` ale stále nese předchozí scénu (`structureMarks.ts:13`).
V diagnostickém dokumentu je tak na stránce s třetí scénou záhlaví **II-2-…**.
Pravidla počátku aktu, číslování scén a výběru značky stránky je nutné sjednotit;
nelze je nezávisle odvozovat ze tří průchodů dokumentem.

### 8. Importovaná partitura může mít jinou geometrii

Kód kopíruje stránky příloh v původních rozměrech, ale umisťuje číslo podle
geometrie scénáře (`drawPdf.ts:100,188`). Pro Letter scénář vyjde při vložení
landscape strany vysoké 612 pt základní souřadnice čísla přibližně **−148,8 pt**,
tedy mimo stránku. Navíc se před číslem bílým obdélníkem přemaluje celá šířka
pásu, což může zakrýt existující footer partitury. Toto je riziko potvrzené
čtením kódu a výpočtem; nebyl proveden pixelový test takto sestaveného PDF.

### 9. Mezera je dnes vlastností každého odstavce, nikoli skupiny

Export v `transcribeExportPlan.ts:85–86` připočítává before i after každému
bloku. Tři sousední jednořádkové lyrics/dialogue s before=after=1 em, fontem
16 px a line-height 1,2 mají rozestupy řádků **51,2 px**, nikoli 19,2 px.

V browseru má každý lyrics padding 16/16 px. Dialogue má 16/0 px, protože jeho
CSS spodní mezeru vůbec nespotřebovává. Stejný chybějící spotřebitel je u scene;
šablony však scene after nastavují a PDF jej používá. Rozcházejí se tedy nejen
skupiny, ale i měřená výška jednoho bloku mezi editorem a PDF.

## Pravidla, která musí nahradit lokální výjimky

| Kombinace | Konzistentní pravidlo |
|---|---|
| Nová scéna + lichá/sudá strana | Jeden režim začátku scény: průběžně / nová / lichá / sudá. UI i plán používají stejnou efektivní hodnotu a stejný původ pravidla. |
| Pevné pravidlo a uživatelská volba | Volba nesmí nepřímo porušit pevné pravidlo; při konfliktu ji nepovolit. Doporučená hodnota se naopak nezamyká jako zákaz. |
| Akt + první scéna | Zalomení platí pro celek včetně aktového nadpisu. Žádné dvě protichůdné booleovské výjimky. |
| Integrated score + liché strany | Paritu počítat nad hotovou sestavou: text, score i všechny blank strany. |
| Obsah + reference stránek | Oba vznikají z jednoho mapování stabilních ID na zvolený tisknutelný identifikátor. |
| Filtr + zachování paginace | Zachovat původní identifikátory scén/hudby a jejich odkazy, jen skrýt nepoužité položky. |
| Vypnutý footer + score odkazy | Buď ponechat jiné viditelné značení sestavy, nebo používat původní značení partitury a tomu odpovídající odkazy. Neukazovat číslo, které nikde není vytištěné. |
| Repeat name vypnuto + continuation mark | Značka nemá efekt; ovládání má tuto závislost přiznat. Hodnotu lze pamatovat pro opětovné zapnutí. |
| PDF jiné velikosti/orientace | Zvolená politika musí říci zachovat/normalizovat; overlay počítat pro každou skutečnou stránku a nezakrývat cizí obsah. |
| Title/front matter/blank | Titulní list bez čísla; případná římská řada a vazební blanky jsou samostatné volby výstupu, nikoli zákaz vyvozený z blokové šablony. |

## Mezery souvislých skupin

Pro sousední odstavce stejného slučitelného typu:

```text
samostatný blok:       before + text + after
skupina tří bloků:     before + text / text / text + after
```

Vnitřním blokům se vynuluje vnější before/after, nikoli jejich řádková výška.
Stejnou funkci určující hranice skupiny musí používat editor, jeho měření i export.
Pouhá CSS oprava by nechala PDF a stránkování rozbité.

Navrhovaná počáteční množina slučitelných typů je dialogue, lyrics,
stageDirection, aside a note. Character je cue, nikoli další odstavec stejné
repliky. Toto je návrh pravidla aplikace; zdrojové PDF nedokáže rozhodnout
všechny významy našich uzlů.

Hranice skupiny ukončí změna typu, postavy nebo hudebního úseku a strukturální
nadpis. Act/Scene se neslučují. Prázdné odstavce se nesmějí zahodit: mohou nést
záměrné oddělení slok. Zlom stránky sám o sobě nepředstavuje novou autorskou
skupinu; before patří prvnímu fragmentu, after poslednímu. Opakované jméno po
zlomu nevytváří novou skupinu v dokumentu. Chování s aside a explicitním
oddělením slok je potřeba pokrýt konkrétními fixtures, ne domýšlet z výšky DOM.

Tři řádky při 16 px / 1,2 a before=after=16 px mají pro souvislou skupinu celkem
**89,6 px**, namísto dnešních 153,6 px v PDF. Rozdíl musí být shodný v obou
rendererech. Nezávisle doplnit chybějící after u typů, které jej dnes ignorují.

Ještě samostatně rozhodnout mezery **mezi různými skupinami**. Současné sčítání
`after(A) + before(B)` může dvěma nastaveními „1 řádek“ vyrobit dva prázdné řádky.
Doporučuji pro běžnou hranici `max(after(A), before(B))`, zatímco explicitní
prázdné odstavce zůstanou zachované. To je další návrh k potvrzení, nikoli něco,
co už plyne ze samotného požadavku na první/poslední blok souvislé skupiny.

## Dopad doporučeného zúžení šablon

1. Aplikování/zámek šablony mění jen blokovou typografii; ponechá Page format,
   Header/footer a PDF flow. Export nemá zobrazovat zámek z blokové šablony.
2. Picker a jeho Default/Custom porovnání sledují blokové styly, nikoli celý
   současný `EditorSettings`. Umístění a popisky musí odpovídat tomuto rozsahu.
3. Reset celé blokové šablony zachovává Typing. **Reset block settings** podle
   posledního rozhodnutí dál resetuje styl i Typing právě aktuálního typu bloku.
4. Stávajícím zamčeným scénářům/draftům je před odstraněním stránkové vazby nutné
   zachovat dosud rozlišené stránkové hodnoty. Pouhé smazání polí z definic by je
   skokově vrátilo na jiné výchozí stránky; způsob převodu patří do plánu.
5. Opravit problémy 2–9 nezávisle na zvolené hranici šablon. Zúžení šablon samo
   neopraví paritu, reference, importované PDF ani mezery.

Pokud se stránkový zámek přesto ponechá, potřebuje pro každé pravidlo zdroj,
závaznost, rozsah a řešení konfliktů. Vynucené „prázdný footer center“ se nemá
zachovat v žádné variantě: pro tento zákaz nebyl nalezen podklad.

## Doporučené pořadí další práce

1. Rozhodnout hranici šablon (doporučení výše), zapsat nový design a převod
   současných zamčených hodnot; zatím nepřidávat další výjimky do přepínačů.
2. Sjednotit identifikátory a číslovací domény; z nich odvozovat obsah i tisk.
3. Opravit plánování a paritu nad finální sestavou, včetně prvních scén aktu a
   různých délek score. Regresní testy mají vyžadovat skutečně liché číslo,
   nikoli přebírat dnešní nesprávnou očekávanou čtyřku.
4. Zavést sdílené hranice skupin a aplikaci before/after, včetně editora,
   měření, PDF, slok a rozdělení skupiny přes stránku.
5. Teprve potom doplnit koncové PDF testy: Letter/A4/landscape přílohy, jejich
   stávající footery, chybějící score, filtry a všechny tři varianty obsahu.

Reprodukční zdroje jsou v [artifacts](artifacts/2026-10-29-template-export-audit/README.md).
Zaznamenané výsledky jsou diagnóza současného stavu, nikoli nová baseline,
kterou by budoucí oprava musela zachovávat. Žádné existující assertion nebyly
oslabeny ani změněny tak, aby popsané chyby prošly.
