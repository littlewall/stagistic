# Local-first application state and synchronization — implementation plan

**Design:** [Local-first application state and synchronization](../specs/2026-07-15-local-first-state-sync-design.md)

**Goal:** Replace component-owned relational caches and inconsistent optimistic
updates with PGlite-backed TanStack DB collections, while preserving Tiptap and
form drafts as explicit independent state owners.

**Delivery rule:** Every commit below must leave the workspace typechecking and
the touched behavior covered by tests. Do not combine a TanStack DB version
upgrade, a PGlite adapter, and a domain migration in one commit.

## Global constraints

- Keep Drizzle and `ScriptRepository`; collections must not issue SQL from UI
  packages.
- Do not add TanStack Query to the PGlite-backed path.
- Do not move the Tiptap document into a collection.
- Do not enable cloud sync or the outbox in this plan.
- Keep `syncToFs()` and the existing document-save performance invariants.
- Hide TanStack DB transaction types behind Stagistic-owned APIs.
- Generate persistent entity IDs before optimistic insert whenever possible.
- Treat the existing Initial pages/settings worktree changes as current product
  work; migrate them only in the dedicated settings task.
- After DB source or migration changes, compile migrations as required by
  `AGENTS.md`.
- After code changes, update graphify.

## Verification commands

Use the narrowest relevant checks after every commit and the full set at phase
gates:

```txt
npx tsc -b
pnpm --filter @stagistic/db test
pnpm --filter @stagistic/app-core test
pnpm --filter @stagistic/app-routes test
pnpm --filter @stagistic/app-routes test:browser
```

Run repository lint on changed files during each task. The existing unrelated
full-repository lint failures are not acceptance criteria for this refactor.

## Phase 0 — Freeze behavior and terminology

### Task 1: Add state-ownership documentation links

- [x] Link the new design from the persistence documentation and the existing
  collaboration-readiness design.
- [x] State explicitly that document source/projection architecture and
  relational UI state architecture are complementary.
- [x] Do not change runtime behavior.

**Verify:** documentation links resolve and Markdown headings are coherent.

**Proposed commit:** `docs: define local-first application state ownership`

### Task 2: Add characterization tests for current optimistic behavior

- [x] Cover one place assignment, one cue update, one character field update,
  and one editor-settings toggle.
- [x] Assert when the visual value changes relative to the unresolved repository
  promise.
- [x] Assert current failure/reconciliation behavior without prescribing hook
  internals.
- [x] Use controllable deferred promises so timing is deterministic.

**Verify:** focused browser tests pass against current code.

**Proposed commit:** `test: characterize local optimistic mutation flows`

## Phase 1 — Prove a reactive PGlite source

### Task 3: Introduce the reactive query source contract

- [x] Add a Stagistic-owned generic contract for initial read, subscription,
  refresh, error delivery, and teardown.
- [x] Keep PGlite and TanStack DB types out of the public contract.
- [x] Add an in-memory test source that can emit snapshots, errors, and delayed
  updates.
- [x] Add contract tests for initial data, update ordering, refresh, and
  unsubscribe.
- [x] Export only the minimal types needed by app-core wiring.

**Verify:** DB/app-core typecheck and focused contract tests pass.

**Proposed commit:** `refactor(db): define reactive query source contract`

### Task 4: Prove PGlite live queries on the direct bootstrap

- [x] Enable the official PGlite live extension on the non-worker bootstrap in
  an isolated change.
- [x] Implement a test-only reactive source for one small table.
- [x] Prove insert, update, delete, transactional snapshots, and teardown.
- [x] Confirm migrations and relaxed durability still work.
- [x] Do not wire any product collection yet.

**Verify:** focused PGlite tests pass; existing persistence performance tests
remain green.

**Proposed commit:** `test(db): prove direct PGlite reactive queries`

### Task 5: Prove PGlite live queries through the production worker

- [x] Enable/configure the same extension in the production worker bootstrap.
- [x] Add a browser integration harness that uses the real worker path.
- [x] Prove an initial snapshot and a later committed change reach the browser.
- [x] Prove subscription cleanup after unmount.
- [x] Verify callbacks do not expose non-cloneable values across the worker
  boundary.

