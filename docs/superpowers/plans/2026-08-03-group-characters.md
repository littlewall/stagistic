# Group Characters Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add first-class character groups that behave like speaking entities in the editor while remaining distinct in management, sidebar, copy, and export behavior.

**Architecture:** Store characters and groups in `script_characters` with a discriminating `kind`, plus a transactional membership join table. Keep character-only repository/UI reads filtered, expose groups through a dedicated reactive source, and intentionally combine both kinds only for editor references, colors, autocomplete, and document projection. Reuse the existing `characterId` document reference and bump its schema version because its meaning expands.

**Tech Stack:** TypeScript, React, Tiptap/ProseMirror, Drizzle ORM/PGlite, TanStack React DB, Vite Plus tests, React Aria wrappers, CSS modules.

## Global Constraints

- Preserve the user's uncommitted commented `Cast` workspace line in `AttributeManagerCharactersPanel.tsx`.
- Do not commit; prepare changes and a suggested commit message for user review.
- `SCRIPT_DOCUMENT_SCHEMA_VERSION` changes from `2` to `3` because `characterId` may now reference a group.
- Existing and new ordinary characters use `kind: "character"`; groups use `kind: "group"`.
- Names are normalized and unique across both kinds.
- Groups cannot contain groups and are not automatically deleted when empty.
- Export filtering remains selectable by confirmed characters only; selected members match group occurrences.
- Groups do not appear in the initial-pages cast list.
- After schema or SQL changes run `pnpm --filter @stagistic/db db:compile-migrations`.
- Use fat-arrow functions, guard clauses, `clsx`, shared `@stagistic/*` imports, React Aria wrappers, and keep modified TypeScript/React files at or below 300 lines.

---

### Task 1: Schema, migration, and speaking-entity types

**Files:**
- Modify: `packages/db/src/schema.ts`
- Modify: `packages/db/src/types/characters.ts`
- Modify: `packages/db/src/types/index.ts`
- Modify: `packages/db/src/index.ts`
- Modify: `packages/db/src/queries/scripts/payloads.ts`
- Modify: `packages/db/src/queries/scripts/characters/mappers.ts`
- Modify: `packages/db/src/queries/scripts/characters/read.ts`
- Modify: `packages/db/src/queries/scripts/characters/write.ts`
- Modify: `packages/db/src/queries/scripts/characters/index.ts`
- Test: `packages/db/src/queries/scripts/characters/characters.test.ts`
- Generate: `packages/db/drizzle/0020_add_character_groups.sql`
- Generate: `packages/db/drizzle/meta/0020_snapshot.json`
- Modify: `packages/db/drizzle/meta/_journal.json`
- Generate: `packages/db/src/migrations.compiled.ts`

**Interfaces:**
- Produces:

```ts
export type ScriptCharacterKind = 'character' | 'group';

export interface ScriptCharacterRef {
    id: string,
    kind: 'character',
    key: string,
    colorHex: string | null,
    genderKey: string | null,
    notes: string | null,
    backstory: string | null,
    outline: string | null,
}

export interface ScriptCharacterGroupRef {
    id: string,
    kind: 'group',
    key: string,
    colorHex: string | null,
    memberIds: string[],
}

export type ScriptSpeakingEntityRef = ScriptCharacterRef | ScriptCharacterGroupRef;
```

- `listScriptCharacters(db, scriptId)` returns only `kind = 'character'`.
- `listScriptSpeakingEntities(db, scriptId)` returns both kinds for projection and copy code.
- `getScriptSpeakingEntityByKey` and `getScriptSpeakingEntityById` expose cross-kind collision checks without weakening character-only getters.

- [ ] **Step 1: Add failing query tests**

Extend `characters.test.ts` with a character and group row and assert that `listScriptCharacters` excludes the group, `listScriptSpeakingEntities` includes both, and cross-kind lookup returns the group. Assert the existing unique `(scriptId, characterKey)` constraint rejects a character/group name collision.

- [ ] **Step 2: Run the focused DB test and verify RED**

Run: `pnpm --filter @stagistic/db test -- src/queries/scripts/characters/characters.test.ts`

