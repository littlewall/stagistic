# Lokální MCP pro Claude Desktop — revize handoffu

Stav: technický návrh k revizi před implementací. Produktový kód zatím nevznikl.

## Cíl a hranice

Claude Desktop na macOS může přes stdio MCP číst aktuálně uložené lokální scénáře Stagistic: přehled, strukturu, výřezy, postavy, dialogy a výsledky textového hledání. Instalace používá `.mcpb` a nativní instalační dialog Claude. Text scénáře se vrací ve **Stagistic syntax**, nikoli Fountain.

Stejný server lze ručně připojit také k jinému lokálnímu MCP klientovi, který podporuje stdio a spouštění serveru jako podprocesu. Claude zůstává primárním klientem s one-click instalací; ruční cesta na jeho instalaci nezávisí. Platforma první fáze zůstává macOS.

První fáze neobsahuje zápis do scénářů, cloudové čtení, vektory, modely, uživatelské skilly, MCP prompts ani nové UI. Backend poskytne konkrétní operace pro instalaci, stav a vypnutí integrace, které půjde později připojit k UI.

„Lokální“ označuje zdroj dat a komunikaci Stagistic–bridge. Úryvky předané klientovi vstupují do jeho konverzace; jejich další zpracování závisí na klientovi a poskytovateli modelu. V případě Claude mohou být zpracovány jeho cloudovou službou. Není to příslib lokální inference.

## Proveditelnost a opravy handoffu

| Bod | Zjištění | Důsledek |
| --- | --- | --- |
| PGlite | `apps/desktop/src/db/index.ts` používá worker a `idb://stagistic-main`. | Externí MCP proces neotevírá databázi ani backup. Dotazy obslouží běžící WebView. |
| Tauri | Desktop používá Tauri `3.0.0-alpha`, explicitní Wry runtime; Rust zatím nabízí pouze `ping`. | Přibude skutečný request/response bridge, lifecycle a úzké příkazy. Nepřebírat bez ověření příklady pro Tauri 2. |
| Dokument | `loadLatest` skládá dokument z tabulkové projekce; `script_blocks` drží typ, pořadí, text i inline obsah. | Číst transakčně přes samostatnou read službu nad lokální DB. Nepředávat celý mutovatelný `ScriptRepository` ven. |
| Struktura | Existují stabilní ID scén, dějství a bloků; číslo scény je samostatné metadata. | API odkazuje na ID, nikoli na pořadí nebo titulek. |
| Syntax | Existuje `serializeStagistic` v `packages/script/src/serialization/serializeStagistic.ts`. | Použít společný serializer. Výřezy vyžadují zachování kontextu, viz níže. |
| Hledání | V aktuálním DB schématu není FTS index ani hotová FTS služba. | FTS je součást implementace včetně migrace. |
| MCPB | Oficiální manifest nyní používá `manifest_version: "0.3"`. | Ukázku s `mcpb_version` nepřebírat. |
| Nativní bridge | MCPB podporuje server typu `binary`; obě cesty mohou spouštět stejný Rust executable. | Jedna implementace a jeden výsledný univerzální macOS program pro MCPB i ruční konfiguraci. Uživatel nepotřebuje Node ani jiný doinstalovaný runtime. |
| Velikost bridge | Rust SDK a jeho závislosti určují skutečnou velikost. | Neslibovat 15–20 KB. Měřit výsledný balíček; klient nic nedoinstaluje. |
| Instalace | Otevření `.mcpb` vyvolává instalační dialog hostitele. | Úspěch otevření souboru není potvrzení instalace. Její konečné potvrzení patří Claude. |