**Gate:** do not proceed to domain collections unless this task passes reliably
in repeated browser runs.

**Proposed commit:** `test(web): prove worker-backed PGlite change feed`

### Task 6: Implement the production PGlite reactive source

- [x] Implement the generic source using snapshot queries first.
- [x] Subscribe before the initial read, or buffer changes during hydration, so
  no write can be lost.
- [x] Preserve transaction consistency.
- [x] Normalize Drizzle/PGlite rows at the DB boundary.
- [x] Add script-key switching and source-error tests.
- [x] Keep incremental row-change optimization out of this first version.

**Fallback if Task 5 fails:** implement a typed post-commit repository
broadcaster behind the same contract, document that it observes local commands
only, and create a follow-up issue for a database/sync-engine feed. Do not let
components subscribe to the broadcaster directly.

**Proposed commit:** `feat(db): add reactive PGlite query source`

## Phase 2 — Build the collection bridge

### Task 7: Add a Stagistic collection-options factory

- [x] Create a factory that adapts `ReactiveQuerySource` to TanStack DB's sync
  lifecycle.
- [x] Isolate the currently pinned TanStack DB API inside this module.
- [x] Support initial readiness, snapshot replacement, errors, refresh, and
  cleanup.
- [x] Do not add persistence handlers yet.
- [x] Test a change emitted during initial hydration to prevent a read/subscribe
  race.

**Verify:** adapter tests pass without React.

**Proposed commit:** `feat(app-core): bridge reactive sources to TanStack DB`

### Task 8: Add mutation confirmation to the bridge

- [x] Define the handler contract for insert, update, and delete repository
  commands.
- [x] After a local write, await the source snapshot containing the expected
  result; use explicit refresh as the first confirmation strategy.
- [x] Add a bounded timeout with an attributable error.
- [x] Ensure a rejected command throws into TanStack DB and triggers rollback.
- [x] Test success, rollback, timeout, and cleanup while pending.

**Verify:** adapter tests show the optimistic value before a deferred command
resolves and confirmed data after it resolves.

**Proposed commit:** `feat(app-core): standardize optimistic mutation confirmation`

### Task 9: Expose consistent mutation status

- [x] Add Stagistic-owned selectors/hooks for pending and failed mutation state
  by collection/entity/action.
- [x] Avoid requiring UI components to inspect TanStack DB transaction objects.
- [x] Define retry behavior for deterministic commands.
- [x] Add tests for two concurrent entities and two rapid writes to one entity.

**Proposed commit:** `feat(app-core): expose collection mutation status`

## Phase 3 — Consolidate scripts

### Task 10: Back the scripts collection with PGlite

- [x] Add a reactive source for script summaries.
- [x] Replace the `LocalOnlyCollection` preload/full-replace path with the new
  source adapter.
- [x] Keep current read-only `useScripts` behavior and public return shape.
- [x] Keep old mutation methods temporarily so this commit changes only reads.
- [x] Test ordering by `updatedAt` and external PGlite updates.

**Proposed commit:** `refactor(scripts): source script summaries from PGlite`

### Task 11: Move simple script mutations to collection handlers

- [x] Make rename, title rename, delete, and active-block updates apply through
  collection mutations.
- [x] Persist through repository commands and wait for source confirmation.
- [x] Remove post-mutation full refresh for these actions.
- [x] Assert failure rollback and visible mutation error.

**Proposed commit:** `refactor(scripts): use optimistic collection mutations`

### Task 12: Make script creation IDs deterministic

- [x] Move new script ID allocation to the command boundary so the optimistic
  row and persisted row share an ID.
- [x] Preserve document normalization and active-block initialization.
- [x] Use a named optimistic action if creation spans multiple repository
  commands.
- [x] Test rollback removes the optimistic row when content initialization
  fails.

**Proposed commit:** `refactor(scripts): allocate script IDs before persistence`

### Task 13: Move duplicate to a named optimistic action

