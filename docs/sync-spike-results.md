# Cloud sync — fáze 0: výsledky spiku

Stav: měřeno 7. 10. 2026 lokálně (Docker Desktop, Apple Silicon). **Rozhodnutí: GO** s Yjs + Hocuspocus, persistence plným stavem, bez `perMessageDeflate`. Runtime: **Deno + Hono** (změna z Bunu 8. 10. 2026, viz Deno níže).

Docker ≠ CPU UpCloudu: rozhodují RSS a relativní čísla. Kontrolní měření na UpCloud ve fázi 7.

## Sestava
- `docker-compose.bench.yml`: `postgres:17-alpine` (1 vCPU, 1 GB, `max_connections=100`), server `oven/bun:1.4.2`, `node:24-alpine` nebo `denoland/deno:2.9.7` (1 vCPU, 1 GB / 512 MB), Toxiproxy, RustFS (S3).
- Latence: server↔DB 1 a 5 ms, klient↔server 25 ms (12 + 13 ms v obou směrech).
- Zátěž: 50 dokumentů × 2 klienti = 100 WebSocketů. Každý dokument 30 scén × 10 replik (~600 bloků, ~60 KB stavu). Každý klient 1 úprava/s po dobu 60 s (~100 úprav/s celkem).
- Dlouhý skript: 200 scén × 25 replik = 10 201 bloků, stav 1,03 MB.
- Spuštění: `apps/sync-spike/run-matrix.sh`, surová data v `apps/sync-spike/results/*.json`.

## Výsledky

| Scénář | RSS bez dokumentů | RSS 50 dok. / 100 spojení | CPU při zátěži | Latence p50 / p95 | Store p95 | Load p95 | Zápisy do DB / 60 s |
|---|---|---|---|---|---|---|---|
| Bun, plný stav, DB 1 ms | 47 MB | 146–151 MB | 9–10 % | 28 / 31–33 ms | 9–11 ms | 6–7 ms | 300 × plný stav, 18,3 MB |
| Bun, plný stav, DB 5 ms | 50 MB | 154 MB | 10 % | 29 / 33 ms | 17 ms | 14 ms | 300, 18,3 MB |
| Bun, inkrementálně, DB 1 ms | 49 MB | 155 MB | 13 % | 29 / 33 ms | 26 ms (kompakce), append 6 ms | 36 ms | 6 003 updatů, 0,34 MB |
| Bun, inkrementálně, DB 5 ms | 49 MB | 160 MB | 13 % | 28 / 33 ms | 48 ms (kompakce), append 10 ms | 65 ms | 6 019, 0,34 MB |
| Bun, plný stav, `perMessageDeflate` | 48 MB | 151 MB | 10 % | 29 / 32 ms | 9 ms | 6 ms | 300, 18,3 MB |
| Bun, plný stav, limit 512 MB | 48 MB | 154 MB | 11 % | 29 / 34 ms | 11 ms | 12 ms | 300, 18,3 MB |
| Node 24, plný stav, DB 1 ms | 72 MB | 171 MB | 17 % | 29 / 37 ms | 22 ms | 9 ms | 300, 18,3 MB |

- Latence úprava → druhý klient zahrnuje simulovaných 25 ms. Režie serveru je 3–8 ms.
- Halda JS: 4 MB bez dokumentů, 65 MB při 50 otevřených dokumentech (~1,2 MB na otevřený dokument s 600 bloky). Po odpojení všech klientů a GC je halda 9–11 MB, RSS hned po špičce 166–224 MB. Časem klesá, viz Paměť v čase.
- Spojení do DB: pool 8, při zátěži 3–8 z 100.
- Úvodní sync dlouhého skriptu: 121–183 ms, 1,03 MB po drátu. Raw deflate by přenos zmenšil na 166 KB (−84 %). Odhad je z klienta (`deflateRawSync` každé zprávy); `perMessageDeflate` na serveru nezměnil CPU ani latenci měřitelně.
- Studený reload 50 dokumentů (unload → znovu připojit): p95 87–151 ms od otevření socketu po `synced`.
- S3 (RustFS, `aws4fetch`): presigned PUT 1 MB 14 ms, GET vrátí shodný `sha256`, nepodepsaný GET 403. Klíč `s/{scriptId}/a/{attachmentId}`, TTL 300 s.

