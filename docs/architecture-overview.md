# Architecture Overview

Celková architektura projektu Stagistic po rewrite.

---

## Monorepo struktura

Stagistic je TypeScript monorepo spravované přes **pnpm workspaces** + **Turborepo**.

```
stagistic/
├── apps/
│   ├── web/          # Web app (Vite + React 19)
│   ├── desktop/      # Desktop app (Tauri 2 + Vite + React 19)
│   ├── api/          # API server (Fastify 5) — budoucí
│   └── worker/       # Background worker — budoucí
├── packages/
│   ├── db/           # Drizzle ORM schema, queries, migrations, PGlite bootstrap
│   ├── script-core/  # Doménový model: Fountain typy, parser, serializer, document model
│   ├── editor-ui/    # TipTap editor: node typy, extensions, hooks, components
│   ├── app-core/     # React state management: TanStack DB collections, hooks, store
│   ├── app-routes/   # Route components: HomeRoute, ScriptEditorRoute, ...
│   ├── sync-core/    # Repository interfaces (ScriptRepository, BlockRepository, ...)
│   ├── platform-core/# Platform abstrakce: Tauri runtime, file dialogs, menu events
│   ├── shared/       # Low-level utilities: UUIDv7, string/number/object helpers
│   ├── ui/           # Design system: Button, Card, Grid, AppHeader, theme, dialogs
│   ├── auth/         # Autentizace — budoucí
│   ├── config/       # Konfigurace — budoucí
│   └── music/        # Hudební funkce — budoucí
├── docs/             # Architektonická dokumentace (tento adresář)
├── infra/            # Infrastructure: Caddy proxy, certs
└── scripts/          # Build/setup/SSL scripty
```

---

## Package dependency graf

```
                       ┌─────────────────┐
                       │  @stagistic/    │
                       │    shared       │  (nanoid, uuidv7, utils)
                       └───────┬─────────┘
                               │
                     ┌─────────▼──────────┐
                     │  @stagistic/       │
                     │   script-core      │  (Fountain typy, parser, serializer,
                     │                    │   document model, serialization codec)
                     └──┬──────────┬──────┘
                        │          │
            ┌───────────▼──┐  ┌───▼────────────┐
            │ @stagistic/  │  │ @stagistic/     │
            │   db         │  │  editor-ui      │  (TipTap nodes, extensions,
            │ (Drizzle ORM,│  │   canvas, hooks,│   block sync engine)
            │  PGlite,     │  │   sidebars)     │
            │  queries,    │  └───┬─────────────┘
            │  migrations) │      │
            └──┬───────────┘      │
               │                  │
      ┌────────▼────────┐        │
      │ @stagistic/     │        │
      │  sync-core      │        │  (Repository interfaces)
      └────────┬────────┘        │
               │                 │
      ┌────────▼────────┐       │
      │ @stagistic/     │       │
      │  app-core       │◄──────┘  (TanStack DB collections,
      │ (@tanstack/db,  │          ScriptDataStore, hooks,
      │  pacer, store)  │          ScriptRepositoryProvider)
      └────────┬────────┘
               │
      ┌────────▼────────┐   ┌──────────────────┐
      │ @stagistic/     │   │ @stagistic/       │
      │  app-routes     │──►│  platform-core    │  (Tauri runtime,
      │ (HomeRoute,     │   │   file import,    │   menu events,
      │  ScriptEditor,  │   │   drag-drop)      │   file dialogs)
      │  SettingsRoute) │   └──────────────────┘
      └────────┬────────┘
               │
      ┌────────▼────────┐
      │ @stagistic/     │  (UI design system:
      │  ui             │   atoms, molecules,
      │                 │   organisms, theme)
      └────────────────┘
```

---

## Apps

### Web App (`@stagistic/web`)

- **Stack:** Vite + React 19 + react-router-dom 7
- **Database:** PGlite (Postgres v WASM) — IndexedDB storage
- **Entry:** `apps/web/src/main.tsx` → `App.tsx`
- **Sdílí:** Všechny packages s desktop app