- [x] Allocate the destination script ID before persistence.
- [x] Represent the temporary summary without copying the full source document
  into the collection.
- [x] Confirm from PGlite after the repository duplicate transaction completes.
- [x] Roll back the temporary row on failure.

**Proposed commit:** `refactor(scripts): make duplication an optimistic action`

### Task 14: Unify all script-summary consumers

- [x] Rewrite recent scripts as a limited/sorted live query over the scripts
  collection.
- [x] Rewrite single-script summary as a keyed live query over the same
  collection.
- [x] Preserve current initial-loading versus background-update behavior.
- [x] Remove request-ID refs and duplicate repository reads from these hooks.

**Proposed commit:** `refactor(scripts): unify summary reads on live queries`

### Task 15: Delete script invalidation infrastructure

- [x] Remove `SCRIPTS_INVALIDATE_EVENT`, listeners, manual meta subscribers,
  full `replaceAll`, and refresh calls made obsolete by the collection source.
- [x] Keep an explicit source refresh utility only for diagnostics/recovery.
- [x] Confirm create/rename/duplicate/delete update home, list, editor header, and
  recent-script surfaces from one commit.

**Phase gate:** run workspace typecheck plus app-core and app-routes tests.

**Proposed commit:** `refactor(scripts): remove manual cache invalidation`

## Phase 4 — Places pilot

### Task 16: Add place and scene-assignment collections

- [x] Add reactive sources scoped by script ID for place rows and scene-place
  links.
- [x] Create collections whose keys are stable database identities/composite
  identities.
- [x] Replace `useScriptPlacesState` loading effects with live queries.
- [x] Keep existing mutations temporarily.
- [x] Test that switching scripts cannot leak rows from the previous script.

**Proposed commit:** `refactor(places): read places from live collections`

### Task 17: Move place CRUD to optimistic collection mutations

- [x] Allocate place IDs before create persistence.
- [x] Make create, rename, and delete optimistic.
- [x] Ensure uniqueness failures roll back and expose an actionable error.
- [x] Let cascade/source updates remove affected scene assignments after delete.
- [x] Remove copied `places` state and sorting helpers from the hook.

**Proposed commit:** `refactor(places): standardize optimistic place CRUD`

### Task 18: Move scene assignments to a named transaction

- [x] Represent replacement of all links for one scene as one intent.
- [x] Apply all link deletions/inserts in one optimistic transaction.
- [x] Persist through the existing atomic repository replacement command.
- [x] Confirm the exact normalized set returned by PGlite.
- [x] Test reorder/deduplication, rollback, concurrent different scenes, and
  delete-place cascade.

**Phase gate:** remove all confirmed-row `useState` from
`useScriptPlacesState`; run its browser tests repeatedly.

**Proposed commit:** `refactor(places): transact scene place assignments`

## Phase 5 — Cues

### Task 19: Add the cue catalog collection

- [x] Add a script-scoped reactive source for cue catalog rows.
- [x] Replace the hook's initial list effect and confirmed cue array with a live
  query/mapping.
- [x] Preserve editor request state separately; it is an intent channel, not a
  data cache.
- [x] Add coverage for unassigned and assigned cue projections.

**Proposed commit:** `refactor(cues): read cue catalog from a live collection`

### Task 20: Move cue catalog CRUD to optimistic mutations

- [x] Allocate cue IDs before creation.
- [x] Make create, title/kind update, and delete optimistic.
- [x] Remove full-list reload reconciliation.
- [x] Test validation failure, persistence rollback, and two rapid title edits.

**Proposed commit:** `refactor(cues): standardize optimistic cue CRUD`

### Task 21: Define coordinated cue assignment actions

- [x] Give assign and unassign explicit named actions spanning the cue row and
  Tiptap document intent.
- [x] Define which side executes first and the compensation path for failure.
- [x] Keep request IDs only as editor command deduplication, not network/cache
  ordering.
- [x] Reconcile from the editor document projection after successful autosave.
- [x] Test failure before editor change, failure after editor change, repeated
  action, and route teardown.