Expected: failure because `kind`, group membership schema, and speaking-entity query APIs do not exist.

- [ ] **Step 3: Add schema and types**

Add `kind: text('kind').notNull().default('character')` to `scriptCharacters`. Add `scriptCharacterGroupMembers` with `groupId` and `characterId` cascading FKs to `scriptCharacters`, a composite primary key, and an index on `characterId`. Export it through `dbSchema`.

- [ ] **Step 4: Add character-only and speaking-entity queries**

Include `kind` in selects and mappers. Filter existing character reads and writes to `kind = 'character'`; add all-kind internal reads. Make `upsertScriptCharacter` write `kind: 'character'` and never convert a conflicting group row.

- [ ] **Step 5: Generate and compile the migration**

Run: `pnpm --filter @stagistic/db db:generate`

Verify the SQL adds the defaulted `kind`, creates `script_character_group_members`, both cascade FKs, its composite PK, and member index. Do not hand-edit the generated snapshot.

- [ ] **Step 6: Re-run the focused DB test**

Run: `pnpm --filter @stagistic/db test -- src/queries/scripts/characters/characters.test.ts`

Expected: PASS.

---

### Task 2: Transactional group CRUD and membership repository

**Files:**
- Create: `packages/db/src/queries/scripts/characters/groups.ts`
- Modify: `packages/db/src/queries/scripts/characters/index.ts`
- Create: `packages/db/src/repo/characterGroupHandlers.ts`
- Test: `packages/db/src/repo/characterGroupHandlers.test.ts`
- Modify: `packages/db/src/scriptRepository.ts`
- Modify: `packages/db/src/repo/createLocalPgliteReactiveSources.ts`
- Modify: `packages/db/src/repo/createLocalPgliteRepository.ts`
- Modify: `packages/db/src/repo/characterHandlers/coreMutations.ts`
- Modify: `packages/db/src/repo/characterHandlers/genderMutations.ts`
- Modify: `packages/db/src/repo/characterHandlers/outlineMutations.ts`
- Modify: `packages/db/src/repo/characterHandlers/outboxPayloads.ts`
- Modify: `packages/db/src/repo/characterHandlers/types.ts`
- Test: `packages/db/src/repo/characterHandlers/handlers.test.ts`

**Interfaces:**
- Consumes: Task 1 speaking-entity types and schema.
- Produces these `ScriptRepository` members:

```ts
allocateScriptCharacterGroupId(): string,
getScriptCharacterGroupsSource(scriptId: string): ReactiveQuerySource<ScriptCharacterGroupRef>,
listScriptCharacterGroups(scriptId: string): Promise<ScriptCharacterGroupRef[]>,
createScriptCharacterGroup(
    scriptId: string,
    key: string,
): Promise<ScriptCharacterGroupRef | null>,
createScriptCharacterGroupWithId(
    scriptId: string,
    input: {id: string, key: string, colorHex?: string | null, timestamp?: number},
): Promise<ScriptCharacterGroupRef | null>,
renameScriptCharacterGroup(
    scriptId: string,
    groupId: string,
    key: string,
): Promise<ScriptCharacterGroupRef | null>,
deleteScriptCharacterGroup(scriptId: string, groupId: string): Promise<void>,
setScriptCharacterGroupColor(
    scriptId: string,
    groupId: string,
    colorHex: string | null,
): Promise<ScriptCharacterGroupRef | null>,
replaceScriptCharacterGroupMembers(
    scriptId: string,
    groupId: string,
    memberIds: string[],
): Promise<ScriptCharacterGroupRef | null>,
```

- [ ] **Step 1: Write failing handler tests**

Cover normalized create/read, cross-kind duplicate rejection, rename collision rejection, group color, full-set membership replacement, duplicate member deduplication, cross-script rejection, group-as-member rejection, group deletion cascade, and character deletion membership cascade.

- [ ] **Step 2: Run the handler tests and verify RED**

Run: `pnpm --filter @stagistic/db test -- src/repo/characterGroupHandlers.test.ts`

Expected: failure because the group repository does not exist.

- [ ] **Step 3: Implement group queries**

