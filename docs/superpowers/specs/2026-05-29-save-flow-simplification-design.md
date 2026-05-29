# Zjednodušení save flow: editor jako hub + granulární block persistence

**Datum:** 2026-05-29
**Stav:** Návrh ke schválení
**Větev:** `rewrite`

## Problém

Změny se neukládají — nepřežijí refresh stránky. Týká se to reorderu scén, textových změn i změny typu bloku. Příčiny jsou dvě, nezávislé:

1. **Reorder padá na unique constraintu.** `scriptBlocks` má unique index `(scriptId, order_no)`. `bulkUpsertScriptBlocks` je smyčka jednotlivých `INSERT … ON CONFLICT DO UPDATE`; unique se v Postgresu kontroluje na konci každého statementu (není deferrable). Při reorderu se blok UPSERTuje na `order_no`, který zatím drží jiný (přečíslovaný až později) → **unique violation → rollback celé transakce → `migrate…` vrátí `failed` → `saveLatest` vyhodí výjimku → toast „Failed to save" → nic se neuloží.**

2. **Textová změna / změna typu order nemění → unique kolize tam není → po `syncToFs` fixu by se uložit měla, a přesto ne.** To ukazuje, že `syncToFs` ve worker setupu reálně neflushuje, nebo se save vůbec nedovolá. To je samostatný bug v persistence primitivu.

Vedle toho je celý tok zbytečně složitý a křehký — viz analýza níže.

## Současný stav (co je špatně)

- **Dvě paralelní save cesty.** Editor má vlastní autosave (`useAutosaveController`, 1500 ms) volající `saveLatest` s celým dokumentem. Vedle běží `BlockSyncController` (`@tanstack/pacer-lite`, 400 ms / 2000 ms) který počítá block diff. Oba nakonec volají stejný full-document `saveLatest`.
- **Mrtvá stavová vrstva.** `BlockSyncController` zapisuje diff do TanStack DB kolekcí (blocks/scenes/acts/locations), které **nikdo z UI nečte**. Sidebary (structure i characters) čtou výhradně z živého snapshotu editoru (`useEditorLiveStructure` / `useEditorLiveCharacters`). Sofistikovaný `resolveScriptBlockDiff` engine je z pohledu UI mrtvý kód.
- **Full re-UPSERT na každý save.** `saveLatest` → `migrateLegacyJsonToBlocksForScript(force: true)` → re-extrakce celého dokumentu + UPSERT všech bloků + loop `replaceScriptBlockCharacterRefs` pro každý blok + delete orphanů. Pro 200 bloků 400+ queries na každé uložení, i při změně jednoho písmenka.
- **„Migrace" jako rutinní operace.** Funkce pojmenovaná jako jednorázová migrace se volá při každém `saveLatest` — zavádějící abstrakce.
- **Outbox mrtvý.** `ENABLE_OUTBOX = false`; outbox tabulka + `recordOutbox` v každé mutaci jsou nepoužitý kód.

## Cílový stav

Jeden zdroj pravdy, jedna save cesta, granulární zápis jen změněných bloků, obousměrný sync přes editor.

```
                    ┌──────────────────────────────────────┐
   sidebar edit ───▶│  TipTap document  (single source     │◀─── typing
   (request)        │                    of truth, live)   │
                    └──────────────────────────────────────┘
                          │                        │
              live snapshot store          PM transaction
                          │                        │
                          ▼                        ▼
                  all sidebars            diff vs lastSavedSnapshot
              (structure, chars,                   │
               future panels)            debounced autosave (1×)
                                                    │
                                          persist ONLY delty
                                                    │
                                                    ▼
                                    PGlite block rows + syncToFs
```

## Rozhodnutí (potvrzená s uživatelem)