Assignment ordering: the Tiptap transaction executes first. A rejected editor
command publishes no catalog intent. After a successful editor change, the
document remains authoritative; autosave failure retains the dirty document and
its visible save error for retry instead of rolling text back. The reactive cue
projection confirms the resulting assignment and clears the ephemeral intent.
For title/kind updates, failed catalog persistence sends a compensating editor
request with the last confirmed metadata.

**Phase gate:** cue list data has one owner; editor placement remains explicitly
coordinated.

**Proposed commit:** `refactor(cues): coordinate catalog and document assignment`

## Phase 6 — Characters

### Task 22: Add character and gender collections

- [x] Add script-scoped reactive sources and collections for confirmed character
  metadata and custom gender options.
- [x] Keep default gender options as derived application constants merged in a
  live-query/view-model layer.
- [x] Replace reducer-owned confirmed rows and loading state with live queries.
- [x] Leave editor document refs and override value state unchanged.

**Proposed commit:** `refactor(characters): read metadata from live collections`

### Task 23: Move character field updates to collection mutations

- [x] Move color, gender, and outline updates to optimistic collection writes.
- [x] Replace pending-ID arrays with shared mutation-status selectors.
- [x] Remove fire-and-forget refresh code and full character-list reloads.
- [x] Test newest-value-wins outline typing and rollback for each field type.

**Proposed commit:** `refactor(characters): standardize optimistic field updates`

### Task 24: Move custom gender creation to optimistic mutation

- [x] Allocate a stable ID/key before persistence.
- [x] Preserve normalized unique-key behavior.
- [x] Roll back duplicate/validation failures visibly.

**Proposed commit:** `refactor(characters): make gender creation optimistic`

### Task 25: Coordinate confirm, rename, and delete with the document

- [x] Convert each cross-owner workflow into a named domain action.
- [x] Keep document transformation in editor/script modules and metadata
  persistence in repository commands.
- [x] Define compensation/reload behavior if document save fails after metadata
  persistence or vice versa.
- [x] Remove reducer actions that only maintained confirmed-row caches.
- [x] Preserve pending state through shared action status.

Coordination ordering: confirm and delete persist their optimistic metadata
transaction before publishing the editor link/unlink intent. Rename preview may
change the live editor first; metadata failure sends a compensating rename back
to the last confirmed key. Attribute-manager actions without a mounted editor
transform the script through `@stagistic/script` helpers after metadata
confirmation. If the following document autosave fails, the transformed
document remains in the editor override and the existing save error/retry path
owns recovery; confirmed metadata is never copied back into component state.

**Phase gate:** reducer state contains only editor/workflow state, not a second
copy of persisted character rows.

**Proposed commit:** `refactor(characters): coordinate metadata and document actions`

## Phase 7 — Shared draft lifecycle

### Task 26: Build a keyed persisted-draft controller

- [x] Implement hydration, dirty tracking, debounce/coalescing, newest-value
  wins, saving/error state, retry, and explicit flush.
- [x] Define how clean and dirty drafts react to an external confirmed update.
- [x] Make the debounce scheduler injectable for deterministic tests.
- [x] Test React StrictMode mount/cleanup/mount behavior.
- [x] Test entity-key changes while load or save is pending.
- [x] Do not couple the controller to editor-settings types.

**Proposed commit:** `feat(app-core): add persisted draft controller`

### Task 27: Migrate script title

- [x] Layer the title draft over the confirmed scripts collection row.
- [x] Persist through the optimistic collection update after debounce.
- [x] Preserve immediate typing and navigation behavior.
- [x] Remove title-specific timer and persisted refs.

**Proposed commit:** `refactor(scripts): use shared persisted title draft`

### Task 28: Add a logical title-page record source

- [x] Present title-page SQL rows as one logical record per script.
- [x] Subscribe/refresh the aggregate after persistence.
- [x] Keep table normalization inside the DB layer.
- [x] Test external committed title-page changes.

**Proposed commit:** `feat(title-page): expose reactive aggregate records`

### Task 29: Migrate title-page draft

