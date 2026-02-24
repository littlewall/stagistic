# Sync & Persistence

PGlite strategie, repository architektura a budoucí cloud sync.

---

## Aktuální stav

| Oblast | Desktop | Web |
|--------|---------|-----|
| Database | PGlite (IndexedDB) | Žádná → **PGlite (IndexedDB)** |
| Repository | `createLocalPgliteRepository()` | Žádný → **sdílený s desktop** |
| Cloud sync | Scaffold (outbox table, disabled) | — |
| API | Scaffold (jen health endpoint) | — |

---

## Cíl rewritu

1. **Obě platformy sdílejí PGlite** — identická offline-first architektura
2. **Sdílený PGlite bootstrap** v `@stagistic/db` — jedna sada kódu pro inicializaci, migrace, client factory
3. **Refaktorovaný ScriptRepository** — dekomponovaný na doménové sub-interfaces
4. **Připraveno pro cloud sync** — outbox pattern, repository abstrakce umožňuje výměnu implementace

---

## PGlite architektura

### Sdílený bootstrap

Extrahovat z `apps/desktop/src/db/` do `packages/db/src/pglite/`:

```
packages/db/src/pglite/
├── client.ts          # createPgliteClient(config) — factory
├── migrations.ts      # runMigrations(client) — aplikace migrací
├── config.ts          # PgliteConfig typ
└── index.ts           # barrel export
```

**Factory:**

```typescript
interface PgliteConfig {
  /** IndexedDB databáze name — e.g. 'idb://stagistic' */
  dataDir: string
  /** Cesta k WASM bundlu — platform-specific */
  wasmModule?: WebAssembly.Module
  /** Cesta k fs bundlu — platform-specific (Tauri) */
  fsBundle?: string
}

async function createPgliteClient(config: PgliteConfig): Promise<PGliteClient> {
  const pglite = await PGlite.create({
    dataDir: config.dataDir,
    // ... WASM config
  })
  const client = drizzle(pglite)
  await runMigrations(client)
  return client
}
```

### Desktop bootstrap

```typescript
// apps/desktop/src/db/index.ts
import { createPgliteClient } from '@stagistic/db/pglite'

const client = await createPgliteClient({
  dataDir: 'idb://stagistic',
  wasmModule: await loadWasmModule(),  // Tauri-specific WASM loading
  fsBundle: await loadFsBundle(),       // Tauri-specific FS bundle
})
```

### Web bootstrap

```typescript
// apps/web/src/db/index.ts
import { createPgliteClient } from '@stagistic/db/pglite'

const client = await createPgliteClient({
  dataDir: 'idb://stagistic',
  // Bez wasmModule/fsBundle — web používá default CDN loading
})
```

---

## Repository architektura

### Stávající stav

Jeden monolitický `ScriptRepository` interface s 20+ metodami:

```typescript
// packages/sync-core/src/scriptRepository.ts
interface ScriptRepository {
  listScripts(): Promise<Script[]>
  loadScriptContent(id: string): Promise<ScriptDocument>
  saveScript(id: string, content: ScriptDocument): Promise<void>
  // ... 20+ metod
}
```

### Nová dekompozice

```
packages/sync-core/src/
├── repository/
│   ├── ScriptRepository.ts          # Composite interface
│   ├── BlockRepository.ts           # CRUD + batch operations na blocích
│   ├── SceneRepository.ts           # Scene metadata CRUD
│   ├── ActRepository.ts             # Act CRUD
│   ├── CharacterRepository.ts       # Character CRUD (rozšířený)
│   ├── LocationRepository.ts        # Location CRUD (nový)
│   ├── ConfigRepository.ts          # Config CRUD (zachovaný)
│   └── index.ts
└── index.ts
```

**Sub-interfaces:**

```typescript
interface BlockRepository {
  listByScript(scriptId: string, opts?: BlockListOpts): Promise<ScriptBlock[]>
  listByScene(sceneId: string): Promise<ScriptBlock[]>
  listByAct(actId: string): Promise<ScriptBlock[]>
  getById(id: string): Promise<ScriptBlock | null>
  bulkUpsert(blocks: ScriptBlock[]): Promise<void>
  bulkDelete(ids: string[]): Promise<void>
  reorder(scriptId: string, moves: OrderMove[]): Promise<void>
}

interface SceneRepository {
  listByScript(scriptId: string): Promise<ScriptScene[]>
  upsert(scene: ScriptScene): Promise<void>
  delete(sceneId: string): Promise<void>
  updateMetadata(sceneId: string, data: Partial<SceneMetadata>): Promise<void>
}

interface ActRepository {
  listByScript(scriptId: string): Promise<ScriptAct[]>
  upsert(act: ScriptAct): Promise<void>
  delete(actId: string): Promise<void>
}

interface CharacterRepository {
  listByScript(scriptId: string): Promise<ScriptCharacter[]>
  getById(id: string): Promise<ScriptCharacter | null>
  getByKey(scriptId: string, key: string): Promise<ScriptCharacter | null>
  upsert(character: ScriptCharacter): Promise<void>
  delete(characterId: string): Promise<void>
  updateColor(characterId: string, colorHex: string): Promise<void>
  updateGender(characterId: string, genderKey: string | null): Promise<void>
  updateNotes(characterId: string, notes: string | null): Promise<void>
  updateBackstory(characterId: string, backstory: string | null): Promise<void>
  renameKey(characterId: string, newKey: string): Promise<void>
}

interface LocationRepository {
  listByScript(scriptId: string): Promise<ScriptLocation[]>
  upsert(location: ScriptLocation): Promise<void>
  delete(locationId: string): Promise<void>
}

interface ConfigRepository {
  getByNamespace(scriptId: string, namespace: string): Promise<ScriptConfig | null>
  upsert(config: ScriptConfig): Promise<void>
  delete(configId: string): Promise<void>
  listBlockConfigs(configId: string): Promise<ScriptConfigBlock[]>
  replaceBlockConfigs(configId: string, blocks: ScriptConfigBlock[]): Promise<void>
}
```