## Runtime a image serveru (8. 10. 2026)
Cíl: co nejmenší spotřeba CPU a RAM, ne velikost image. Stejná zátěž jako výše (plný stav, DB 1 ms), `apps/sync-spike/results/img-*.json`.

| Varianta | Image | RSS bez dokumentů | RSS 50 dok. / 100 spojení | CPU při zátěži | Latence p95 | Store p95 |
|---|---|---|---|---|---|---|
| `oven/bun:1.4.2` (Debian, zdrojáky) | 235 MB | 47 MB | 158 MB | 8,9 % | 31 ms | 8,5 ms |
| `oven/bun:1.4.2-alpine` (zdrojáky) | 87 MB | 54 MB | 155 MB | 8,9 % | 31 ms | 8,1 ms |
| `oven/bun:1.4.2-alpine` + `--smol` | 87 MB | 53 MB | 152 MB | 8,1 % | 31 ms | 8,2 ms |
| zkompilovaná binárka, musl, `alpine:3.22` + `libstdc++` | 86 MB | 44 MB | 149 MB | 9,1 % | 31 ms | 8,4 ms |
| zkompilovaná binárka, glibc, `distroless/cc` | 116 MB | 40 MB | 144 MB | 11,6 % | 35 ms | 11,1 ms |

- CPU a latence se liší jen v rámci šumu mezi běhy. `--smol` nic měřitelného nepřináší.
- Zkompilovaná binárka (`bun build --compile --minify`) šetří 5–14 MB při startu: nepřekládá TypeScript a nemá `node_modules`. Je to jeden soubor (75–81 MB, z toho skoro vše je runtime Bunu).
- Holý `alpine:3.22` bez `libstdc++` binárku nespustí.
- **Provoz na VPS (otevřené, rozhodne fáze 7)**: preference Debian + Docker s image `distroless/cc` + zkompilovaná glibc binárka kvůli snadnému škálování na další VPS. Bez Dockeru (binárka pod systemd) by se ušetřily desítky MB RAM za `dockerd` + `containerd`; PM2 stojí podobně jako Docker a nic navíc nepřináší.

## Deno 2.9.7 + Hono (8. 10. 2026)
Stejná zátěž (plný stav, DB 1 ms), `apps/sync-spike/results/img-deno*.json`. Jeden běh na variantu, rozdíly do ~2 p. b. CPU a ~20 MB RSS jsou šum.

| Varianta | RSS bez dokumentů | RSS 50 dok. / 100 spojení | CPU při zátěži | Latence p95 | Store p95 |
|---|---|---|---|---|---|
| Bun, zdrojáky (pro srovnání) | 47 MB | 158 MB | 8,9 % | 31 ms | 8,5 ms |
| Node 24 (pro srovnání) | 72 MB | 171 MB | 16,7 % | 37 ms | 22 ms |
| Deno, `Deno.serve` + Hono `upgradeWebSocket` (`server.deno.ts`) | 64 MB | 179 MB | 11,9 % | 32 ms | 10,0 ms |
| totéž jako `deno compile` binárka, `distroless/cc` (image 140 MB) | 55 MB | 219 MB | 12,9 % | 32 ms | 10,3 ms |
| Deno, `node:http` + `ws` (`server.deno-ws.ts`) | 66 MB | 168 MB | 13,6 % | 32 ms | 9,9 ms |
| totéž s `perMessageDeflate` | 66 MB | 196 MB | 15,1 % | 33 ms | 10,1 ms |

