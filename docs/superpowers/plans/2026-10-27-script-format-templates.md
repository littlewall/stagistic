# Script Format Templates Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Let a writer apply a recognised script-format standard (Dramatists Guild, Samuel French, Sketchworks) to a script, either locked to the template or copied into editable custom settings, consistently across the editor and PDF export.

**Architecture:** Format templates are typed `EditorSettingsOverride` data modules in `packages/script`. A script stores an optional `format_template_id`; when set it is **locked** and a single resolver produces the effective `EditorSettings` live from the template definition, otherwise from the per-script settings tables (today's path). Editor, export preview and PDF all read through the resolver so the lock holds everywhere.

**Tech Stack:** TypeScript monorepo, Drizzle + PGlite (local-first), React settings/export UI, Tiptap editor, hand-written SQL migrations, vite-plus/test, moon task runner.

**Spec:** [docs/superpowers/specs/2026-10-27-script-format-templates-design.md](../specs/2026-10-27-script-format-templates-design.md) (measurements: [docs/research/2026-10-27-script-format-templates.md](../../research/2026-10-27-script-format-templates.md))

## Global Constraints

- Phase-1 template ids: `stagistic-default`, `dg-traditional`, `dg-modern`, `dg-musical`, `samuel-french`, `sketch-comedy`. No UK/BBC.
- Template values come from the research doc's Proscenium table; convert inches→chars as `chars = inches × 10`. All templates use Courier Prime (no font picker this phase).
- Indentation is character-based; never introduce a proportional-font path.
- Do **not** bump `SCRIPT_DOCUMENT_SCHEMA_VERSION` (projection/DB/UI only).
- After any edit under `packages/db/src/` or `drizzle/*.sql`, run `moon run db:db-compile-migrations`. Migrations are hand-written.
- Our presets are called **Template**; the export selector (Basic / Integrated score) is renamed **Export type** — UI strings only, `EXPORT_TEMPLATES` keys/components unchanged.
- Checks via moon: `moon run root:typecheck`, `moon run root:lint`, `moon run root:test`. Never commit — prepare changes + message for the user.

## Review Focus

- **Reload persistence of previously-unpersisted block fields:** a script whose Stage direction has a non-zero `spacingAfterEm` or a scene with `sceneNumberFormat: 'paren'` must survive a reload. → Task 1.
- **Lock resolves live:** a script locked to `dg-modern` must ignore any stale rows left in `script_settings_*` and render the template's values in editor and PDF. → Task 3.
- **Apply discards previous custom values:** after applying any template as a copy, the prior custom settings are gone (no hidden restore); Unlock writes the template's current values, Reset writes Stagistic Default. → Task 3 / Task 5b.
- **Draft/version carry their own lock state:** exporting or opening a draft that is locked to `samuel-french` must not read Current's format. → Task 3.
- **Export inherits the lock:** when the selected state is locked, Page-flow options the template presets are read-only and match the template; non-template options stay editable. → Task 6.

---

### Task 1: Persist `spacingAfterEm` and `sceneNumberFormat` per block

Pre-existing bug: both fields exist on `BlockSpacingSettings` but have no columns in `script_settings_blocks` and no codec mapping, so they vanish on reload. Templates set both.

**Files:**
- Modify: `packages/db/src/schema/settings.ts` (add columns to `scriptSettingsBlocks`)
- Create: `drizzle/<next-number>_block_spacing_after_scene_number.sql`
- Modify: `packages/db/src/queries/scripts/config.ts` (replacement row type + select)
- Modify: `packages/db/src/repo/config/configRows.ts` (`buildConfigRows`, `hydrateBlockSettings`)
- Test: `packages/db/src/repo/config/settingsPersistence.test.ts`

**Interfaces:**
- Produces: `script_settings_blocks.spacing_after_millis integer NULL`, `script_settings_blocks.scene_number_format text NULL`; `buildConfigRows`/`hydrateBlockSettings` round-trip `spacingAfterEm` (via `toMillis`/`fromMillis`) and `sceneNumberFormat` (validated by `isSceneNumberFormat`).

- [x] **Step 1: Write the failing test**

In `settingsPersistence.test.ts`, add a test that writes an override with `blocks: { stageDirection: { spacingAfterEm: 1.5 }, scene: { sceneNumberFormat: 'paren' } }` via the settings handler, reads it back with `readScriptSettings`, and asserts both values survive.

- [x] **Step 2: Run it and watch it fail**

Run: `moon run db:test -- settingsPersistence`
Expected: FAIL — `spacingAfterEm`/`sceneNumberFormat` come back `undefined`.

- [x] **Step 3: Add the two columns** to `scriptSettingsBlocks` in `settings.ts` (`spacingAfterMillis: integer('spacing_after_millis')`, `sceneNumberFormat: text('scene_number_format')`), then run `moon run db:db-compile-migrations` and hand-write the matching `ALTER TABLE` migration SQL.

- [x] **Step 4: Map the fields** in `configRows.ts`: in `buildConfigRows` set `spacingAfterMillis: toMillis(block.spacingAfterEm)` and `sceneNumberFormat: block.sceneNumberFormat ?? null`; in `hydrateBlockSettings` read `fromMillis(row.spacingAfterMillis)` into `spacingAfterEm` and copy `row.sceneNumberFormat` when `isSceneNumberFormat` passes. Extend the replacement row type + select in `queries/scripts/config.ts`.

- [x] **Step 5: Run the test and the db suite**

Run: `moon run db:test -- settingsPersistence`
Expected: PASS.

- [x] **Step 6: Commit** (prepare message; user commits)

```
fix(db): persist block spacingAfter and sceneNumberFormat
```

---

### Task 2: Format template definitions

**Files:**
- Create: `packages/script/src/templates/types.ts`, `packages/script/src/templates/index.ts`, one file per template under `packages/script/src/templates/definitions/`
- Modify: `packages/script/src/index.ts` (re-export `./templates`)
- Test: `packages/script/src/templates/templates.test.ts`

**Interfaces:**
- Produces:
  - `type FormatTemplateId = 'stagistic-default' | 'dg-traditional' | 'dg-modern' | 'dg-musical' | 'samuel-french' | 'sketch-comedy'`
  - `interface FormatTemplate { id: FormatTemplateId; label: string; settings: EditorSettingsOverride; pdfFlow: PdfFlowPreset; forcedHeaderFooter: HeaderFooterSettingsPatch }`
  - `interface PdfFlowPreset { actOnNewPage: boolean; sceneOnNewPage: boolean; repeatCharacterOnBreak: boolean; continuationMark: 'none' | 'contd' | 'cont' }`
  - `const ALL_FORMAT_TEMPLATES: readonly FormatTemplate[]`, `getFormatTemplate(id): FormatTemplate | undefined`, `FORMAT_TEMPLATE_IDS: readonly FormatTemplateId[]`
  - `stagistic-default.settings` is `{}` (identity over `DEFAULT_EDITOR_SETTINGS`).
  - `FormatTemplate.settings` only ever carries **format** keys (`page`, `typography`, `headerFooter`, `blocks`). It must never set `visual`, `structure`, `initialPages` — those are non-format and the resolver/UI rely on templates not touching them. Add a test asserting no template's `settings` has those keys.

- [x] **Step 1: Write the failing test**

Assert: `getFormatTemplate('dg-modern')` is defined; `mergeEditorSettings(DEFAULT_EDITOR_SETTINGS, getFormatTemplate('stagistic-default')!.settings)` deep-equals `DEFAULT_EDITOR_SETTINGS`; `mergeEditorSettings(DEFAULT_EDITOR_SETTINGS, getFormatTemplate('dg-modern')!.settings).blocks.character.indentLeftChars === 25`; `getFormatTemplate('samuel-french')!.pdfFlow.continuationMark === 'cont'`; `getFormatTemplate('dg-traditional')!.settings.blocks!.stageDirection!.parenWrap === true` (field added in Task 4 — until then assert `indentLeftChars === 15`).

- [x] **Step 2: Run it and watch it fail**

Run: `moon run script:test -- templates`
Expected: FAIL — module not found.

- [x] **Step 3: Author the definitions** using the research table (page size, margins, per-block indent/spacing/align/case/B·I·U, lyrics, pdfFlow, forced header `{page}.` top-right). One `FormatTemplate` per file; assemble in `index.ts`.

- [x] **Step 4: Run the test**

Run: `moon run script:test -- templates`
Expected: PASS.

- [x] **Step 5: Commit**

```
feat(script): add format template definitions
```

---

### Task 3: Lock state storage, resolver, and snapshot round-trip

**Files:**
- Modify: `packages/db/src/schema/scripts.ts` (add `formatTemplateId`)
- Create: `drizzle/<next>_scripts_format_template_id.sql`
- Create: `packages/script/src/settings/resolveScriptEditorSettings.ts` (+ export)
- Modify: `packages/db/src/repo/scripts.ts` (read/write the id), `packages/db/src/repo/package/readScriptPackageSource.ts` and the package write path (`scriptPackageWrite.ts`) to serialize `formatTemplateId`
- Test: `packages/script/src/settings/resolveScriptEditorSettings.test.ts`, a db test for package round-trip

**Interfaces:**
- Produces:
  - `scripts.format_template_id text NULL` — non-null ⇒ locked.
  - `resolveScriptEditorSettings({ formatTemplateId, override }: { formatTemplateId: FormatTemplateId | null; override: EditorSettingsOverride | null }): EditorSettings` — locked ⇒ `mergeEditorSettings(DEFAULT, getFormatTemplate(id)?.settings)`, else `mergeEditorSettings(DEFAULT, override)`.
  - Repo helpers `readScriptFormatTemplateId(db, scriptId)`, `setScriptFormatTemplateId(tx, scriptId, id | null, now)`.
  - Package payload gains `formatTemplateId: FormatTemplateId | null`.

- [x] **Step 1: Write the failing resolver test**

Assert: with `formatTemplateId: 'dg-modern'` and a non-empty `override`, the result equals the template merge and **ignores** the override (character indent 25, not the override's value); with `formatTemplateId: null` it equals `mergeEditorSettings(DEFAULT, override)`.

- [x] **Step 2: Run it and watch it fail**

Run: `moon run script:test -- resolveScriptEditorSettings`
Expected: FAIL — not defined.

- [x] **Step 3: Implement `resolveScriptEditorSettings`** per the signature above and export it from `settings/index.ts`.

- [x] **Step 4: Add the column + repo helpers + package round-trip.** Add `formatTemplateId` to `scripts.ts`, compile + hand-write migration, add the repo read/write helpers, and include `formatTemplateId` in the package source read and write so drafts/versions carry it.

- [x] **Step 5: Write + run the package round-trip test**

A db test: create a script, `setScriptFormatTemplateId(... 'samuel-french')`, snapshot it, read the snapshot source back, assert `formatTemplateId === 'samuel-french'`.
Run: `moon run script:test -- resolveScriptEditorSettings` and `moon run db:test -- package`
Expected: PASS.

- [x] **Step 6: Commit**

```
feat(script): resolve locked format templates and persist lock state
```

---

### Task 4: `Wrap in parentheses` block setting (Stage direction)

**Files:**
- Modify: `packages/script/src/settings/types.ts` (add `parenWrap?: boolean` to `BlockSpacingSettings`), `packages/script/src/settings/merge.ts` / `normalize.ts` as needed
- Modify: `packages/db/src/schema/settings.ts` (+ `paren_wrap boolean`), new migration, `configRows.ts` mapping
- Modify: editor block rendering for stage direction (CSS pseudo-element mirroring `packages/script`/`packages/editor` aside pattern, e.g. `aside.module.css` `content: '('`)
- Modify: Task 2 `dg-traditional`, `dg-musical`, `samuel-french` to set `stageDirection.parenWrap: true`
- Test: `packages/db/src/repo/config/settingsPersistence.test.ts`, an editor browser test for the rendered parentheses

**Interfaces:**
- Produces: `BlockSpacingSettings.parenWrap?: boolean`; persisted column `script_settings_blocks.paren_wrap`; stage-direction block renders literal `( )` via pseudo-elements when true, text unchanged.

- [x] **Step 1: Write the failing persistence + render tests**

Persistence: write `blocks.stageDirection.parenWrap = true`, read back, assert `true`. Editor browser test: a stage-direction block with `parenWrap` on shows a leading `(` pseudo-element and the model text has no parenthesis.

- [x] **Step 2: Run them and watch them fail**

Run: `moon run db:test -- settingsPersistence` and `moon run editor:test-browser -- stageDirection`
Expected: FAIL.

- [x] **Step 3: Add the field, the column + codec, and the CSS pseudo-element** following the aside/note precedent; set `parenWrap: true` on the three templates.

- [x] **Step 4: Run the tests**

Expected: PASS.

- [x] **Step 5: Commit**

```
feat(editor): add wrap-in-parentheses setting for stage directions
```

---

### Task 5a: Settings sidebar split + Page format rename

**Files:**
- Modify: `packages/app-routes/src/routes/script/settings/settingsMenu.ts` (two groups; move Page layout→"Page format"), `constants.ts` labels
- Modify: `packages/ui/src/dialogs/settings/types.ts` (`SettingsNavGroup` gains `headerAccessory?: ReactNode`) and `SettingsModal.tsx` to render it
- Test: `settingsMenu.test.ts`, `SettingsModal` browser test

**Interfaces:**
- Produces: `scriptSettingsMenu` with groups `Script` (Title page, Initial pages, Visual preferences, Danger zone) then `Format` (Page format, Header and footer, Block settings); `SettingsNavGroup.headerAccessory?` rendered to the right of a group label.

- [x] **Step 1: Write the failing test** asserting the two group ids/order and that `Page format` replaces `Page layout`, and that a group's `headerAccessory` node renders.
- [x] **Step 2: Run and watch it fail.** `moon run app-routes:test -- settingsMenu`
- [x] **Step 3: Implement** the regrouping, the rename, and the `headerAccessory` slot.
- [x] **Step 4: Run tests.** Expected PASS.
- [x] **Step 5: Commit** — `refactor(settings): split Script and Format groups, rename Page format`

---

### Task 5b: Template picker, apply/confirm, lock/unlock, locked panels

**Files:**
- Create: `packages/app-routes/src/routes/script/settings/template/FormatTemplatePicker.tsx`, `ApplyTemplateDialog.tsx`, `FormatLockBanner.tsx`
- Modify: the settings view model that owns the settings record + draft (`useScriptEditorSettingsDraft.ts` and the modal provider) to expose `formatTemplateId`, `applyTemplate(id, { lock })`, `unlock()`, and a locked flag
- Modify: Format panels (Page format, Header and footer, Block element panel) to show `FormatLockBanner` under their Format section and disable controls when locked; Block panel keeps an always-editable **Typing** section; **Header and footer** disables only the cells the template forces (`forcedHeaderFooter`), leaving free cells editable
- Test: browser tests for apply→lock, unlock-copies-values, reset, disabled controls, header/footer partial lock

**Interfaces:**
- Consumes: Task 2 `ALL_FORMAT_TEMPLATES`/`getFormatTemplate`; Task 3 `resolveScriptEditorSettings`, repo lock helpers.
- Produces: chip states `🔒 <name>` (locked) / `<name>`-or-`Custom` (custom); `applyTemplate(id, {lock:true})` sets `formatTemplateId`; `applyTemplate(id,{lock:false})` and `unlock()` write `getFormatTemplate(id).settings` (or current template's) into custom settings and clear `formatTemplateId`; selecting `stagistic-default` resets.

- [x] **Step 1: Write failing browser tests** — (a) apply `dg-modern` with lock on → Page format controls disabled, banner shows, resolved font/indents match template; (b) Unlock → same values now editable and `formatTemplateId` cleared; (c) applying a template as copy then editing one field leaves chip reading `Custom`; (d) locked header/footer disables a template-forced page-number cell but leaves a free cell editable.
- [x] **Step 2: Run and watch them fail.** `moon run app-routes:test-browser -- template`
- [x] **Step 3: Build** the picker chip (as the Format group `headerAccessory`), the apply-confirmation dialog (sample page + Changes list + Lock toggle default on), the lock banner with `Change…`/`Unlock`, and the disabled wiring. Unlock shows a short confirm.
- [x] **Step 4: Run tests.** Expected PASS.
- [x] **Step 5: Commit** — `feat(settings): apply, lock and unlock format templates`

---

### Task 6: Export — Export type rename, Page flow additions, lock inheritance

**Files:**
- Modify: `packages/app-routes/src/routes/script/export/ExportControlPanel.tsx` (label `Template`→`Export type`), `TemplatePicker.tsx` (`ariaLabel`)
- Modify: `packages/export/src/model/config.ts` (`PageBreakValue` gains `actOnNewPage`, `repeatCharacterOnBreak`, `continuationMark: 'none'|'contd'|'cont'`; defaults)
- Modify: `packages/app-routes/src/routes/script/export/modules/PageBreakModule.tsx` (new controls; continuation mark select, `none` default) and the Basic template panel
- Modify: the export data hook to read the selected state's `formatTemplateId` and, when locked, preset + disable the template-owned Page-flow fields with the lock banner
- Test: export browser tests for the new controls and lock inheritance

**Interfaces:**
- Consumes: Task 2 `getFormatTemplate(id).pdfFlow`; selected-state `formatTemplateId`.
- Produces: `PageBreakValue` with the three new fields; locked state presets `actOnNewPage`/`sceneOnNewPage`/`repeatCharacterOnBreak`/`continuationMark` from `pdfFlow` and disables them; `sceneOnOddPage` stays editable.

- [x] **Step 1: Write failing tests** — label reads `Export type`; continuation-mark select defaults to `none`; when the selected state is locked to `dg-traditional`, act-on-new-page and continuation-mark are read-only and match `pdfFlow`.
- [x] **Step 2: Run and watch them fail.** `moon run app-routes:test-browser -- export`
- [x] **Step 3: Implement** the rename, config fields + defaults, the Page-flow controls, and the lock inheritance using the shared `FormatLockBanner`.
- [x] **Step 4: Run tests.** Expected PASS.
- [x] **Step 5: Commit** — `feat(export): rename to Export type and add template-driven page flow`

---

### Task 7: New-script dialog template picker

**Files:**
- Modify: the new-script creation dialog/flow (locate via `createScript` usage in `packages/app-routes`/`packages/app-core`) to add a template select + `Lock to template` toggle (default on), default `stagistic-default`
- Modify: the create path to set `formatTemplateId` when locked, or write the template's settings as a copy when not
- Test: browser test for create-with-template

**Interfaces:**
- Consumes: Task 2 templates; Task 3 lock helpers / `applyTemplate` semantics.
- Produces: a newly created script opens already locked to the chosen template (when the toggle is on) or with its values copied (when off); default leaves `stagistic-default`.

- [x] **Step 1: Write the failing test** — create a script with `dg-musical` + lock on → the new script's resolved settings match the template and `formatTemplateId === 'dg-musical'`.
- [x] **Step 2: Run and watch it fail.** `moon run app-routes:test-browser -- newScript`
- [x] **Step 3: Implement** the picker, toggle, and create wiring.
- [x] **Step 4: Run tests + full checks.** `moon run root:typecheck`, `moon run root:lint`, relevant `test`/`test-browser`.
- [ ] **Step 5: Commit** — `feat(scripts): choose a format template when creating a script`

---

## Notes for the executor

- Local-first flush: new settings columns ride the existing block-settings write path; confirm a locked/unlock change flushes to PGlite FS like other settings (see the `syncToFs` precedent) so it survives refresh.
- Reuse existing settings form primitives for disabled/a11y states; do not hand-roll new ones.
- Keep each migration hand-written and re-run `moon run db:db-compile-migrations` after schema edits.