- [x] Replace its load effect, serialized comparison, timer, and active flags
  with the shared draft controller.
- [x] Retain failed content and expose retry/error state.
- [x] Preserve the existing default title-page value.

**Proposed commit:** `refactor(title-page): use shared persisted draft lifecycle`

### Task 30: Add a logical editor-settings record source

- [x] Present normalized settings tables as one logical override record per
  script.
- [x] Confirm save and delete through the same aggregate source.
- [x] Preserve merge/default semantics in `@stagistic/script`.

**Proposed commit:** `feat(settings): expose reactive aggregate records`

### Task 31: Migrate editor settings draft

- [x] Replace settings hydration, request counter, timer, and serialized
  comparisons with the shared controller.
- [x] Preserve reset/delete-empty behavior.
- [x] Make Initial pages and all other settings panels update the same parent
  draft directly.
- [x] Remove the Initial pages panel-local optimistic copy after a browser test
  proves same-event rendering from the parent draft.
- [x] Add failure/retry coverage for a toggle and a formatting field.

**Phase gate:** title, title page, and settings share one draft lifecycle; no
nested optimistic mirrors remain.

**Proposed commit:** `refactor(settings): use shared persisted draft lifecycle`

## Phase 8 — Attachments and remaining metadata

### Task 32: Make attachment metadata reactive

- [x] Add collections for attachment metadata and cue-role bindings.
- [x] Replace component-owned attachment list loading with live queries.
- [x] Keep blob reads imperative; blobs are not collection rows.
- [x] Preserve missing-blob UI behavior.

**Proposed commit:** `refactor(attachments): read metadata from live collections`

### Task 33: Define attachment optimistic boundaries

- [x] Make binding metadata optimistic only after the file has been accepted by
  `FileStorage`, or display an explicit uploading placeholder with a temporary
  ID.
- [x] Define cleanup when SQL persistence fails after blob storage succeeds.
- [x] Define cleanup when blob deletion fails after SQL removal succeeds.
- [x] Test orphan and missing-blob cases; do not imply cross-resource atomicity.

**Proposed commit:** `refactor(attachments): standardize upload mutation lifecycle`

### Task 34: Audit remaining repository-backed hooks

- [x] Search for effects that load repository rows into component state.
- [x] Classify each as persisted collection data, draft, document/editor state,
  or ephemeral UI state.
- [x] Migrate persisted relational caches or document why an exception remains.
- [x] Remove obsolete request-ID, `isActive`, invalidation, and full-refresh code.

**Proposed commit:** `refactor(state): remove remaining relational hook caches`

## Phase 9 — Cloud-readiness contracts, without cloud sync

### Task 35: Make repository mutation envelopes explicit

- [x] Define stable operation IDs, actor/device placeholders, entity keys, and
  operation timestamps without enabling transport.
- [x] Keep operation types domain-specific and idempotent.
- [x] Do not expose envelopes to components.
- [x] Add serialization/compatibility tests.

**Proposed commit:** `refactor(sync): define durable mutation envelopes`

### Task 36: Make domain write + outbox atomic

- [x] Refactor one domain at a time so its SQL rows, script timestamp, and outbox
  row can share one PGlite transaction.
- [x] Keep outbox recording disabled at runtime.
- [x] Add rollback tests proving neither domain nor outbox rows partially
  commit.
- [x] Preserve `syncToFs()` behavior after the transaction.

Split this task into one commit per domain: scripts, places, cues, characters,
settings/title page, and attachments.

**Proposed commit pattern:** `refactor(<domain>): make mutation recording atomic`

### Task 37: Define the replication engine port

- [x] Define outbound batch, acknowledgement, inbound change application,
  retry/backoff, and sync-status contracts.
- [x] Keep provider code absent.
- [x] Ensure inbound application writes PGlite so existing collection feeds
  update automatically.
- [x] Document the separate future document-sync port for Yjs/Hocuspocus.

**Proposed commit:** `refactor(sync): define replication engine boundaries`

### Task 38: Run a separate provider evaluation