`listScriptCharacterGroups` selects `kind = 'group'`, reads memberships, and returns sorted unique `memberIds`. `replaceScriptCharacterGroupMembers` deletes the current rows then inserts the validated target set inside the caller transaction. CRUD predicates include both `scriptId` and `kind`.

- [ ] **Step 4: Implement transactional handlers**

Normalize keys through `normalizeCharacterKey`. Before create/rename, query the all-kind key lookup and return `null` on collision. Before membership replacement, load the group and every requested member; reject missing, cross-script, or non-character rows before writing. Update script timestamps and record `character-group.create|rename|delete|color|members` outbox events in the same transaction, then call `syncDb()` once.

- [ ] **Step 5: Harden existing character mutations**

Character confirm, delete, rename, color, gender, and outline must operate only on `kind = 'character'`. A same-name group must produce `null` instead of being overwritten or merged.

- [ ] **Step 6: Wire reactive group reads**

Add a PGlite reactive source whose watch query unions group rows and membership rows so both metadata and membership changes refresh the source. Expose all repository methods and allocate group IDs with `uuidv7`.

- [ ] **Step 7: Run repository tests**

Run: `pnpm --filter @stagistic/db test -- src/repo/characterGroupHandlers.test.ts src/repo/characterHandlers/handlers.test.ts`

Expected: PASS.

---

### Task 3: Projection, document schema version, and script duplication

**Files:**
- Modify: `packages/script/src/document/scriptDocument.ts`
- Modify: `packages/db/src/repo/documentProjection.ts`
- Modify: `packages/db/src/repo/persist/persistDocumentDelta.ts`
- Modify: `packages/db/src/blocks/migrate.ts`
- Modify: `packages/db/src/queries/scripts/duplicate.ts`
- Test: `packages/db/src/queries/scripts/duplicate.test.ts`
- Test: `packages/db/src/repo/documentProjection.test.ts`

**Interfaces:**
- Consumes: `listScriptSpeakingEntities` from Task 1.
- Produces a pure content-json transformer inside `duplicate.ts`:

```ts
const remapCharacterTagIds = (
    contentJson: string | null,
    entityIdMap: ReadonlyMap<string, string> | null,
): string | null;
```

When `entityIdMap` is `null`, every `characterTag.attrs.characterId` becomes `null`; otherwise known IDs are remapped and unknown IDs become `null`.

- [ ] **Step 1: Write failing projection and duplication tests**

Seed a character, a group, membership, cue refs, and an inline `characterTag` group ref. With attributes enabled, assert fresh IDs, preserved kinds, remapped membership, remapped block refs, and remapped tag IDs. With attributes disabled, assert no catalog rows/memberships/block refs and a `null` tag ID while text remains `ALL`.

- [ ] **Step 2: Run tests and verify RED**

Run: `pnpm --filter @stagistic/db test -- src/queries/scripts/duplicate.test.ts`

Expected: group rows/memberships and inline tag IDs are not handled.

- [ ] **Step 3: Admit groups to document projection**

Replace `listScriptCharacters` with `listScriptSpeakingEntities` when validating stored reference IDs in rebuild, delta persistence, and migration. Keep character-only catalog reads unchanged elsewhere.

- [ ] **Step 4: Copy groups, memberships, and tag refs**

When `copyAttributes` is true, copy every speaking-entity row, construct one old-to-new entity map, insert membership rows only after both sides exist, remap projection refs, and rewrite inline tag IDs. When false, rewrite inline group/character tag IDs to `null`.

- [ ] **Step 5: Bump the document schema version**

Set `SCRIPT_DOCUMENT_SCHEMA_VERSION = 3` and update any exact-version assertions.

- [ ] **Step 6: Run focused DB tests**

Run: `pnpm --filter @stagistic/db test -- src/queries/scripts/duplicate.test.ts`

Expected: PASS.

---

### Task 4: Optimistic group catalog in app-core

**Files:**
- Create: `packages/app-core/src/characters/scriptCharacterGroupsStore.ts`
- Create: `packages/app-core/src/characters/scriptCharacterGroupsStore.test.ts`
- Modify: `packages/app-core/src/characters/useScriptCharacterCatalog.ts`
- Modify: `packages/app-core/src/characters/useScriptCharacterCatalog.browser.test.tsx`
- Modify: `packages/app-core/src/characters/index.ts`

