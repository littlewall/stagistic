# Cloud sync — fáze 0: výsledky spiku

Stav: měřeno 7. 10. 2026 lokálně (Docker Desktop, Apple Silicon). **Rozhodnutí: GO** s Yjs + Hocuspocus na Bunu, persistence plným stavem, `perMessageDeflate` zapnout.

Docker ≠ CPU UpCloudu: rozhodují RSS a relativní čísla. Kontrolní měření po prvním nasazení (fáze 3).

## Sestava
- `docker-compose.bench.yml`: `postgres:17-alpine` (1 vCPU, 1 GB, `max_connections=100`), server `oven/bun:1.4.2` (1 vCPU, 1 GB / 512 MB), Toxiproxy, RustFS (S3).
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
- Halda JS: 4 MB bez dokumentů, 65 MB při 50 otevřených dokumentech (~1,2 MB na otevřený dokument s 600 bloky). Po odpojení všech klientů a GC je halda 9–11 MB, RSS ale zůstává 166–224 MB. Jde o paměť, kterou alokátor po špičce nevrací OS, ne o únik.
- Spojení do DB: pool 8, při zátěži 3–8 z 100.
- Úvodní sync dlouhého skriptu: 121–183 ms, 1,03 MB po drátu. Raw deflate by přenos zmenšil na 166 KB (−84 %). Odhad je z klienta (`deflateRawSync` každé zprávy); `perMessageDeflate` na serveru nezměnil CPU ani latenci měřitelně.
- Studený reload 50 dokumentů (unload → znovu připojit): p95 87–151 ms od otevření socketu po `synced`.
- S3 (RustFS, `aws4fetch`): presigned PUT 1 MB 14 ms, GET vrátí shodný `sha256`, nepodepsaný GET 403. Klíč `s/{scriptId}/a/{attachmentId}`, TTL 300 s.

## Exit kritéria

| Kritérium | Výsledek |
|---|---|
| RSS v klidu < 80 MB | ✔ 47 MB (Bun, žádný otevřený dokument). Pozor: po špičce RSS neklesá (viz výše). Na Starter 2 GB to stačí s velkou rezervou. |
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
1. **Bun**, ne Node: nižší RSS (47 vs. 72 MB), poloviční store p95, o 40 % méně CPU.
2. **Persistence plným stavem** (`@hocuspocus/extension-database`, debounce 2 s, maxDebounce 10 s). Inkrementální log šetří bajty, ale 20× víc zápisů, pomalejší load a kompakce. Vrátit se k němu, až objem zápisů začne vadit (dlouhý skript 1 MB při psaní = až 6 MB/min).
3. **`perMessageDeflate` zapnout**: úvodní sync −84 %, bez měřitelné ceny.
4. Pool DB 5–10 platí.

## Zjištění pro další fáze
- `HocuspocusProvider` se sdíleným `HocuspocusProviderWebsocket` je nutné připojit voláním `provider.attach()`.
- `socket.connect()` hned po `socket.disconnect()` nic neudělá, dokud se socket nezavře (stav je stále `connected`). Engine musí počkat na `disconnect`.
- Ve Vite je nutné `resolve.dedupe: ['yjs', 'y-protocols', 'lib0']`, jinak dvě kopie Yjs rozbijí `instanceof` (týká se `apps/web`).
- Pět pluginů s `appendTransaction` (`CharacterRefSync`, `Comments`, `musicInput`, `characterTagInput`, `musicBoundary`) nerozlišuje vzdálené transakce. Ve spiku neověřeno (potřebují React node views a refs), řeší fáze 1 (invariant 3).
- MinIO už nevydává Docker image; lokální S3 je RustFS (stejné API).

## Neměřeno
- Skutečné CPU UpCloudu, latence managed DB, TLS do DB.
- Paměť při tisících otevřených dokumentů (plán: živé spojení jen pro otevřený skript).