**Composite:**

```typescript
interface ScriptRepository {
  scripts: ScriptCrudRepository
  blocks: BlockRepository
  scenes: SceneRepository
  acts: ActRepository
  characters: CharacterRepository
  locations: LocationRepository
  configs: ConfigRepository
  blockCharacterRefs: BlockCharacterRefRepository
}
```

### Implementace

```typescript
// Sdílená — funguje pro desktop i web
function createLocalPgliteRepository(db: PGliteClient): ScriptRepository {
  return {
    scripts: createScriptCrud(db),
    blocks: createBlockRepository(db),
    scenes: createSceneRepository(db),
    acts: createActRepository(db),
    characters: createCharacterRepository(db),
    locations: createLocationRepository(db),
    configs: createConfigRepository(db),
    blockCharacterRefs: createBlockCharacterRefRepository(db),
  }
}
```

Každý `create*Repository(db)` mapuje na odpovídající Drizzle query modul v `packages/db/src/queries/`.

### Provider

```typescript
// packages/app-core/src/scripts/ScriptRepositoryProvider.tsx
const ScriptRepositoryContext = createContext<ScriptRepository | null>(null)

function ScriptRepositoryProvider({ repository, children }) {
  return (
    <ScriptRepositoryContext value={repository}>
      {children}
    </ScriptRepositoryContext>
  )
}

const useScriptRepository = () => use(ScriptRepositoryContext)
```

---

## Sync Outbox (budoucí — scaffold)

Stávající `sync_outbox` tabulka se zachovává. Při cloud sync implementaci:

1. Každá DB mutace (po Pacer flush) zapíše záznam do outbox
2. Background process periodicky:
   - Načte pending záznamy
   - Odešle na API server
   - Označí jako `sent` nebo `failed`
3. Server aplikuje změny, vrátí potvrzení
4. Klient smaže confirmed záznamy

### Outbox op_type hodnoty (plánované)

| op_type | Popis |
|---------|-------|
| `block.upsert` | Insert/update bloku |
| `block.delete` | Delete bloku |
| `block.reorder` | Změna pořadí bloků |
| `scene.upsert` | Insert/update scény |
| `scene.delete` | Delete scény |
| `act.upsert` | Insert/update aktu |
| `act.delete` | Delete aktu |
| `character.upsert` | Insert/update postavy |
| `character.delete` | Delete postavy |
| `character.rename` | Přejmenování postavy |
| `location.upsert` | Insert/update lokace |
| `location.delete` | Delete lokace |
| `config.upsert` | Insert/update konfigurace |
| `ref.replace` | Replace character refs na bloku |

---

## Budoucí cloud sync architektura (pouze návrh)

```
┌──────────┐         ┌──────────┐
│ Desktop  │         │   Web    │
│ (PGlite) │         │ (PGlite) │
└────┬─────┘         └────┬─────┘
     │                     │
     │   sync_outbox       │   sync_outbox
     │   pending ops       │   pending ops
     │                     │
     ▼                     ▼
┌──────────────────────────────┐
│         API Server           │
│  (Fastify + PostgreSQL)      │
│                              │
│  Receives outbox ops         │
│  Applies to server DB        │
│  Resolves conflicts          │
│  Returns confirmations       │
│  Pushes changes to clients   │
└──────────────────────────────┘
```

### Conflict resolution strategie (budoucí rozhodnutí)

Kandidáti:
- **Last-write-wins (LWW)** — per block. Jednoduchý, ale ztrácí data při simultánním editování stejného bloku.
- **Operation-based CRDT** — per block text. Složitější, ale zachovává oba edity. Vyžaduje změnu na operace místo snapshots.
- **Server-authoritative merge** — server rozhodne, klient accepted. Kompromis.

**Rozhodnutí odloženo.** Aktuální architektura (blok = řádek, outbox pattern) je kompatibilní se všemi třemi přístupy.

---

## Migration path

### Fáze 1 (teď): Offline-only, lokální PGlite

- Desktop i web: PGlite v IndexedDB
- Žádná síťová komunikace
- Data existují pouze lokálně
- Outbox disabled (ale schema exists)

### Fáze 2 (budoucí): Cloud backup

- API server s PostgreSQL
- One-way sync: local → cloud (backup)
- Outbox enabled, background upload
- Restore z cloudu do nového zařízení

### Fáze 3 (budoucí): Full cloud sync

- Bidirectional sync
- Multi-device support
- Conflict resolution
- Real-time notifications (WebSocket)

### Fáze 4 (budoucí): Collaboration

- Multiple users editují stejný script
- Buď Yjs/CRDT (jako __scriptio) nebo operational transform
- Zásadní architektonické rozhodnutí — zatím nedefinováno

---

## Klíčové principy

1. **Local-first:** Aplikace vždy funguje offline. Cloud je opt-in bonus.
2. **Same architecture everywhere:** Desktop a web mají identický DB + repository + state layer.
3. **Repository abstraction:** Nikdy nepřistupovat k DB přímo z UI. Vždy přes repository interface → umožňuje výměnu implementace (local PGlite → remote HTTP → hybrid).
4. **Outbox pattern pro durabilitu:** Žádná operace se neztratí. Outbox zajišťuje at-least-once delivery při sync.
5. **Granular operations:** Operace jsou per blok/scéna/postava, ne per dokument. Umožňuje efektivní sync i conflict resolution.