1. **Editor (TipTap dokument) je jediný zdroj pravdy** pro vše, co žije v textu.
2. **Persistence model: zachovat blokovou dekompozici** (řádky v `scriptBlocks` + metadata tabulky). Granulární update jednoho bloku je levnější než přepis dokumentu; text i metadata pohromadě; lepší základ pro budoucí sync/diff/historii.
3. **Editorový autosave zůstává** jako jediný save trigger (debounce zachován).
4. **Live snapshot store zůstává** — je to jediná projekce editor→UI (React reaktivita přes `useSyncExternalStore`, kešovaná projekce, selektivní re-render, čistá typovaná hranice). Problém nikdy nebyl v něm.
5. **Smazat** `BlockSyncController`, TanStack DB kolekce, controller pacer, druhou save cestu. Diffovací logiku (`blockDiffEngine.ts`) recyklovat do persist vrstvy.
6. **Pořadí: flat global integer.** Jeden `block_order` na všechny bloky, zrcadlí plochý editorový model 1:1. Rebuild = jeden sort. Reorder scény je O(n) přečíslování bloků — akceptováno (lokální PGlite, zanedbatelné; psaní order nikdy nemění).
   - Sloupec `order_no` → **`block_order`**, property `orderNo` → **`blockOrder`** (`order` je SQL rezervované slovo).