**Interfaces:**
- Consumes: Task 2 repository methods.
- Produces these additions from `useScriptCharacterCatalog`:

```ts
groups: ScriptCharacterGroupRef[],
creatingGroupKeys: string[],
deletingGroupIds: string[],
renamingGroupIds: string[],
colorUpdatingGroupIds: string[],
membershipUpdatingGroupIds: string[],
createGroup(key: string): Promise<ScriptCharacterGroupRef | null>,
deleteGroup(id: string): Promise<void>,
renameGroup(id: string, key: string): Promise<ScriptCharacterGroupRef | null>,
setGroupColor(id: string, color: string | null): Promise<ScriptCharacterGroupRef | null>,
replaceGroupMembers(id: string, memberIds: string[]): Promise<ScriptCharacterGroupRef | null>,
```

- [ ] **Step 1: Write failing store tests**

Assert optimistic create/color/member updates, normalized cross-kind collision rejection, confirmed refresh after rename, and rollback of `memberIds` after a rejected repository mutation.

- [ ] **Step 2: Run tests and verify RED**

Run: `pnpm --filter @stagistic/app-core test -- src/characters/scriptCharacterGroupsStore.test.ts`

Expected: missing group store.

- [ ] **Step 3: Implement the group store**

Use a separate reactive collection backed by `getScriptCharacterGroupsSource`. Map collection insert/update/delete to dedicated group repository calls. Treat `colorHex` and `memberIds` as separate mutation actions and let TanStack DB roll back failed optimistic transactions.

- [ ] **Step 4: Extend the catalog hook**

Read and sort groups, expose pending action IDs, include group source/mutation errors in the catalog error, and check normalized proposed names against both `characters` and `groups` before optimistic create or rename.

- [ ] **Step 5: Run app-core tests**

Run: `pnpm --filter @stagistic/app-core test -- src/characters/scriptCharacterGroupsStore.test.ts src/characters/useScriptCharacterCatalog.browser.test.tsx`

Expected: PASS.

---

### Task 5: Route-level group actions and document lifecycle

**Files:**
- Create: `packages/app-routes/src/routes/script/editor/characters/useCharacterGroupActions.ts`
- Test: `packages/app-routes/src/routes/script/editor/characters/useCharacterGroupActions.browser.test.tsx`
- Modify: `packages/app-routes/src/routes/script/editor/characters/useCharacterComputed.ts`
- Modify: `packages/app-routes/src/routes/script/editor/characters/useScriptEditorCharacters.ts`
- Modify: `packages/app-routes/src/routes/script/editor/characters/useScriptEditorCharacters.types.ts`
- Modify: `packages/app-routes/src/routes/script/ScriptCharactersContext.tsx`
- Modify: `packages/app-routes/src/routes/script/useScriptCharactersContextValue.ts`
- Modify: `packages/app-routes/src/routes/script/ScriptEditorRoute.tsx`

**Interfaces:**
- Produces character context fields `confirmedGroupRecords`, group pending IDs, and group CRUD/color/member handlers.
- Produces `normalizedSpeakingEntityRecords`, the sorted concatenation of normalized confirmed characters and groups passed to `Editor.document.persistentCharacters`.

- [ ] **Step 1: Write failing group action tests**

Assert create links same-key unconfirmed cue/tag refs, rename updates linked text and keeps the group ID, delete unlinks refs while preserving text, and failures leave/revert the document consistently.

- [ ] **Step 2: Run tests and verify RED**

Run: `pnpm --filter @stagistic/app-routes test:browser -- useCharacterGroupActions.browser.test.tsx`

Expected: missing hook/context actions.

- [ ] **Step 3: Implement group document actions**

Reuse `linkCharacterRefInScriptDocument`, `renameCharacterInScriptDocument`, and `unlinkCharacterRefInScriptDocument`; the stored reference shape is intentionally shared. Call the group catalog first, then apply/save the matching document change. On rename persistence failure, restore the previous editor text as character rename already does.

