# Local-first application state and synchronization

**Date:** 2026-07-15
**Status:** Implemented for local PGlite-backed state; cloud replication remains deferred

## Summary

Stagistic will use PGlite as the durable local database and TanStack DB as the
reactive, optimistic application-data layer over it. Drizzle remains the SQL
query mapper. TanStack Query will not be added to the core local-first data
path.

The target flow for relational application data is:

```txt
React UI
  -> TanStack DB live query
  -> optimistic TanStack DB transaction
  -> repository command
  -> PGlite transaction + durability flush
  -> PGlite change feed / explicit refresh
  -> confirmed TanStack DB collection state
```

The future cloud flow extends the same local loop instead of bypassing it:

```txt
React UI <-> TanStack DB <-> PGlite <-> sync engine <-> cloud Postgres
```

The editor document is deliberately separate. Tiptap/ProseMirror owns the
active editing session, autosave persists it locally, and a future Yjs or
Hocuspocus document source can replace the current document source without
turning the document into a TanStack DB row.

TanStack Query remains appropriate for genuinely remote server state that is
not replicated into PGlite, such as authentication, billing, cloud jobs, or a
remote API response. It should be introduced only with the first such feature.

## Why this is needed

The current application has good local persistence but no single application
state protocol:

- PGlite is the durable authority behind `ScriptRepository`.
- Tiptap owns the active script document and saves it through an autosave path.
- title, title-page, and editor settings each implement their own keyed draft,
  hydration, debounce, and stale-response protection;
- places, cues, characters, and attachments each load repository data into
  component state and implement their own mutation/reconciliation behavior;
- some mutations wait for PGlite before updating the UI, some update first and
  reconcile, and some are fire-and-forget;
- script lists are copied into a TanStack DB `LocalOnlyCollection`, then kept in
  sync with manual full refreshes and a custom invalidation event;
- loading, error, request ordering, pending IDs, retry, and rollback are
  repeated across hooks.

This works while every feature is local and isolated, but it creates ambiguity:
for a given screen it is often unclear whether React state, a TanStack
collection, or PGlite owns the current value. Cloud-originated changes would
make that ambiguity visible as stale or overwritten UI.

## Terminology

- **Durable local state:** committed data in PGlite. It survives reloads.
- **Synced collection state:** the last PGlite snapshot observed by a TanStack
  DB collection.
- **Optimistic state:** a temporary TanStack DB transaction layered over synced
  collection state while a repository command is being persisted.
- **Draft state:** unsaved form/editor input owned by a UI session. Drafts are
  not treated as committed database rows.
- **Ephemeral UI state:** open panels, selection, focus, hover, menu state, and
  other state that has no persistence meaning.
- **Document source:** the authoritative persisted script-body representation.
  Today it is backed by local projected tables; it may become Yjs/Hocuspocus.
- **Projection:** rebuildable relational data derived from the document.
- **Replication:** synchronization between local PGlite and cloud storage. It is
  not the same operation as React data fetching.

## Goals

- One read path for relational application data.
- One mutation lifecycle for optimistic CRUD.
- Immediate visual response without silent data loss.
- Automatic propagation of any committed PGlite change to mounted consumers.
- No component-level cache invalidation or full-list refresh after each write.
- Clear ownership for editor content, drafts, relational metadata, projections,
  and remote-only state.
- A local architecture that can accept cloud-originated PGlite changes later.
- Incremental adoption with a working application after every migration step.

## Non-goals

- Adding cloud synchronization now.
- Selecting Electric, PowerSync, or another replication vendor now.
- Enabling the currently disabled outbox before a consumer and conflict policy
  exist.
- Moving the Tiptap document into TanStack DB.
- Replacing Drizzle or the repository domain boundary.
- Putting modal, focus, selection, or other ephemeral UI state into collections.
- Installing TanStack Query pre-emptively.
- Rewriting all state hooks in one release.

## Current architecture

### Library inventory

- `@stagistic/app-core` directly depends on `@tanstack/react-db` and currently
  uses `createCollection`, `localOnlyCollectionOptions`, and `useLiveQuery`.