- Hocuspocus na Denu běží bez úprav: `hocuspocus.handleConnection` přijme nativní WebSocket z `Deno.upgradeWebSocket` i socket z `ws`. Sync, reload i dlouhý skript prošly.
- Oproti Bunu ~+3 p. b. CPU a ~+15 MB RSS při startu, store p95 stejný. Oproti Node výrazně lépe (store p95 poloviční, CPU −30 %).
- **`Deno.upgradeWebSocket` nevyjedná `permessage-deflate`** (ověřeno hlavičkou `Sec-WebSocket-Extensions`). Komprese funguje přes `node:http` + `ws` pod Denem. Stojí ~1,5 p. b. CPU a ~30 MB RSS (zlib kontexty na spojení).
- Adaptér `Server` z `@hocuspocus/server` (crossws) pod Denem odmítne běžet („Node.js adapter in an incompatible environment“). Spojení se proto zapojí ručně přes `handleConnection`.
- `deno compile` neumí pnpm symlinky (nenajde peer `yjs`). Nejdřív `deno bundle`, pak `deno compile --no-check` bundlu. Binárka šetří ~10 MB při startu, ale je o 25 MB větší než Bun (105 MB).
- Paměť v čase (tabulka níže): V8 drží haldu po špičce déle než JSC. V jednom cyklu nebyl GC ani po 5 min nečinnosti (halda 105 MB). Klid po GC je 137–200 MB oproti 120–148 MB u Bunu, vynucený GC 155 MB. Únik to není: halda se vrátí na 4–6 MB.

## Paměť v čase (8. 10. 2026)
`apps/sync-spike/src/memtest.ts`: 3 cykly (50 dok. × 2 klienti, 20 s psaní, odpojení), po každém 4,5 min nečinnosti, vzorek každých 30 s, **bez vynuceného GC**. Data: `apps/sync-spike/results/memtest.log`.

| | Start | Špička cyklus 1 / 2 / 3 | Klid po cyklu 1 / 2 / 3 | Po vynuceném GC |
|---|---|---|---|---|
| glibc (distroless) | 47 MB | 203 / 214 / 232 MB | 120 / 133 / 148 MB | 127 MB |
| musl (alpine) | 49 MB | 205 / 219 / 219 MB | 127 / 125 / 140 MB | 122 MB |
| Deno 2.9.7 (zdrojáky) | 49 MB | 189 / 229 / 236 MB | 137 / 231 (bez GC) / 200 MB | 155 MB |

Jak to číst:
- **Halda JS** (živé objekty) po odpojení klientů klesne z ~80 MB na 4–5 MB. GC ji uklidí sám, ale líně: v klidu za 30 s až 4 min.
- **RSS** (paměť procesu u OS) po GC klesne o 75–100 MB, na 120–150 MB. Zbytek nad startem (~70–100 MB) si alokátor nechává jako volné stránky pro další špičku. OS ho může vzít zpět, až ho bude potřebovat.
- Opakované cykly paměť znovu používají: špička i klid rostou jen o pár MB na cyklus a vynucený GC vrátí RSS na ~125 MB. Únik to není (halda se vždy vrátí na 4–5 MB). Mírný růst je fragmentace, ověří se dlouhodobě ve fázi 7.
- **Ruční čištění není potřeba.** Pojistka pro fázi 7: alert, když RSS v klidu přeroste ~400 MB, a `MemoryHigh=`/`MemoryMax=` v systemd jednotce.

## Exit kritéria

| Kritérium | Výsledek |
|---|---|
| RSS v klidu < 80 MB | ✔ 40–47 MB (Bun), 55–66 MB (Deno) po startu. Po špičce se RSS vrací na 120–150 MB (viz Paměť v čase); na Starter 2 GB s velkou rezervou. |
| p95 store < 50 ms při 1 ms do DB | ✔ 9–11 ms (plný stav), 17 ms při 5 ms |
| Konvergence bez ztráty | ✔ testy: taby přes `BroadcastChannel`, předání leadera, výpadek sítě, dva editory |
| Nahrazení bez duplicit | ✔ třetí klient i navázaný editor vidí přesně lokální obsah, počet bloků sedí |

