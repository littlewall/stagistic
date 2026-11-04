# Script data layer

Persistent script writes go through `ScriptRepository`. Entity stores in
`packages/app-core` own reactive collections, persistence status and optimistic
values. UI and editor receive domain values and callbacks; they do not import
`@stagistic/db` or `@tanstack/react-db`, including their subpaths and types.
The oxlint override enforces this package boundary.

## Reads and writes

- Simple entity mutations use `collection.insert/update/delete` on a
  `createReactiveCollection` with repository persistence handlers. Await
  `transaction.isPersisted.promise` when the caller needs confirmation or errors.
- Composed optimistic commands can use `createOptimisticAction`, even within one
  collection. `scriptPlacesStore.replaceSceneAssignments` replaces a set of rows
  together and persists it with one repository command. Preserve its per-scene
  queue, refresh, confirmation and error reporting.
- An optimistic transaction is not a database transaction. Atomic persistence
  belongs to a repository command. Preserve foreign-key ordering and define what
  happens when only part of a composed operation succeeds.
- React consumers normally read collections through `useLiveQuery`. Confirmed
  snapshots are appropriate for durable lists and draft reconciliation baselines.
  Name the intended semantics; do not replace every confirmed read mechanically.
- Do not add TanStack Query for locally stored script data. It can be considered
  for remote-only account or billing data if those features need it.

Optimistic entity state belongs in app-core stores, never in UI overlays. A
picker's unsubmitted preview, a dirty form field and the editor document are
editing state, not a second optimistic persistence layer. Keep their existing
draft/session contracts.

## Audited stores and deliberate exceptions

Audit: 2026-11-04. These decisions describe the current implementation, not a
requirement to make every operation optimistic.

| Area | Decision and reason |
| --- | --- |
| Script list, music, characters, groups, editor settings, title page | Keep collection mutation handlers. They already use the simple mutation pattern. Script creation/duplication carries a repository command behind the optimistic summary; do not rewrite it as unrelated row inserts. |
| Places | Keep the composed optimistic assignment replacement. It updates one collection, so collection count does not select the pattern. |
| Scene metadata | Keep collection mutations. `saveCharacter` waits for catalog creation before persisting the scene record. `createSceneCharacter` starts both optimistic views immediately; if attachment fails after catalog creation succeeds, the created catalog character stays. One optimistic action would need to preserve that partial-success policy. |
| Comments | Keep direct repository commands. Creation pairs a thread with its first message atomically; delete/restore works with a thread snapshot, and anchor moves are domain commands. Collection reads follow repository sources. An optimistic conversion would add behavior and needs its own acceptance criteria. |
| Attachments | Keep serialized repository commands and refresh after completion. Upload coordinates blob storage, attachment metadata and music binding; a usable file must exist before exposing a confirmed binding. |
| Snapshots and package import/restore | Keep dedicated repository commands. They capture or restore a document, related entities and assets rather than mutating an isolated list row. The snapshot list intentionally reads confirmed records. |
| Settings and title-page reads | Keep `useReactiveRecord` returning confirmed data. `createPersistedDraftController` reconciles against that baseline and retains newer unsaved edits. Its live query currently contributes loading state, not the returned record. |
| Document/autosave | Keep the document session, pacing and `saveLatest` repository path (`useScriptSaveHandlers`). The document is edited locally and saved with its projections; it is not an entity-list mutation. |
| Attribute manager colors | Remove the UI optimistic overlay. `useScriptCharacterCatalog` already supplies collection values. The route's `confirmedCharacterRecords` and `confirmedGroupRecords` are historical names for those optimistic rows, not confirmed-source snapshots. Preserve the existing implicit color derivation on reset. |

For a new entity or mutation, use
[the data-layer skill](../.claude/skills/data-layer/SKILL.md). Document a deliberate
exception at the operation that needs it rather than adding a second generic
server or persistence abstraction.

## Questions for future synchronization

This is a backlog of decisions, not a sync ADR or an implementation proposal.
When sync becomes real, decide:

- Conflict resolution for simultaneous edits, especially the script document.
- How a write is acknowledged if another writer has already changed the same
  field. Today `createReactiveCollection` checks expected values against the
  source and times out after two seconds if confirmation never arrives. A
  conflicting overwrite could trigger this path; that scenario has not been
  tested as a sync contract.
- How deletions are recorded and propagated, including tombstone retention.

Do not add sync infrastructure as part of data-layer consistency work.