- TanStack Query, Redux, SWR, Zustand, and equivalent server/application state
  libraries are not direct dependencies. The lockfile's `redux` entry is
  transitive and is not application architecture.
- Drizzle is the typed SQL layer over `@electric-sql/pglite`.

The current pinned TanStack packages are pre-1.0. The first adapter spike must
run against the repository's pinned versions; any dependency upgrade is a
separate reviewed commit.

### Persistent data

`createLocalPgliteRepository` composes domain handlers over Drizzle/PGlite.
Repository writes update local tables and usually call `syncToFs()` after the
write. The document save path is serialized and explicitly flushes PGlite's WAL
to IndexedDB. The sync outbox exists but `ENABLE_OUTBOX` is false and there is no
remote consumer.

PGlite is therefore the application's real local database, not a disposable
network cache.

### Script collections

The script list is the only current TanStack DB usage. `scriptsStore` creates a
`LocalOnlyCollection`, calls `repository.listScripts()`, deletes every existing
collection row, and inserts the returned rows. Mutations persist through the
repository and then run the same full refresh.

`useRecentScripts` and `useScriptSummary` do not use that collection. They
repeat repository reads, request-ID guards, loading/error state, and subscribe
to `SCRIPTS_INVALIDATE_EVENT`.

The collection is consequently an in-memory mirror maintained by custom code,
not a reactive view of PGlite. TanStack documents `LocalOnlyCollection` as
session-only, non-persistent state, which matches its behavior but not this use
case.

### Metadata hooks

- Places load two lists into local state. Scene assignments update
  optimistically and are then replaced with the repository response; catalog
  mutations generally update after persistence.
- Cues load into local state. Cue updates are optimistic and reconcile from the
  response or a full reload; other operations mostly update after persistence.
- Characters use a reducer with separate pending-ID arrays. Field actions
  optimistically patch the reducer, then either apply the returned row or reload
  all characters. Outline updates use a custom fire-and-forget/latest-value
  rule.
- Attachments own another load/mutate state hook.

These are all small custom caches with different failure semantics.

### Drafts

Script title, title page, and editor settings each implement a variation of:

```txt
hydrate by script ID -> update React state immediately -> debounce 450 ms
  -> persist -> ignore or reconcile stale responses
```

This is the correct interaction model for form-like editing, but its lifecycle
is duplicated. The Initial pages panel currently adds another local optimistic
copy below the settings draft, illustrating how easily ownership becomes
nested.

### Script document

Tiptap/ProseMirror is the immediate source of truth while editing. Autosave
persists the document through `saveLatest`; relational block, act, scene, cue,
and character-reference projections are updated by the persistence layer.

This is intentionally different from metadata CRUD. Rolling a document back on
a failed autosave would discard user text and is not acceptable.

## Architectural decisions

### 1. TanStack DB is the reactive application-data layer

TanStack DB is not an ORM for PGlite. It provides normalized collections, live
queries, optimistic transactions, mutation state, and rollback. Drizzle remains
responsible for SQL and PGlite remains responsible for persistence.

Each persisted metadata entity should have one collection, and components
should read it through `useLiveQuery`. Derived lists, filters, counts, and joins
should be live queries rather than additional copied React arrays.

### 2. Core local-first data will not pass through TanStack Query

Adding Query between PGlite and TanStack DB would create three independently
managed representations:

```txt
PGlite -> Query cache -> TanStack DB collection -> UI
```

It would require invalidating Query after local writes and after inbound cloud
replication, then waiting for Query to refill the collection. Query's retry,
staleness, and network lifecycle do not solve replication or document
collaboration.

TanStack DB's Query Collection is useful when a REST/API response is the
upstream source. PGlite is already the local upstream source here, so a PGlite
collection adapter is the smaller and more coherent model.

### 3. Collections observe PGlite; repository commands mutate it

The collection layer needs a narrow reactive-source contract with these
semantics:

```ts
interface ReactiveQuerySource<T> {
    read(): Promise<readonly T[]>,
    subscribe(listener: (rows: readonly T[]) => void): Promise<() => void>,
    refresh(): Promise<void>,
}
```

The exact API may use snapshots or row changes internally. The public behavior
must be the same:

- subscribe before or atomically with the initial read so no commit is lost;
- emit transactionally consistent committed data;
- support unsubscribe and script-key changes;
- propagate source errors;
- allow a mutation handler to force a read-after-write confirmation when a
  natural change-feed acknowledgement is unavailable.

The PGlite implementation should first evaluate the official `live` extension.
Its `live.query`, `live.incrementalQuery`, and `live.changes` APIs are designed
to observe table changes. The current production database runs behind
`PGliteWorker`, so a browser integration test must prove that callbacks,
transactions, teardown, and migrations work through that path before domain
collections depend on it.

If the worker cannot safely expose PGlite live queries, the temporary fallback
is a typed repository change broadcaster emitted only after successful local
commits. That fallback must remain behind `ReactiveQuerySource`; inbound cloud
replication will later need a database-level feed or an explicit sync-engine
feed.

### 4. A persisted collection mutation completes only after confirmation

The standard CRUD lifecycle is:

1. Validate and normalize intent before mutation.
2. Allocate stable IDs on the client when creating rows.
3. Apply the collection insert/update/delete immediately.
4. Let the collection handler call the repository command.
5. Commit the PGlite transaction and required durability flush.
6. Observe or explicitly refresh the committed row into synced collection
   state.
7. Retire the optimistic overlay only after step 6.
8. Throw on persistence failure so TanStack DB rolls the optimistic transaction
   back.
9. Expose the error and retry action to the UI; do not only log it.

For current local persistence, confirmation may be a post-write collection
refresh. Once replication supplies transaction IDs or acknowledgements, the
adapter may wait for the matching acknowledgement instead. Components must not
depend on which strategy is used.

Simple single-entity CRUD should use collection mutation handlers. Multi-row or
intent-based operations should use named optimistic actions/manual
transactions—for example replacing all places assigned to a scene or a cue
operation that also changes the editor document.

### 5. Concurrency semantics are explicit

- Independent rows may persist concurrently.
- Writes to the same entity/field are serialized or merged.
- The newest local draft is never overwritten by an older persistence result.
- Repository responses are not copied into component state; confirmed source
  state replaces optimistic collection state.
- Delete dominates an older pending update for the same entity.
- Mutation confirmation has a timeout and surfaces a recoverable error rather
  than leaving a transaction pending forever.

TanStack DB can merge mutations inside a transaction, but domain commands still
need idempotency and deterministic IDs for retries and future replication.

### 6. Draft editing uses a shared draft controller

Text fields and settings often should not persist every keystroke. They use a
shared keyed draft lifecycle layered over confirmed collection/source data:

```txt
confirmed value -> local draft -> debounced/coalesced persist
                -> pending/saved/error status -> confirmed value
```

The controller must:

- hydrate separately for each script/entity key;
- update visually in the same event as user input;
- coalesce rapid changes and keep newest-value-wins semantics;
- never replace a dirty draft with a late source snapshot;
- accept external source changes when the draft is clean;
- flush safely on explicit save and, where appropriate, blur/page lifecycle;
- retain a failed draft and expose retry instead of silently rolling typed text
  back;
- distinguish `idle`, `dirty`, `saving`, `saved`, and `error`.

Editor settings and title page remain aggregate values even if stored across
multiple SQL rows. The collection/source adapter presents one logical record
per script so their UI is not coupled to storage normalization.

The Initial pages panel should read and update the parent settings draft
directly. Its panel-local optimistic mirror becomes unnecessary once the draft
contract guarantees same-event updates.

TanStack Pacer is the shared execution primitive underneath this lifecycle. It
owns debounce, flush, cancel, abort, and optional retry timing; it does not own
application data and does not sit between PGlite and TanStack DB. Local PGlite
writes use one attempt because validation and durability failures require a
visible retained draft plus manual retry. The `transient` retry profile is
reserved for explicitly classified remote operations and uses bounded
exponential backoff. React Hook Form is unnecessary for these small controlled
drafts because it would not solve cross-consumer display ownership or source
confirmation.

For short attribute fields saved on blur, a keyed display draft is shared by
the input, browser list, and detail header. It remains visible until the
collection transaction confirms, survives failure for another blur/retry, and
uses a revision token so an older completion cannot clear newer input.