- [ ] **Step 4: Compute unified editor refs without polluting character-only views**

Keep `confirmedCharacterRecords` character-only, add `confirmedGroupRecords`, exclude both sets from unconfirmed keys, and return `normalizedSpeakingEntityRecords` for editor autocomplete/color/reference sync.

- [ ] **Step 5: Wire context and editor route**

Expose group data/actions through `ScriptCharactersContext`; pass `normalizedSpeakingEntityRecords` to `persistentCharacters`. Do not pass groups to gender, outline, export-filter, or cast-list inputs.

- [ ] **Step 6: Run route action tests**

Run: `pnpm --filter @stagistic/app-routes test:browser -- useCharacterGroupActions.browser.test.tsx`

Expected: PASS.

---

### Task 6: Sidebar grouping, empty state, color, and manager navigation

**Files:**
- Modify: `packages/ui/src/editor-panels/types.ts`
- Create: `packages/ui/src/editor-panels/CharacterGroupRow.tsx`
- Modify: `packages/ui/src/editor-panels/EditorSidebar.tsx`
- Modify: `packages/ui/src/editor-panels/EditorSidebar.module.css`
- Test: `packages/ui/src/editor-panels/EditorSidebar.browser.test.tsx`
- Modify: `packages/app-routes/src/routes/script/editor/characters/ScriptCharactersSidebar.tsx`
- Modify: `packages/app-routes/src/routes/script/settings/ScriptSettingsModalProvider.tsx`
- Modify: `packages/app-routes/src/routes/script/attributes/useAttributeManagerModalState.ts`

**Interfaces:**
- `EditorSidebarData` adds `groups: EditorSidebarGroup[]` where:

```ts
export interface EditorSidebarGroup extends EditorSidebarCharacter {
    isEmpty: boolean,
}
```

- Actions add `onEditGroup`, `onSetGroupColor`, and reuse `onFocusCharacter` because document text lookup is key-based.

- [ ] **Step 1: Write failing sidebar browser tests**

Assert order confirmed characters → `Groups` → unconfirmed characters, conditional `Groups` heading, `Empty` tag, focus action, color persistence callback, and separate manager callback.

- [ ] **Step 2: Run tests and verify RED**

Run: `pnpm --filter @stagistic/ui test:browser -- EditorSidebar.browser.test.tsx`

Expected: no group section or group row.

- [ ] **Step 3: Build the group row**

Render the standard color swatch/control, group key, optional quiet `Empty` tag, focus control, and manage control. Reuse `CharacterColorControl` and `useCharacterColorPickerState`; do not show gender, outline, confirm, or delete actions.

- [ ] **Step 4: Split sidebar sections**

Keep existing confirmed/unconfirmed row behavior, insert the conditional group section between them, and update the global empty state so an existing group counts as content.

- [ ] **Step 5: Add group manager navigation state**

Add `selectedGroupId`, `openGroup`, and an initial `groups` workspace selection in the attribute-manager state. Expose `openAttributeManagerGroup` from the settings provider and call it from the group row.

- [ ] **Step 6: Run sidebar tests**

Run: `pnpm --filter @stagistic/ui test:browser -- EditorSidebar.browser.test.tsx`

Expected: PASS.

---

### Task 7: Groups workspace, validation, membership picker, and deletion warnings

**Files:**
- Modify: `packages/ui/src/dialogs/AttributeManagerCharactersPanel.tsx`
- Create: `packages/ui/src/dialogs/AttributeManagerEntityBrowser.tsx`
- Create: `packages/ui/src/dialogs/AttributeManagerGroupDetail.tsx`
- Create: `packages/ui/src/dialogs/CreateGroupModal.tsx`
- Create: `packages/ui/src/dialogs/RemoveGroupModal.tsx`
- Modify: `packages/ui/src/dialogs/RemoveCharacterModal.tsx`
- Modify: `packages/ui/src/dialogs/AttributeManagerCharactersPanel.module.css`
- Modify: `packages/ui/src/index.ts`
- Test: `packages/ui/src/dialogs/AttributeManagerCharactersPanel.browser.test.tsx`
- Test: `packages/ui/src/dialogs/AttributeManagerCharactersRename.browser.test.tsx`
- Modify: `packages/app-routes/src/routes/script/settings/useAttributeManagerItems.ts`
- Modify: `packages/app-routes/src/routes/script/settings/ScriptAttributeManagerModal.tsx`
- Modify: `packages/app-routes/src/routes/script/settings/ScriptSettingsModalProvider.tsx`
- Test: `packages/app-routes/src/routes/script/settings/ScriptAttributeManagerModal.browser.test.tsx`