- [x] Compare current Electric/PGlite, PowerSync, and a custom API/outbox path
  against bidirectional writes, conflict handling, PGlite compatibility,
  transaction acknowledgement, browser support, and operational cost.
- [x] Do not select a provider from documentation claims alone; build a narrow
  branch/spike for the leading option.
- [x] File a separate design and implementation plan before enabling sync.

**No production commit is required for this research task.**

## Phase 10 — Cleanup and completion

### Task 39: Remove compatibility adapters

- [x] Remove temporary local-only collections, typed fallback broadcasters, or
  legacy hook wrappers that are no longer used.
- [x] Keep the fallback broadcaster only if the production worker cannot provide
  a database feed; document its limitation prominently.
- [x] Verify package public APIs do not leak obsolete store types.

**Proposed commit:** `refactor(state): remove legacy synchronization adapters`

### Task 40: Add architecture enforcement

- [x] Add a lightweight repository rule or review checklist preventing new
  repository-result arrays from becoming component caches without an explicit
  state-ownership decision.
- [x] Add a template question to new metadata designs: document, projection,
  metadata collection, draft, or ephemeral state?
- [x] Link the testing contract and mutation lifecycle from contributor docs.

**Proposed commit:** `docs: enforce application state ownership decisions`

### Task 41: Final regression and performance pass

- [x] Run workspace typecheck and all relevant node/browser suites.
- [x] Repeat production-worker reactive tests to detect teardown races.
- [x] Profile a feature-length script for collection hydration and mutation
  confirmation latency.
- [x] Confirm document save performance and `syncToFs()` timings did not regress.
- [x] Confirm no user-authored values appear in diagnostic logs.
- [x] Update graphify and the persistence documentation to reflect the final
  implementation.

**Proposed commit:** `test: complete local-first state migration coverage`

## Phase 11 — Interaction latency and shared live projections

### Task 42: Standardize paced draft execution

- [x] Upgrade `@tanstack/react-db` to `0.1.92` and isolate its virtual collection
  fields at the app-core boundary.
- [x] Add `@tanstack/pacer` `0.21.1` behind a Stagistic-owned async persistence
  wrapper with flush, cancel, abort, observable status, and named retry profiles.
- [x] Route the shared persisted-draft controller through Pacer while retaining
  the injectable deterministic test scheduler.
- [x] Keep local persistence at one attempt and retain failed drafts for visible
  manual retry; allow bounded retry only for explicitly transient operations.

### Task 43: Remove settings input latency

- [x] Keep switches, segmented controls, and selects controlled by the immediate
  parent draft.
- [x] Defer only the expensive editor pagination/settings render with
  `useDeferredValue`.
- [x] Remove selected-state transitions from frequent settings controls.
- [x] Preserve debounced persistence and source confirmation behind the draft.

### Task 44: Share Attribute Manager display drafts

- [x] Add reusable keyed field drafts with revision-based newest-wins cleanup.
- [x] Show cue and place name drafts immediately in their list and detail header.
- [x] Hold character color intent through source confirmation so closing the
  picker cannot flash the old color.
- [x] Retain failed field drafts and let the next blur retry persistence.

### Task 45: Make document-derived sidebars real time

- [x] Hoist one editor snapshot store to the script workspace.
- [x] Extend the live projection with cues and act/scene membership.
- [x] Replace the cue sidebar's component transaction listener with a live
  selector.
- [x] Use live scene titles, cue titles, and linked character display keys in
  Attribute Manager and editor sidebars.
- [x] Cover rapid colors, immediate field display, direct cue edits, settings
  timing, and persistence failures with controllable browser tests.

## Success criteria

- One committed PGlite change updates all mounted relational consumers without
  component-level invalidation.
- Optimistic CRUD is immediate, confirmed from PGlite, and automatically rolled
  back on local persistence failure.
- Drafts retain user input on failure and share one tested lifecycle.
- Tiptap remains the only immediate owner of the active document.
- Core PGlite-backed data does not use TanStack Query.
- The future replication engine can write PGlite and reuse the same UI data
  path.