### 7. The Tiptap document remains a separate state machine

The editor already has the desired immediate behavior: ProseMirror transactions
update the document before persistence. Its lifecycle is:

```txt
editor transaction -> current document -> serialized autosave queue
  -> document source -> relational projection -> durability status
```

On save failure, retain the edited document in memory, show unsaved/error state,
and retry. Do not roll the document back. TanStack DB collections may expose
metadata and projections around the editor, but they must not become a second
owner of the active document.

The active editor exposes one workspace-owned live projection containing
structure, cue ranges, character counts/display keys, and active-block state.
Editor sidebars and Attribute Manager subscribe to selectors over this same
projection. They do not attach independent ProseMirror transaction listeners or
rebuild JSON snapshots in component state. Persisted catalog metadata remains
PGlite-owned; the live projection only supplies document-derived display values
while the editor is mounted.

This design complements the collaboration-readiness persistence design:
`ScriptDocumentSource` and `ScriptDocumentProjectionWriter` remain the insertion
points for a future Yjs/Hocuspocus source.

### 8. Ephemeral UI state stays local

Selections, modal visibility, expanded sections, focus, DnD hover state, and
temporary view preferences stay in React, context, or the editor plugin state.
TanStack `LocalOnlyCollection` is valid only if live relational queries over
session-only data are genuinely useful; it is not a default replacement for
`useState`.

## Ownership matrix

| State | Immediate owner | Durable owner | Reactive read mechanism | Failure behavior |
|---|---|---|---|---|
| Active script body | Tiptap/ProseMirror | `ScriptDocumentSource` in PGlite today | editor transactions | retain edits, show unsaved/error, retry |
| Script metadata | TanStack DB optimistic transaction | PGlite | TanStack DB live query | automatic rollback + visible retry |
| Characters, genders | TanStack DB optimistic transaction | PGlite | TanStack DB live query | automatic rollback + visible retry |
| Cues catalog | TanStack DB optimistic transaction | PGlite | TanStack DB live query | automatic rollback/reconcile |
| Cue placement in document | Tiptap plus named coordinated action | document source + cue projection | editor transaction + collection | compensate/reconcile both owners |
| Places and scene assignments | TanStack DB transaction | PGlite | joined live query | atomic rollback/reconcile |
| Attachments metadata | TanStack DB transaction | PGlite | TanStack DB live query | rollback metadata; storage cleanup policy remains domain-specific |
| Settings/title page/title draft | shared draft controller | PGlite | confirmed source + draft overlay | keep failed draft, show retry |
| Derived structure/sidebar data | Tiptap index or PGlite projection, explicitly chosen per surface | rebuildable projection | editor live snapshot or collection | refresh/rebuild; never dual-author |
| Modal/selection/focus | React/editor plugin | none | local state | reset locally |
| Auth/billing/cloud jobs | TanStack Query when introduced | remote service | Query hooks or Query Collection | Query retry/error policy |

## Domain migration order

### Scripts first

Scripts already have a TanStack DB collection, making them the smallest place
to prove the adapter. Replace manual `replaceAll`, meta listeners, request-ID
hooks, and `SCRIPTS_INVALIDATE_EVENT` with one PGlite-backed collection.

`useScripts`, recent scripts, and a single script summary become different live
queries over that collection. Create/duplicate require stable client IDs or
named optimistic actions because they currently allocate IDs inside the
repository.

### Places as the first metadata pilot

Places and scene-place assignments are relational, small, and outside the
document source. They exercise two collections, a join, and a multi-row
replacement mutation without editor coupling. They are the best proof that
local component caches can be removed.

### Cues after places

Cue catalog CRUD can use a collection. Cue assignment/unassignment crosses the
catalog/document boundary and must use a named domain action with explicit
compensation/reconciliation. Do not hide that coupling in a generic CRUD
handler.

### Characters after cues

Character metadata can replace reducer-owned confirmed rows and pending-ID
arrays. Rename/delete/confirm also transform document marks or references, so
their named actions keep editor coordination while collection transactions own
metadata optimism.

### Draft aggregates

After collection confirmation and status primitives are stable, migrate script
title, title page, and editor settings to the shared draft controller. Remove
duplicate component-level optimistic snapshots during each migration.