### Desktop App (`@stagistic/desktop`)

- **Stack:** Tauri 2 + Vite + React 19
- **Database:** PGlite (Postgres v WASM) — IndexedDB storage
- **Platform features:** Nativní menu, file dialogy, drag-and-drop
- **Sdílí:** Všechny packages s web app, navíc `@stagistic/platform-core` pro Tauri-specifické API

### API Server (`@stagistic/api`) — budoucí

- **Stack:** Fastify 5
- **Database:** PostgreSQL (server-side)
- **Účel:** Cloud sync, autentizace, server-side operations
- **Status:** Scaffold — jen health endpoint

### Worker (`@stagistic/worker`) — budoucí

- **Účel:** Background tasks (email, export, sync)
- **Status:** Placeholder

---

## Klíčové architektonické principy

### 1. Offline-first

Obě platformy (web i desktop) mají lokální PGlite databázi. Aplikace funguje plně offline. Cloud sync se přidá jako vrstva nad lokální DB.

### 2. Shared code maximization

Desktop a web sdílejí vše kromě platform-specific kódu (Tauri API). Veškerá business logika, editor, state management, DB vrstva žije v `packages/`.

### 3. ProseMirror = source of truth při editaci

Při editaci je ProseMirror state autoritativní. DB se aktualizuje asynchronně na pozadí přes Block Diff Engine → TanStack DB → Pacer → PGlite.

### 4. Normalizovaná SQL

Každý blok scriptu = jeden řádek v DB. Žádné JSON blob dokumenty. Umožňuje granulární query, sync a budoucí features.

### 5. Rozšiřitelnost přes extension tabulky

Core `script_blocks` tabulka je stabilní. Type-specific data (character refs, budoucí cues, komentáře) žijí v extension tabulkách s FK na bloky.

---

## Data flow — přehled

```
┌──────────────────────────────────────────────────────────────────┐
│                         EDITOR FLOW                              │
│                                                                  │
│  ProseMirror  ──transaction──►  Block Diff Engine                │
│     state                        │                               │
│                                  ▼                               │
│                           TanStack DB                            │
│                          (optimistic,                            │
│                           instant UI)                            │
│                                  │                               │
│                                  ▼                               │
│                          TanStack Pacer                          │
│                         (400ms debounce)                         │
│                                  │                               │
│                                  ▼                               │
│                             PGlite                               │
│                         (IndexedDB/WASM)                         │
└──────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│                       SIDEBAR / PANEL FLOW                       │
│                                                                  │
│  UI action  ──mutation──►  TanStack DB  ──Pacer──►  PGlite      │
│  (sidebar)               (optimistic)                            │
│                                                                  │
│  Character rename  ──additionally──►  Editor command             │
│                                       (update block text)        │
└──────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│                         LOAD FLOW                                │
│                                                                  │
│  PGlite  ──query──►  blocks + scenes + acts + characters         │
│                              │                                   │
│                              ▼                                   │
│                    buildScriptDocument()                          │
│                              │                                   │
│                    ┌─────────┴──────────┐                        │
│                    ▼                    ▼                         │
│              editor.setContent()   TanStack DB                   │
│                                   collections.populate()         │
└──────────────────────────────────────────────────────────────────┘
```

---

## Implementační fáze

| Fáze | Oblast | Popis |
|------|--------|-------|
| **0** | Docs | Architektonická dokumentace (tato složka) |
| **1** | Database | Nová normalizovaná schema, migrace, query moduly |
| **2** | Editor | Node-per-type, behavior extension, factory pattern |
| **3** | State | TanStack DB/Pacer/Store, Block Diff Engine, sync pipeline |
| **4** | Repository | Refaktor ScriptRepository, sdílený PGlite bootstrap |
| **5** | Integration | Route updates, sidebar wiring, cleanup deprecated kódu |

Detaily každé fáze viz:
- [database.md](database.md) — Fáze 1
- [editor.md](editor.md) — Fáze 2
- [state-management.md](state-management.md) — Fáze 3
- [sync.md](sync.md) — Fáze 4