7. **Order zápisy přes dvoufázový temp-offset** — eliminuje unique kolizi (root cause #1).
8. **Obousměrný sync** dvouvrstvě: data v dokumentu přes editor request kanál; metadata mimo dokument přes DB + stávající query/event. Žádná nová reaktivní DB vrstva.
9. **Umístění kódu: persist/repo implementace patří do `@stagistic/db`** (sdíleno web ↔ desktop), ne do `apps/web`. Viz sekce níže.

## Non-goals (záměrně teď neřešíme)

- Serverový sync / Electric SQL (blokový model v DB ho do budoucna umožní).
- Hierarchický order (`script_order` + `scene_order`). Zvažovat **až** se serverovým syncem/historií, kde se „scene-move = 1 řádek delta" vyplatí. Teď by to byla předčasná složitost s impedancí proti plochému editorovému modelu a `sceneId` by se stalo load-bearing pro pořadí dokumentu.
- Multi-tab konkurenční editace.
- Znovuzapnutí outboxu.

## Umístění kódu (sdílení web ↔ desktop)

Aplikace bude žít jako web **i** desktop (Tauri; `apps/desktop` dnes placeholder, „paused while the web app is being refactored"). Co nejvíc kódu musí být sdílené. `apps/web` (a `apps/desktop`) obsahují **jen** to, co se mezi platformami liší.

**Dnešní stav:** `@stagistic/db` už vlastní schéma, queries, `rewrite`, `createPgliteBootstrap` (sdílený přes DI) i interface `ScriptRepository`/`ScriptDataRepository`. Ale **implementace** repo vrstvy (`createLocalPgliteRepository`, content/character/config/titlePage handlery, outbox, migration wrapper) leží v `apps/web/src/repo/` — přestože je to čistá logika nad `LocalDb`, nic web-specifického.

**Cíl:**

| Vrstva | Kde | Web-specifické? |
|---|---|---|
| Schéma, queries, rewrite, bootstrap, interface | `@stagistic/db` | ne |
| **Repo/persist implementace** (`createLocalPgliteRepository`, `persistDocumentDelta`, handlery, diff engine) | **`@stagistic/db`** (přesun z `apps/web`) | ne |
| Bootstrap seam: `pglite.worker.ts`, `db/index.ts` (worker factory + asset URLs), instancování repo | `apps/web` | **ano** |
| React entrypoint, routes wiring | `apps/web` | ano |

**Dependency injection:** `createLocalPgliteRepository({getDb, syncToFs})` žije v `@stagistic/db`. Factory je sdílená; **instancování** s platform-specifickými `getDb`/`syncToFs` zůstává v appce (`apps/web/src/repo/index.ts` zůstane tenký: `createLocalPgliteRepository({getLocalDb, syncToFs})`). Stejný vzor, jaký už `createPgliteBootstrap` používá pro worker factory. Desktop později injektuje svůj bootstrap.

## Architektura po komponentách

### 1. Persist vrstva (`@stagistic/db`, modul `repo/` — přesun z `apps/web/src/repo/localPglite/content.ts`)

Nahradit `migrateLegacyJsonToBlocksForScript(force:true)`-on-save za `persistDocumentDelta`:

- Drží `lastSavedBlocks` (mapa `blockId → ExtractedBlockRow` posledního uloženého stavu) + sady scén/aktů.
- **Pozor — proč ne app-core `blockDiffEngine`:** app-core index snapshot (`IndexedScriptBlock`) **neobsahuje `contentJson`** (inline formátování bold/italic), má jen `textContent`. Naopak `extractScriptBlocks` (`jsonToBlocks.ts`) `contentJson` počítá. Persist diff proto běží nad **extrahovanými řádky**, ne nad index snapshotem. (Index snapshot zůstává jen pro live store / sidebary, kde contentJson netřeba.) `blockDiffEngine.ts` se tedy **maže** s mrtvým BlockSyncController stackem, ne přesouvá.
- `saveLatest(scriptId, doc)`:
  1. `extracted = extractScriptBlocks(scriptId, doc)` (existující, autoritativní — text, contentJson, sceneId/actId přes heading tracking, columnGroup, characterRefByKey).
  2. `diff(extracted.blocks, lastSavedBlocks)` → `{inserted[], updated[], deleted[]}` (nový malý diff nad `ExtractedBlockRow`, porovnává všechna pole vč. contentJson, blockType, order, sceneId/actId, characterRefs).
  3. Větvení:
     - **Případ A — jen obsah existujících bloků** (stejná množina id, stejný order, beze změny „boundary-ness"): `UPDATE` jen dirty bloky (text/contentJson/typ). Žádná rekonciliace scén/aktů, žádná dvoufáze. Pokrývá psaní a změnu typu mezi ne-hraničními typy (action ↔ dialogue ↔ …).
     - **Případ B — strukturální změna:** změnila se množina id bloků (insert/delete), nebo order (reorder), **nebo se u bloku změnila „boundary-ness"** (stal se / přestal být scene-heading nebo act → scéna/akt vzniká/zaniká). V jedné transakci:
       1. rekoncil scén/aktů (které heading bloky existují → upsert/delete řádků),
       2. `DELETE` odebrané bloky,
       3. `INSERT` nové bloky,
       4. `UPDATE` změněné bloky,
       5. zapiš `block_order` dvoufázově (viz níže).
  4. **Character refs:** u bloků se změněnými `attrs.characterRefs` přepiš `scriptBlockCharacterRefs` jen pro ně.
  5. `db.transaction(...)` → `syncToFs()` → `lastSavedSnapshot = currentSnapshot`.

**Dvoufázový order zápis** (Případ B), uvnitř transakce, bez unique kolize:
1. Bloky s měnícím se pořadím přesuň do kolizně-bezpečného dočasného rozsahu (např. `block_order = -(block_order + 1)` — zachová unikátnost a nekoliduje s kladnými hodnotami nedotčených řádků).
2. Nastav finální `block_order` pro dotčené řádky (cílové hodnoty 0..N jsou permutace → žádná finální kolize).

### 2. Save trigger (`packages/editor` — beze změny principu)

`useAutosaveController` zůstává jediným triggerem. Editorův `onAutoSave` → `saveLatest`. Strukturální operace ze sidebaru jdou přes request kanál → PM transakce → běžný autosave (žádná druhá cesta).

### 3. Smazat / zredukovat (`packages/app-core/src/script-state/`)

- Smazat `BlockSyncController` (`controller.ts`), `collections.ts`, controller `pacer.ts`, `blockDiffEngine.ts`, `snapshot.ts` (pokud jen pro kolekce), TanStack DB závislost v tomto modulu.
- Persist diff je **nová** funkce nad `ExtractedBlockRow` v `@stagistic/db` (ne přesun app-core `blockDiffEngine` — ten nemá `contentJson`, viz Komponenta 1).
- `useScriptState` zredukovat na tenkou vrstvu (drží `scriptId`, předává autosave), nebo zrušit a `ScriptEditorRoute` volá repo přímo.
- `ScriptEditorRoute.tsx`: odstranit dvojí `onValueChange` → controller větev; `structureSourceValue`/`scriptStateIndexSnapshot` napojit jen na editor live + initial.

### 4. Obousměrný sync

**A) Data v dokumentu** (heading scény, název aktu, jméno postavy) — editor je hub:
```
sidebar edit ─▶ request {type, payload, requestId} ─▶ editor PM transakce
                                                          ├─▶ live store ─▶ všechny sidebary
                                                          └─▶ dirty autosave ─▶ UPDATE bloku
```
Zobecnit stávající ad-hoc act/scene requesty (`useEditorStructureRequests`) na uniformní typovaný request kanál. Nový pár = nový request typ + jedna PM mutace.

**B) Metadata mimo dokument** (barva/synopse/lokace scény; barva/gender postavy):
```
sidebar edit ─▶ repo zápis do DB ─▶ refetch/event ─▶ sidebar
                                       └─▶ (jen barvy postav) ─▶ editor přes persistentCharacters
```
Stávající mechanismus (repo query + event), bez nové reaktivní vrstvy.

### 5. Load (`@stagistic/db` repo `loadLatest` — beze změny logiky)

```
listScriptBlocks (ORDER BY block_order) + listBlockCharacterRefs
  → rebuildScriptDocumentFromBlocks → ScriptDocument
  → lastSavedSnapshot = index(dokumentu)   // baseline, první diff = no-op
```

### 6. Schema migrace (`packages/db/src/schema.ts` + migrace)

- `scriptBlocks.order_no` → `block_order` (property `blockOrder`), unique index `(scriptId, block_order)` zachován.
- Aktualizovat všechny dotčené queries (`blocks.ts`, `jsonToBlocks.ts`, repo).

## Krok 0 implementace: ověření persistence primitivu

Než se postaví cokoli dalšího, dokázat v izolaci, že zápis přežije reload (root cause #2):

```
1. zapiš 1 řádek (UPDATE block_order / textContent jednoho bloku)
2. await syncToFs()
3. simuluj reload: zahoď worker, vytvoř nový PGliteWorker na stejný idb://
4. přečti řádek zpět
   ✅ round-trip sedí → primitiv funguje, stav pipeline s jistotou
   ❌ nesedí → pravý bug (syncToFs / worker leader election / dataDir / race při unload);
      oprav PGlite worker config DŘÍV než cokoli jiného
```

## Dotčené soubory (orientačně)

**`@stagistic/db` (sdílené):**
- `packages/db/src/schema.ts` — rename `order_no` → `block_order`.
- `packages/db/src/queries/scripts/blocks.ts` — `block_order`, dvoufázový order writer, granulární helpery.
- `packages/db/src/rewrite/jsonToBlocks.ts` — `migrateLegacyJsonToBlocksForScript` zůstává jen pro import; extrakce snapshotu sdílená s diffem.
- `packages/db/src/repo/**` — **nový modul** (přesun z `apps/web/src/repo/`): `createLocalPgliteRepository({getDb, syncToFs})`, `persistDocumentDelta` (diff nad `ExtractedBlockRow`), `lastSavedBlocks`, content/character/config/titlePage handlery, `loadLatest` baseline.
- `packages/db/src/pglite/bootstrap.ts` — `syncToFs` (hotovo) + případná oprava worker configu po Kroku 0.

**`apps/web` (jen seam):**
- `apps/web/src/db/index.ts`, `apps/web/src/db/pglite.worker.ts` — bootstrap + worker factory + asset URLs.
- `apps/web/src/repo/index.ts` — tenké instancování `createLocalPgliteRepository({getLocalDb, syncToFs})`.

**Ostatní balíky:**
- `packages/app-core/src/script-state/*` — smazat controller/kolekce/pacer/blockDiffEngine (mrtvý stack).
- `packages/app-routes/src/routes/script/ScriptEditorRoute.tsx` + `useScriptEditorController` — odstranit dvojí save cestu.
- `packages/editor/src/editor/hooks/useEditorStructureRequests.ts` — zobecnit request kanál.

## Verifikace (ruční, nemáme automatické testy)

- **Krok 0** round-trip (viz výše) projde.
- Napiš text → refresh → text zůstane.
- Změň typ bloku → refresh → typ zůstane.
- Reorder scény → refresh → pořadí zůstane.
- Insert/delete/rename akt → refresh → zůstane.
- Rename scény v sidebaru → projeví se v editoru (a obráceně).
- Barva/gender postavy v sidebaru → projeví se (editor barvy postav).
- Velký scénář (stovky bloků): psaní jednoho písmenka zapíše jen 1 blok (ověř počtem queries / logem).
```