### Attachments last

Attachment metadata can become reactive, but binary `FileStorage` operations
have a multi-resource commit problem. Keep their existing orphan cleanup and
missing-blob behavior explicit; a generic SQL rollback cannot undo every
IndexedDB file operation.

## Loading, pending, and error presentation

Collections expose source readiness separately from mutation status:

- initial load may block a route or show a skeleton;
- background refresh keeps current data visible;
- pending state is available per transaction/entity, not maintained in custom
  arrays;
- persistence errors are recoverable and attributable to the attempted action;
- background source errors do not erase last known data;
- global storage/sync health is separate from an individual mutation error.

The existing save indicator remains specific to document durability. A future
sync indicator should distinguish at least:

```txt
local changes saved | waiting for cloud | cloud synced | sync error | offline
```

“Saved” must never imply cloud-synced once replication exists.

## Future cloud synchronization

Cloud sync belongs below PGlite and above the cloud database, not in React
hooks:

```txt
local mutation
  -> PGlite transaction
       -> domain rows
       -> durable outbox operation
  -> local collection confirmation
  -> background uploader
  -> cloud acknowledgement / conflict result
  -> inbound replication into PGlite
  -> PGlite change feed
  -> collection update
```

Requirements before enabling the outbox:

- every operation has a stable operation ID and actor/device identity;
- domain rows and outbox records commit atomically;
- operations are idempotent;
- retry/backoff and poison-operation behavior are defined;
- deletion uses a cloud-safe tombstone or equivalent policy where required;
- each domain has an explicit conflict rule;
- sync acknowledgement is distinct from local durability;
- inbound changes use the same PGlite observation path as local writes.

The current official PGlite Electric sync plugin is alpha and documents
remote-to-local shape sync but not outgoing local writes or conflict resolution.
It is therefore not yet a complete answer for Stagistic's bidirectional flow.
The source/collection and sync-engine boundaries should allow it or another
provider to be evaluated later without changing components.

The script body has different conflict requirements from relational metadata.
A future collaborative document should use Yjs/Hocuspocus (or another document
sync source), then project committed document state into relational read models.
Do not replicate arbitrary serialized Tiptap snapshots using last-write-wins.

## When TanStack Query should be added

Add TanStack Query when a feature has all of these characteristics:

- its authority is a remote API, not local PGlite;
- it is not continuously replicated into the local database;
- request caching, deduplication, retry, cancellation, or background refetch is
  useful;
- offline mutation semantics are either unnecessary or separately defined.

Examples include authentication/session bootstrap, billing/subscription state,
cloud export jobs, server-side imports, remote asset processing, and admin-only
API screens.

If such remote rows also need TanStack DB joins, use a Query Collection so Query
feeds the collection. Otherwise use TanStack Query directly. Do not add a global
Query client merely to read PGlite.

## Testing strategy

Tests should assert externally visible lifecycle behavior, not hook internals.

### Reactive source contract

- initial snapshot is complete;
- a commit between subscription start and initial read is not lost;
- one SQL transaction appears atomically;
- insert/update/delete propagate;
- unsubscribe stops propagation;
- switching script keys cannot apply stale rows;
- source errors preserve last known data and are observable;
- worker and direct PGlite bootstraps behave consistently.

### Collection mutation contract

- optimistic value is visible before the repository promise resolves;
- successful persistence replaces optimism with confirmed source data;
- rejected persistence rolls back;
- two rapid updates resolve to the newest intent;
- delete during pending update has deterministic behavior;
- confirmation timeout surfaces an error and does not hang;
- external committed changes update all mounted consumers without invalidation.

### Draft contract

- hydration is keyed and StrictMode-safe;
- updates render in the same event;
- rapid input coalesces into one latest snapshot;
- stale save completion cannot overwrite a newer draft;
- clean drafts accept external updates;
- dirty drafts preserve local work and report an external conflict;
- failed persistence retains the draft and retry succeeds;
- lifecycle flush behavior is tested explicitly.

### Domain integration

Use browser tests with a controllable repository for UI timing and PGlite tests
for transactional persistence. Keep at least one production-worker browser test
for the full PGlite change-feed path.