## Ověřeno testy v prohlížeči
`SYNC_SPIKE_URL=ws://localhost:1234 moon run sync-engine:test-browser` (11 testů; síťové se bez URL přeskočí):
- Schema-less kodek v `packages/sync-engine` dává **stejnou** Y reprezentaci jako `prosemirrorJSONToYXmlFragment` (včetně hashovaných klíčů překrývajících se značek `characterTag`/`commentAnchor`). Engine proto nepotřebuje schéma editoru ve workeru.
- Projekce = Y.Doc po seedu i po psaní; navázání editoru na naseedovaný dokument nic nezapíše.
- `UniqueID` + `Collaboration`: souběžné rozdělení stejného bloku → shodné dokumenty, unikátní ID, žádný ping-pong.
- Předání leadera (Web Locks, dva workery, `y-indexeddb`): úpravy z doby bez leadera se nový leader dotáhne z tabů.
- Výpadek sítě: úpravy na obou stranách, i ve stejné větě, se po připojení spojí bez zásahu.
- Odhlášení: klasifikace → konflikt, „liší se 3 scény“, „Použít novější“ (lokální) přes `replaceOnCloudState` → druhé zařízení má lokální obsah bez duplicit. „Ponechat obě“: cloud beze změny.
- Starý klient a neznámý uzel: **navázání starého schématu uzel ze sdíleného dokumentu smaže** (y-tiptap neznámý typ odstraní). Schema gate (jen čtení, bez `ySyncPlugin`) je proto povinná, ne volitelná.

## Rozhodnutí
1. **Deno + Hono** (8. 10. 2026 místo Bunu, kvůli stabilitě). Proti Bunu ~+3 p. b. CPU a ~+15–50 MB RSS, proti Node lepší ve všem. Na 2 GB VPS s rezervou. HTTP i WebSocket přes `Deno.serve` + Hono (`server.deno.ts`), `node:http` + `ws` se nepoužije. Image `denoland/deno`, nebo `deno compile` na `distroless/cc` (rozhodne fáze 7).
2. **Persistence plným stavem** (`@hocuspocus/extension-database`, debounce 2 s, maxDebounce 10 s). Inkrementální log šetří bajty, ale 20× víc zápisů, pomalejší load a kompakce. Vrátit se k němu, až objem zápisů začne vadit (dlouhý skript 1 MB při psaní = až 6 MB/min).
3. **Bez `perMessageDeflate`** (8. 10. 2026): aplikace je desktop-only a local-first, server posílá jen rozdíly. Celý dokument jde jen při prvním syncu na novém zařízení (dlouhý skript 1 MB), to smí trvat déle. Zapnout jde později jen na serveru (prohlížeč kompresi nabízí vždy), přes `server.deno-ws.ts`.
4. Pool DB 5–10 platí.

## Zjištění pro další fáze
- `HocuspocusProvider` se sdíleným `HocuspocusProviderWebsocket` je nutné připojit voláním `provider.attach()`.
- `socket.connect()` hned po `socket.disconnect()` nic neudělá, dokud se socket nezavře (stav je stále `connected`). Engine musí počkat na `disconnect`.
- Ve Vite je nutné `resolve.dedupe: ['yjs', 'y-protocols', 'lib0']`, jinak dvě kopie Yjs rozbijí `instanceof` (týká se `apps/web`).
- Pět pluginů s `appendTransaction` (`CharacterRefSync`, `Comments`, `musicInput`, `characterTagInput`, `musicBoundary`) nerozlišuje vzdálené transakce. Ve spiku neověřeno (potřebují React node views a refs), řeší fáze 1 (invariant 3).
- MinIO už nevydává Docker image; lokální S3 je RustFS (stejné API).
- Fáze 1–6 jen lokálně (Postgres, RustFS, Mailpit, Caddy + mkcert `*.stagistic.local`). UpCloud je samostatná fáze 7.

## Neměřeno
- Skutečné CPU UpCloudu, latence managed DB, TLS do DB.
- Paměť při tisících otevřených dokumentů (plán: živé spojení jen pro otevřený skript).