**Interfaces:**
- `AttributeManagerCharactersPanel` adds group items with `id`, `name`, `color`, `memberIds`, and `usageCount`, plus create/rename/delete/color/member callbacks and initial selected workspace/group.
- `AttributeManagerGroupDetail` receives confirmed character options and calls `onChangeMemberIds(nextIds)` from `MultiComboBox`.
- `RemoveCharacterModal` receives `groupNames: string[]` and renders the dynamic sentence `${characterName} belongs to ${formattedGroupNames}. Deleting ${characterName} removes them from these groups.`

- [ ] **Step 1: Write failing workspace tests**

Cover group list/search/create/select, empty valid group, duplicate validation across both kinds, rename validation, tag-based membership updates, rollback-visible confirmed members after failure, group color, and empty detail state.

- [ ] **Step 2: Write failing deletion dialog tests**

Assert a used group warns that occurrences become unconfirmed while script text remains; an unused group omits the usage warning. Assert character deletion lists all containing group names.

- [ ] **Step 3: Run UI tests and verify RED**

Run: `pnpm --filter @stagistic/ui test:browser -- AttributeManagerCharactersPanel.browser.test.tsx AttributeManagerCharactersRename.browser.test.tsx`

Expected: the Groups workspace is only a placeholder.

- [ ] **Step 4: Extract the shared entity browser**

Move search/add/list rendering out of the existing 300+ line panel. Keep the user's commented `Cast` tab line untouched. Make create/search labels and enabled state depend on `characters` versus `groups`.

- [ ] **Step 5: Implement group create and detail UI**

`CreateGroupModal` normalizes with `normalizeCharacterKey`, validates against all character and group names, and uses exact group copy. `AttributeManagerGroupDetail` provides name, color, members, and delete action only; it does not render gender or outline.

- [ ] **Step 6: Wire optimistic membership and usage data**

Map catalog groups to manager items, derive `usageCount` from `useEditorLiveCharacters().countsByCharacterId`, derive character `groupNames` from group membership, and route callbacks to the group catalog/context actions. The app-core store supplies rollback on failure.

- [ ] **Step 7: Run UI and route manager tests**

Run: `pnpm --filter @stagistic/ui test:browser -- AttributeManagerCharactersPanel.browser.test.tsx AttributeManagerCharactersRename.browser.test.tsx`

Run: `pnpm --filter @stagistic/app-routes test:browser -- ScriptAttributeManagerModal.browser.test.tsx`

Expected: PASS.

---

### Task 8: Export membership semantics and cast exclusion

**Files:**
- Modify: `packages/export/src/scriptData.ts`
- Modify: `packages/export/src/filterByCharacter.ts`
- Modify: `packages/export/src/deriveBasicExportPlan.ts`
- Test: `packages/export/src/filterByCharacter.test.ts`
- Modify: `packages/app-routes/src/routes/script/export/useExportScriptData.ts`
- Modify: `packages/app-routes/src/routes/script/export/collectInitialPageData.ts`
- Test: `packages/app-routes/src/routes/script/export/collectInitialPageData.test.ts`
- Test: `packages/app-routes/src/routes/script/ScriptExportRoute.browser.test.tsx`

**Interfaces:**
- `ScriptData` adds:

```ts
export interface ExportCharacterGroup {
    id: string,
    key: string,
    memberIds: string[],
}

groups: ExportCharacterGroup[],
```

- `script.characters` remains confirmed characters only and therefore remains the sole `CharacterFilterModule` input.

- [ ] **Step 1: Write failing export filter tests**