## Observability

Development diagnostics should expose:

- collection source start/ready/error/stop;
- mutation ID, entity key, optimistic start, local commit, confirmation, rollback;
- confirmation duration and timeout;
- draft dirty/saving/error transitions;
- outbox depth and oldest pending age once cloud sync exists.

Do not log document contents, title-page values, or other user-authored text.

## Risks and mitigations

### PGlite worker change feeds

The official live API may not pass cleanly through the existing worker wrapper.
Mitigation: make this the first spike and gate all domain migration on a browser
test. Keep a typed fallback behind the same source contract.

### Two in-memory copies still exist

TanStack DB necessarily mirrors selected PGlite rows in memory. The difference
from today is that the mirror has one source, one change feed, and defined
optimistic confirmation. Avoid loading large document block tables into eager
collections without a measured need.

### TanStack DB API maturity

The library is still pre-1.0. Pin the tested version, isolate collection setup
behind Stagistic-owned factories, and avoid exposing library transaction types
through package/domain public APIs.

### Hybrid document/metadata operations

Cues and characters cross state-owner boundaries. Mitigation: named domain
actions with explicit compensation, never generic “update both” helpers.

### Cloud conflicts

Optimistic rollback only handles local persistence failure; it does not resolve
remote conflicts. Conflict rules belong to the future sync layer and must be
domain-specific.

## Rejected alternatives

### TanStack Query for every repository read

This would remove some loading boilerplate but add a second cache that must be
invalidated from PGlite and cloud replication. It is useful as a temporary REST
architecture, not the target local-first architecture.

### Continue with bespoke hooks and add a generic optimistic helper

A helper could standardize rollback, but every hook would still own a copied
list, loading lifecycle, invalidation, and cross-component synchronization. It
would reduce syntax without fixing ownership.

### Redux or Zustand as the application database

They can centralize state but do not provide the needed persistence change feed,
relational live queries, or sync acknowledgement protocol. They would duplicate
TanStack DB's role.

### Read PGlite directly from every component

PGlite live queries could make individual screens reactive, but optimistic
transactions, joins across UI needs, mutation status, and consistent rollback
would remain custom. Components should depend on collections/domain actions,
not SQL.

## Acceptance criteria for the architecture migration

- All script-list consumers read one PGlite-backed scripts collection.
- `SCRIPTS_INVALIDATE_EVENT`, scripts `replaceAll`, and duplicated script
  request-ID loaders are removed.
- At least places, cues, and characters no longer keep confirmed repository rows
  in component-owned caches.
- Simple metadata writes are visibly optimistic and automatically roll back on
  repository failure.
- Draft-based screens use one tested draft lifecycle and never need nested
  optimistic mirrors.
- A PGlite commit made outside the initiating component updates every relevant
  mounted consumer.
- The active Tiptap document remains independently owned and autosaved.
- TanStack Query is absent from the PGlite-backed core path.
- Cloud sync can ingest changes into PGlite without introducing React-level
  invalidation.

## References

- [TanStack DB overview](https://tanstack.com/db/latest/docs/overview)
- [TanStack DB mutations](https://tanstack.com/db/latest/docs/guides/mutations)
- [TanStack Pacer async debouncing](https://tanstack.com/pacer/latest/docs/guides/async-debouncing)
- [TanStack Pacer async retrying](https://tanstack.com/pacer/latest/docs/guides/async-retrying)
- [TanStack DB custom collection adapters](https://tanstack.com/db/latest/docs/guides/collection-options-creator)
- [TanStack DB LocalOnly Collection](https://tanstack.com/db/latest/docs/collections/local-only-collection)
- [TanStack DB Query Collection](https://tanstack.com/db/latest/docs/collections/query-collection)
- [TanStack Query optimistic updates](https://tanstack.com/query/v5/docs/framework/react/guides/optimistic-updates)
- [PGlite live queries](https://pglite.dev/docs/live-queries)
- [PGlite Electric sync](https://pglite.dev/docs/sync)
- [Collaboration-readiness persistence design](./2026-07-09-collaboration-readiness-persistence-design.md)
- [Current persistence notes](../../persistence.md)