Primární podklady: [MCPB README](https://github.com/modelcontextprotocol/mcpb/blob/main/README.md), [manifest](https://github.com/modelcontextprotocol/mcpb/blob/main/MANIFEST.md), [MCP lifecycle](https://modelcontextprotocol.io/specification/2025-06-18/basic/lifecycle). Syntax ověřovat proti zdrojům v `apps/docs/src/content/docs/syntax/` a testům `packages/script`; veřejná stránka při ověřování nebyla dostupná.

## Zvolená architektura

```text
Claude Desktop / jiný lokální stdio MCP klient
  ↕ MCP / stdio
Nativní stagistic-mcp (stejný program v .mcpb i pro ruční připojení)
  ↕ omezený lokální protokol / Unix domain socket
Rust v běžícím Stagistic
  ↕ cílená Tauri událost + příkaz pro odpověď
hlavní WebView → read služba → lokální PGlite
```

Použít nativní Rust bridge a oficiální [Rust MCP SDK `rmcp`](https://github.com/modelcontextprotocol/rust-sdk). Jedna implementace poskytuje MCP stdio a přeposílá omezené dotazy do aplikace přes UDS. Implementace MCP nástrojů ani interního transportu nesmí záviset na identitě klienta Claude.

Release build zkompiluje Apple Silicon a Intel target a spojí je do jednoho univerzálního macOS executable `stagistic-mcp`. Podepsaný výsledný program se beze změn použije v MCPB i jako desktop resource pro ruční připojení. Dvě distribuce obsahují kopii stejného artefaktu; nevzniká samostatná Node implementace. Rust ani Node se u koncového uživatele nevyžaduje. Nástroje používané pouze při buildu nejsou runtime závislostí integrace.

Alternativy:

- Přímé otevření DB či backupu z bridge: nevhodné pro živý IndexedDB store a aktuálnost dat.
- Lokální HTTP server: proveditelný, ale přidává port a ochranu HTTP rozhraní. Pro tuto macOS integraci nepřináší výhodu proti UDS.

### Rozdělení odpovědností

- `packages/mcp`: Rust crate pro `stagistic-mcp`, tool schemas, stručné popisy a návody k výřezům, MCP server, UDS klient, build univerzálního executable a `.mcpb`. Bez DB, síťových služeb a přímého čtení scénářových souborů. Interní kontrakt s Rust brokerem sdílet; schémata pro TypeScript read handler odvozovat ze stejného kontraktu nebo kontrolovat generováním, neudržovat ručně dvě odlišné definice.
- `packages/db`: samostatná lokální read služba, parametrizované dotazy, FTS a výsledky s limity. Používá stejnou PGlite instanci jako editor.
- `packages/script`: kontextové serializování výřezů nad stejnými pravidly jako stávající export. Žádná druhá implementace Stagistic syntax v MCP balíčku.
- `apps/desktop/src/mcp`: registrace read handleru až po bootstrapu DB, zpracování požadavků, odpovědi a teardown.
- `apps/desktop/src-tauri/src/mcp`: UDS server, omezení a korelace požadavků, stav integrace, instalace balíčku.
- Moon: build a validace MCPB, DB testy, MCP testy a Rust kontroly dostupné přes projektové úlohy.

## Lokální transport a lifecycle

1. Integrace je ve výchozím stavu vypnutá. Existuje samostatná operace zapnutí lokálního MCP přístupu, použitelná i bez Claude. Instalační operace Claude ji také vyvolá; samotný export ruční konfigurace přístup nezapíná. Povolení se uloží do lokální konfigurace desktopu mimo scénářová data.
2. WebView po bootstrapu nejdřív registruje listener a potom potvrdí připravenost Rustu. Teprve potom je služba dostupná.
3. Produkční endpoint je `/tmp/stagistic-mcp-<uid>/run.sock`, vývojový `/tmp/stagistic-mcp-dev-<uid>/run.sock`. UID pochází z OS, nikoli z klientského parametru. MCPB míří na produkci; obě strany sdílejí algoritmus cesty a verzi protokolu.
4. Adresář má režim `0700`, socket `0600`. Před použitím ověřit vlastníka, typ a oprávnění; odmítnout symlinky. Dodržet limit délky UDS cesty na macOS.
5. Po ověření soukromého adresáře drží desktop po celou dobu listeneru výhradní OS file lock v tomto adresáři; lock soubor se otevírá bez následování symlinků. Existující aktivní listener se nikdy nemaže. Úklid mrtvého socketu je dovolen až pod tímto lockem po ověření vlastníka, typu a neaktivního endpointu. Druhá instance službu nepřevezme.
6. Pro první verzi může být jedna UDS connection na jeden požadavek: jeden UTF-8 JSON řádek dovnitř, jedna odpověď ven. Čtení má limit před alokací celé zprávy. Interní protokol není obecný SQL ani Tauri proxy.
7. Rust validuje verzi, povolenou operaci, parametry a limity; vytváří vlastní korelační ID. Požadavek pošle pouze hlavnímu WebView. Odpověď přijímá jen od něj a jen pro živé ID.
8. Timeout obsluhy je 10 sekund. Současně nejvýše 8 požadavků; další dostanou `BUSY`. Disconnect, timeout i pozdní odpověď vždy uvolní čekající stav.
9. Navigace/reload nebo zánik hlavního WebView na straně Rustu ruší připravenost a čekající požadavky. Další bootstrap službu znovu připojí. Pokud WebView neodpovídá například při uspání aplikace, call skončí timeoutem. Není automatické spouštění Stagistic z bridge.
10. Vypnutí integrace uzavře listener i aktivní spojení a odstraní vlastní socket. Ukončení aplikace provede stejný úklid; po pádu jej řeší ověřený úklid při příštím startu.

Přístup přes socket je hranice přihlášeného uživatele OS. Oprávnění `0600` nedokazují identitu Claude; přistupovat mohou také jiné procesy téhož uživatele. Neprezentovat je jako ochranu před kompromitovaným uživatelským účtem.

## Read API

Veřejné nástroje mají `readOnlyHint: true`, `destructiveHint: false`, `idempotentHint: true` a `openWorldHint: false`. Rozhodující je implementační allowlist: anotace samy nic nevynucují.

| Tool | Povinné vstupy | Výsledek |
| --- | --- | --- |
| `list_scripts` | žádné | Stránkované ID, název, čas změny a dostupné souhrnné počty. Bez textu scénáře. |
| `get_script_outline` | `script_id` | Dějství a scény v pořadí dokumentu, stabilní ID, názvy, existující synopse a počty; bez replik. Stránkované. |
| `get_scene` | `script_id`, `scene_id` | Omezený výřez scény ve Stagistic syntax, kontext a odkazy na bloky. |
| `get_script_excerpt` | `script_id` | Stránkované bloky v pořadí scénáře, včetně úvodu a bloků mimo scény. Volitelný `start_block_id` umožní dojít k nalezenému místu. |
| `get_characters` | `script_id` | Stránkovaná metadata postav; nepotvrzené výskyty rozlišit od potvrzených ID. Žádné automatické potvrzování postav. |
| `get_character_dialogue` | `script_id`, `character_id` | Stránkované celé promluvové celky s mluvčím a odkazy na scény; volitelně omezení na scénu. |
| `search_script` | `script_id`, `query` | Stránkované nálezy s krátkým úryvkem, ID bloku/scény a pořadím relevance. |

Společné podmínky:

- Každé ID musí patřit zadanému scénáři. Neshoda vrací `NOT_FOUND`; nikdy nesmí vést k výsledku z jiného scénáře.
- Nepřijímat cesty k souborům, URL, SQL ani obecné názvy repository metod.
- Všechny seznamy mají výchozí limit 20, maximum 100 a neprůhledný `next_cursor`. Vyhledávání má maximum 50.
- Jedna úspěšná odpověď má nejvýše 32 KiB v UTF-8 včetně JSON obálky; interní požadavek nejvýše 16 KiB. Celá MCP zpráva má zvláštní bezpečnostní limit 64 KiB.
- Stránkovat na hranici významových bloků, u dialogů na hranici celých promluv. Pokud jediný celek přesahuje limit, vrátit `CONTENT_TOO_LARGE` s ID; nedělit jej neoznačeně uprostřed syntaxe.
- Návrat obsahuje `format`, identitu scénáře, `revision`, položky nebo `text`, `next_cursor` a výslovné označení neúplného výsledku. Text scénáře se v odpovědi neduplikuje současně do `content` a `structuredContent`.
- Cursor je svázaný s operací, filtry a revizí čteného rozsahu. Při změně rozsahu vrací `STALE_CURSOR` a vyžaduje nové první čtení. Nekombinovat potichu dvě verze scény.
- `revision` je deterministický fingerprint relevantních seřazených dat a metadat z jedné transakční konzistentní četby. Samotné `updatedAt` není záruka unikátní revize. Není nutná nová verze stored dokumentu.
- Čte se poslední potvrzený stav DB, nikoli neuložený stav editoru. MCP nevynucuje autosave, nesmí měnit aktivní blok ani vytvářet outbox záznamy.

## Stagistic syntax a výřezy

Stávající serializer je kontextový: například scénu zapisuje jako `##`, pokud dokument obsahuje dějství. Prosté vyfiltrování uzlů a zavolání serializeru nad malým dokumentem může změnit význam.

Implementace sdílí serializační pravidla s celým exportem a pro výřez explicitně přebírá kontext původního dokumentu:

- Rozlišení dějství/scény a kontext aktuálního dějství a scény.
- Mluvčí a pokračování promluvy, více mluvčích, aside versus scénická poznámka.
- Kontext hudebního úseku, číslování a význam hudebních značek.
- Inline značky, odkazy na postavy, escaping a literály.

Výstup je označen jako fragment a vrací potřebný kontext samostatně. Není automaticky samostatným `.stagistic` souborem: nepřidávat smyšlené dějství, hudební značky nebo frontmatter, které nejsou součástí požadovaných dat. Kontextové řádky zopakované kvůli čitelnosti musí být označené jako kontext a nesmějí se tvářit jako další nalezená replika.

Formátové vysvětlení v popisech nástrojů držet krátké. Skilly a rozsáhlé instrukce zůstávají mimo tuto fázi. Správnost ani limity nesmějí záviset na tom, zda model dodrží textový návod.

## FTS

- Použít PostgreSQL FTS nad existujícím `script_blocks.text_content`, konfigurace `simple` a parametrizovaný `plainto_tsquery`.
- Přidat GIN expression index nad přesně stejným výrazem `to_tsvector('simple', text_content)`, jaký používá dotaz. Není nutné zavádět synchronizovaný sloupec a trigger.
- Hledání vždy omezuje `script_id`, volitelně `scene_id` a typ bloku. Filtry validovat allowlistem; neskládat SQL z textu klienta.
- Relevance: `ts_rank_cd`, potom deterministické pořadí bloku a ID. Prázdný nebo příliš dlouhý dotaz odmítnout; vstup nejvýše 512 znaků.
- Vrátit plain text snippet nejvýše 240 znaků, bez HTML a bez celého scénáře. Na plný kontext se pokračuje přes ID bloku/scény.
- `simple` nepřináší českou lemmatizaci ani automatickou necitlivost k diakritice. To není akceptační slib této verze.
- Importy, editace a mazání jsou pokryté běžnou údržbou indexu nad aktuálními řádky. Nepoužívat separátní zastarávající kopii textu.
- Po změně schématu/migrace spustit `moon run db:db-compile-migrations`; `SCRIPT_DOCUMENT_SCHEMA_VERSION` se kvůli FTS nemění.

## Balení a instalace

Build vytvoří a validuje `stagistic.mcpb` z verzovaného manifestu, podepsaného univerzálního `server/stagistic-mcp`, licence a existující ikony. Balíček neobsahuje socket, autentizační údaje, identifikátory scénářů, uživatelská data ani absolutní cestu k vývojářskému checkoutu.

Minimální konfigurace manifestu:

```json
{
  "manifest_version": "0.3",
  "name": "stagistic",
  "display_name": "Stagistic",
  "version": "0.1.0",
  "description": "Read local Stagistic scripts, scenes and characters.",
  "author": {"name": "Stagistic"},
  "server": {
    "type": "binary",
    "entry_point": "server/stagistic-mcp",
    "mcp_config": {
      "command": "${__dirname}/server/stagistic-mcp",
      "args": []
    }
  },
  "compatibility": {"platforms": ["darwin"]}
}
```

Verze manifestu výše je příklad prvního releasu; výsledný build ji odvodí ze zdrojové verze crate. Binary server neuvádí požadavek Node runtime. Zachovat executable oprávnění při balení a přípravě ruční kopie, ověřit podporovaný minimální macOS a nepřidávat dynamické závislosti mimo standardní systémové knihovny. Nativní program zahrnout do release procesu podpisu/notarizace; spuštění po rozbalení Claude i po zkopírování z aplikace ověřit v podmínkách Gatekeeperu. Samotný podpis vnější aplikace není důkaz, že distribuovaná kopie půjde spustit.

Hotový MCPB je resource podepsané desktopové aplikace. Instalační backend jej zkopíruje do stabilního lokálního umístění a otevře prostřednictvím macOS v Claude. Výběr klienta a chybové chování ověřit ručně na skutečném Claude Desktop; nespoléhat bez testu pouze na asociaci přípony. Nepoužívat shell s interpolovanou cestou ani neupravovat `claude_desktop_config.json`.

Operace musí rozlišit: resource chybí, kopírování selhalo, Claude není dostupný, otevření selhalo a soubor byl úspěšně předán. Poslední stav znamená `installation_requested`, nikoli `installed`. Uživatel může dialog odmítnout nebo mít instalaci omezenou správcem.

Instalační požadavek je možné opakovat. Aktualizace nestačí jen výměnou resource v aplikaci: nainstalovaná kopie bridge potřebuje opětovnou instalaci stejného názvu extension. Bridge a app proto hlásí své verze a nekompatibilní lokální protokol vrací `VERSION_MISMATCH` s postupem aktualizace. Automatický update feed není součást fáze.

### Ruční připojení jiných lokálních klientů

MCP stdio je standardní transport: klient spouští server jako podproces a komunikuje přes stdin/stdout. Proto stejný bridge obslouží i jiného klienta s touto schopností; nepřidává se nový server ani HTTP endpoint. Viz [specifikace stdio](https://modelcontextprotocol.io/specification/2025-06-18/basic/transports#stdio).

Desktop umí bez spuštění Claude připravit kopii stejného podepsaného `stagistic-mcp` do stabilního umístění v aplikačních datech, například `~/Library/Application Support/com.stagistic.editor/mcp/server/stagistic-mcp`. Použije přesně artefakt zahrnutý i v MCPB, nikoli druhý build podle klienta.

Backend pro ruční připojení vrátí:

- Absolutní cestu k připravenému executable, verzi a podporovanou platformu.
- Hotovou dvojici `command` a `args`: command je ověřená absolutní cesta k executable konkrétního uživatele, args jsou prázdné. Cestu k bridge získá z OS resolveru aplikačních dat, nikoli dosazením odhadnutého uživatelského jména. Nepotřebuje hledat runtime ani zdědit PATH uživatelského terminálu.
- JSON serializovaný standardním serializerem, správně zachovávající mezery, diakritiku a další znaky v cestách. Uživatel do vygenerovaných hodnot nedoplňuje uživatelské jméno ani cesty. Klientský obal konfigurace se řídí konkrétní aplikací; pro podporované klientské formáty lze připravit kompletní blok ke zkopírování. Neexistuje příslib jednotného JSON formátu konfigurace pro všechny klienty.
- Stručné kroky: připravit bridge, zapnout lokální MCP přístup, přidat server do klienta a ponechat Stagistic spuštěný.

Ilustrační konfigurace spouštěného procesu:

```json
{
  "command": "/absolute/path/to/stagistic-mcp",
  "args": []
}
```

Skutečná konfigurace obsahuje konkrétní absolutní cestu, bez `~`, placeholderů, shellového escapování a závislosti na pracovním adresáři. Uživatel nedoplňuje cestu ani neinstaluje runtime. Backend nejdřív ověří dostupnost a spustitelnost připraveného programu; při chybě nevydá nefunkční konfiguraci jako připravenou.

Každý klient spouští vlastní stdio bridge; všechny mohou současně číst přes společný UDS endpoint a sdílejí globální limit požadavků. Vypnutí integrace znepřístupní data všem klientům. Aktuální návrh nerozlišuje individuální oprávnění jednotlivých klientů.

Při opětovném připravení bridge se jeho obsah bezpečně aktualizuje na stejném místě; nedokončený zápis nesmí nahradit funkční verzi. Již spuštěné bridge používají svoji načtenou verzi a po aktualizaci mohou potřebovat restart připojení v klientovi. Postup pro `VERSION_MISMATCH` rozlišuje reinstalaci MCPB a nové připravení/restart ručního bridge.

Klienti podporující pouze vzdálené/HTTP MCP připojení tento způsob nepoužijí. Podpora takových klientů není součástí fáze.

## Chyby a diagnostika

Doménové chyby MCP vrací jako tool result s `isError: true` a krátkým kódem a sdělením. Protokolové chyby zůstávají v MCP SDK. Podporovat minimálně `APP_NOT_RUNNING`, `APP_NOT_READY`, `INTEGRATION_DISABLED`, `VERSION_MISMATCH`, `INVALID_ARGUMENT`, `NOT_FOUND`, `BUSY`, `TIMEOUT`, `STALE_CURSOR`, `CONTENT_TOO_LARGE`, `INTERNAL_ERROR`.

Chybějící endpoint nemusí umožnit rozlišit vypnutou integraci od neběžící aplikace. V takovém případě vrátit `APP_NOT_RUNNING` se sdělením „Open Stagistic and enable local MCP access.“ Nepředstírat přesnější diagnostiku.

MCP stdout obsahuje pouze protokol. Diagnostika jde na stderr nebo do desktop logu, bez textů scénářů, dotazů, odpovědí a uživatelských souborových cest. Interní výjimky se nepředávají klientovi jako stack trace.

## Akceptační kritéria

1. `initialize` a `tools/list` fungují i bez spuštěného Stagistic; tool call vrátí srozumitelnou dostupnostní chybu. Start aplikace umožní další call bez restartu bridge.
2. Nástroje čtou lokální DB; bridge nemá vzdálenou URL, přístup k backupům ani zapisovací nástroj. Backend odmítne neznámé operace nezávisle na MCP.
3. Testované čtení nemění scénáře, metadata, aktivní blok, soubory příloh ani outbox.
4. Přehled, osnova, scény, úvod mimo scény, postavy i dialogy fungují pro prázdný scénář, hru bez dějství a hru s více dějstvími a opakujícími se názvy scén.
5. Syntax výřezů zachovává strukturu, společné mluvčí, asides, poznámky, lyrics, hudební kontext, inline značky a escapované literály. Ověřit vůči existujícím formátovým fixtures.
6. Každá odpověď dodrží limity v UTF-8 i pro češtinu a emoji. Stránkování na nezměněném rozsahu nevynechá ani neduplikuje položky; změněný rozsah odmítne starý cursor.
7. FTS najde vložený text, reflektuje editaci a po smazání jej nenajde. Ověřit víceslovný dotaz, diakritiku, prázdný dotaz, injekční vstup, scope scénáře a deterministické řazení.
8. Oba stupně validují cizí ID, neplatné typy a překročené limity. Socket odmítá nadměrné i neúplné zprávy bez neomezeného růstu paměti.
9. Ověřit současné požadavky, timeout, odpojení klienta, pozdní odpověď, bootstrap/reload WebView, druhou instanci, pád a nový start, vypnutí a zapnutí integrace.
10. Socket není TCP listener; ověřit práva, vlastníka, symlink odmítnutí a bezpečný úklid. Jiný uživatel nemá přístup.
11. Moon build vytvoří validní MCPB typu `binary` a zahrne jej i samostatný bridge do desktop resources při čistém buildu. Kontrola hashů prokáže, že MCPB a ruční cesta obsahují stejný výsledný executable. Spuštění nevyžaduje checkout, Node ani instalaci závislostí. Ověřit executable práva, podpis a spuštění na Apple Silicon i Intel Macu; neověřenou architekturu výslovně označit.
12. Na macOS s Claude Desktop projít otevření instalačního dialogu, potvrzení, načtení nástrojů a čtení skutečné lokální scény. Opakovat se Stagistic vypnutým a po jeho startu. Ověřit odmítnutý dialog a chybějící Claude.
13. Unit/integration test není náhradou bodu 12. Pokud prostředí skutečné klikání neumožní, výslovně jej vykázat jako neověřený; nesdělovat „one-click instalace ověřena“.
14. Samostatný bridge lze připravit a spustit standardním stdio MCP klientem na macOS bez instalace Claude a bez doinstalovaného runtime. Ověřit alespoň handshake, seznam nástrojů, čtení scény, nedostupnou aplikaci a cestu obsahující mezery. Stejná sada protokolových kontrol platí pro executable extrahovaný z MCPB.
15. Dva souběžné stdio klienty obslouží stejný běžící Stagistic. Vypnutí přístupu zablokuje další čtení oběma a export ruční konfigurace sám přístup nezapne.
16. Vygenerovaná konfigurace obsahuje skutečnou absolutní cestu uživatele a spustí bridge bez jejího ručního doplnění. Ověřit jiný domovský adresář, mezery a diakritiku v cestách, omezený PATH GUI aplikace a prostředí bez Node. Chybějící/nefunkční executable nesmí vytvořit zdánlivě hotovou konfiguraci s placeholderem.

## Doporučené pořadí a kontroly

1. Sdílený kontrakt nástrojů a interního protokolu, testy limitů a chyb.
2. DB read služba, FTS migrace a kontextový serializer s testy.
3. Rust UDS broker a WebView handler s lifecycle testy.
4. MCP stdio bridge otestovaný reálným MCP klientem proti lokálnímu testovacímu endpointu.
5. MCPB build/validace, samostatný bridge, Tauri resources a backend pro instalaci i ruční konfiguraci bez nového UI.
6. Integrační kontrola a manuální macOS/Claude smoke test.

Použít kanonické úlohy Moon: `db:db-compile-migrations`, `db:test`, `script:test`, `desktop:typecheck`, `root:lint`, `root:duplicates-changed` a nové cílené úlohy pro MCP i Rust. Nové testovací projekty přidat do root konfigurace Vite+. Před dokončením `graphify update .`. Žádný commit bez uživatelovy revize a jeho vlastního commitnutí.

Případné pozdější UI může ukazovat dostupnost aplikace, vyvolat instalaci znovu a vypnout přístup. Dokončenou instalaci nesmí odvozovat pouze z úspěšného `open`.
