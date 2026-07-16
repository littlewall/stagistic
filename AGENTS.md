## Goldern rules for working on Codex
- Be brief. Use the fewest words possible to get your point across.
- Be specific. Avoid vague language; provide concrete details.
- Be direct. Say what you mean without unnecessary qualifiers or hedging.

## DB schema changes
After any change to `packages/db/src/` schema or `drizzle/*.sql` files, run:
`pnpm --filter @stagistic/db db:compile-migrations`
(`db:generate` does this automatically; manual SQL edits do not.)

## Database-backed features and application state

Before adding or changing a feature that reads or writes persisted data, read:

- [Local-first application state and synchronization](docs/superpowers/specs/2026-07-15-local-first-state-sync-design.md)
- [Implementation plan](docs/superpowers/plans/2026-07-15-local-first-state-sync.md)
- [Persistence invariants](docs/persistence.md) when touching document saves or PGlite durability

### State ownership must be explicit

Classify every new value before implementing it:

- **Active script body:** Tiptap/ProseMirror owns it; persist through the document source/autosave path. Do not put it in TanStack DB or a React cache.
- **Persisted relational data/metadata:** PGlite is durable authority; Drizzle is the SQL layer; `ScriptRepository` is the application write/read boundary; TanStack DB collections are the reactive/optimistic UI layer.
- **Form draft:** keep a keyed local draft over confirmed persisted data. Use the shared draft lifecycle when available. Do not add a second optimistic mirror inside a child component.
- **Derived document data:** use the editor live index while editing or a named PGlite projection for persisted/read-model surfaces. Never let both become writable owners.
- **Ephemeral UI state:** keep it in React/editor state; do not persist it or create a collection without a concrete relational-query need.
- **Remote-only server state:** TanStack Query is allowed only when the remote API is authoritative and the data is not replicated into PGlite.

If ownership is ambiguous, stop and resolve it in the feature design before writing code.
In the first work update for a database-backed feature, state the chosen owner and the planned read/write path.

### Required data flow

For PGlite-backed relational data, target this flow:

```txt
UI -> TanStack DB live query/optimistic transaction
   -> ScriptRepository command
   -> PGlite transaction + required syncToFs()
   -> reactive source confirmation
   -> confirmed TanStack DB state
```

Until the planned PGlite-backed collection adapter exists for a domain:

- do not create another component-owned copy of repository rows;
- do not add custom invalidation events, request-ID cache guards, full-list refresh-after-write, or a new `LocalOnlyCollection` mirror;
- implement the relevant shared source/collection foundation from the plan first, or document a narrowly scoped temporary exception in the feature design;
- temporary exceptions must preserve one obvious owner and include a removal task linked to the state-sync plan.

### Mutation rules

- Simple metadata CRUD must be visually optimistic: validate/normalize, allocate stable IDs before insert, apply optimistic state, persist through the repository, confirm from the reactive source, and roll back with a visible error on failure.
- Multi-entity or document+metadata mutations must be named domain actions with explicit ordering, compensation, and reconciliation. Do not hide them in a generic CRUD helper.
- Never copy a repository response into a second component cache. Confirmed source state replaces optimistic state.
- Define same-entity concurrency semantics. Newest input must not be overwritten by an older response; deletes must have deterministic behavior against pending updates.
- A failed form autosave keeps the dirty draft and exposes retry. A failed document autosave keeps editor content and exposes unsaved/error state; never roll user text back.
- Do not enable the sync outbox or choose a cloud-sync provider as part of an unrelated feature.

### Layering rules

- UI/editor packages must not issue SQL or access raw PGlite clients.
- SQL schema and queries live in `packages/db`; repository handlers own transactions, timestamps, durability flushes, and future outbox recording.
- Do not add TanStack Query between PGlite and TanStack DB.
- Do not expose TanStack DB transaction types through domain/package public APIs; wrap them in Stagistic-owned collection sources/actions.
- Preserve `docs/persistence.md` performance invariants: serialized document saves, one document-save transaction, projection ownership, and explicit `syncToFs()`.

### Required tests

Database-backed feature tests must cover the applicable externally visible behavior:

- the optimistic value is visible before persistence resolves;
- success is confirmed from persisted/source state;
- persistence failure rolls back CRUD or retains a failed draft/document as specified above;
- rapid same-entity changes resolve to the newest intent;
- script/entity switching cannot apply stale data;
- a committed change reaches every mounted consumer without component-level invalidation;
- transaction and durability behavior is covered in DB tests; interaction timing is covered with controllable promises in browser tests.

## Design context
See [PRODUCT.md](PRODUCT.md) and [DESIGN.md](DESIGN.md) before any UI work.

**Register:** product (app-first). The editor app (`apps/web`) is the primary surface; the landing page (`apps/landing`) is brand register.

**North Star:** "The Dark Stage" — the interface exists in the wings; the script is the spotlight.

**Five principles:**
1. The script is the center — when in doubt, subtract.
2. Theatrical without theatrics — prompt-book precision, not poster noise.
3. Structure is a first-class feature — acts, scenes, characters are meaningful data.
4. Compose, don't sprawl — editor + future production apps grow by composition.
5. Professional discretion — no onboarding fanfare; a playwright picks it up and works.

**Anti-references:** Heavy SaaS dashboards (Jira/Asana), gamified writing apps, loud marketing/AI landing aesthetics (gradients, feature grids, eyebrow-on-every-section).

## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

When the user types `/graphify`, use the installed graphify skill or instructions before doing anything else.

Rules:
- For codebase questions, first run `graphify query "<question>"` when graphify-out/graph.json exists. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- Dirty graphify-out/ files are expected after hooks or incremental updates; dirty graph files are not a reason to skip graphify. Only skip graphify if the task is about stale or incorrect graph output, or the user explicitly says not to use it.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).