Add scenes containing direct `ANNA`, group `ALL`, and unrelated group `CHORUS`. Assert selecting Anna keeps direct and `ALL` scenes when Anna is a member, does not keep `CHORUS`, does not alter `ALL` text, and an empty group matches nobody.

- [ ] **Step 2: Write failing cast exclusion tests**

Pass character and group catalog records and assert only character-kind rows become `initialCharacters` or filter checkboxes.

- [ ] **Step 3: Run tests and verify RED**

Run: `pnpm --filter @stagistic/export test -- src/filterByCharacter.test.ts`

Run: `pnpm --filter @stagistic/app-routes test -- src/routes/script/export/collectInitialPageData.test.ts`

Expected: group membership is not consulted and group refs can leak into export characters.

- [ ] **Step 4: Expand selected characters to matching group entities**

For `mode: 'only'`, select confirmed character IDs, find groups whose `memberIds` intersect that set, and keep scenes mentioning either selected characters or those group IDs/keys. Do not add group IDs to the public filter value.

- [ ] **Step 5: Build export data from catalogs**

Build `script.characters` from confirmed character catalog rows, not every snapshot ref. Build `script.groups` from group catalog rows. Keep `collectInitialPageData` character-only and add an exact-kind regression assertion.

- [ ] **Step 6: Run export tests**

Run: `pnpm --filter @stagistic/export test -- src/filterByCharacter.test.ts`

Run: `pnpm --filter @stagistic/app-routes test -- src/routes/script/export/collectInitialPageData.test.ts`

Expected: PASS.

---

### Task 9: Focused integration checks and graph refresh

**Files:**
- Modify only files required by failures caused directly by Tasks 1–8.
- Update: `graphify-out/*` through the prescribed command.

- [ ] **Step 1: Compile migrations after all DB edits**

Run: `pnpm --filter @stagistic/db db:compile-migrations`

Expected: compiled migrations are current.

- [ ] **Step 2: Run package typechecks**

Run:

```bash
pnpm --filter @stagistic/db typecheck
pnpm --filter @stagistic/app-core typecheck
pnpm --filter @stagistic/script typecheck
pnpm --filter @stagistic/editor typecheck
pnpm --filter @stagistic/ui typecheck
pnpm --filter @stagistic/export typecheck
pnpm --filter @stagistic/app-routes typecheck
```

Expected: PASS.

- [ ] **Step 3: Run focused Node tests**

Run:

```bash
pnpm --filter @stagistic/db test -- src/queries/scripts/characters/characters.test.ts src/repo/characterGroupHandlers.test.ts src/queries/scripts/duplicate.test.ts
pnpm --filter @stagistic/app-core test -- src/characters/scriptCharacterGroupsStore.test.ts
pnpm --filter @stagistic/export test -- src/filterByCharacter.test.ts
pnpm --filter @stagistic/app-routes test -- src/routes/script/export/collectInitialPageData.test.ts
```

Expected: PASS.

- [ ] **Step 4: Run focused browser tests**

Run:

```bash
pnpm --filter @stagistic/ui test:browser -- AttributeManagerCharactersPanel.browser.test.tsx EditorSidebar.browser.test.tsx
pnpm --filter @stagistic/app-routes test:browser -- useCharacterGroupActions.browser.test.tsx ScriptAttributeManagerModal.browser.test.tsx
```

Expected: PASS, except only documented pre-existing viewport-sensitive editor reds that are unrelated to touched behavior.

- [ ] **Step 5: Run lint on touched files**

Run:

```bash
npx eslint packages/db/src packages/script/src packages/app-core/src/characters packages/app-routes/src/routes/script packages/editor/src packages/ui/src packages/export/src
npx stylelint "packages/ui/src/**/*.{css,scss}"
```

Expected: PASS.

- [ ] **Step 6: Refresh the knowledge graph**

Run: `graphify update .`

Expected: graph reflects the group schema, repository, UI, and export relationships.

- [ ] **Step 7: Review final diff**

Run: `git diff --check` and `git status --short`. Confirm the pre-existing commented `Cast` line remains, no unrelated user changes were overwritten, and no commit was created.
