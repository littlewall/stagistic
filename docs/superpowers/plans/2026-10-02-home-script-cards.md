# Homepage script cards implementation plan

> **For agentic workers:** Use superpowers:subagent-driven-development to implement these tasks. Do not commit; the user reviews and commits.

**Goal:** Implement the approved two-column homepage cards, reading saved script metadata only.

**Architecture:** The editor supplies its measured page count when saving. The repository persists page count and act/scene counts atomically with the document. Cards consume ScriptSummary metadata without loading or paginating documents.

**Tech Stack:** React, TypeScript, shared UI Button, PGlite/Drizzle, moon.

**Spec:** User-approved D card in docs/designs/home-script-cards, with the latest constraints below.

## Global constraints

- Only script cards on HP change; preserve all earlier authorized changes.
- Header: title, subtitle, pages, subtle brand yellow background, neutral border.
- Body: proportional act/scene bars; no-act documents still have a bar without an Act label.
- Footer: shared Button “Go to editor” left; last edit time right. Whole card opens editor. Preserve script action menu functionality.
- Two cards per row; one on narrow screens. No characters, musical numbers, left icon or arrow.
- Store metadata on save. No homepage document reads or pagination. No document schema version bump.
- No commits or staging. Run migration compilation after schema changes.

## Review focus

- New/imported/legacy documents: honest unknown pages until measured, correct scene counts.
- Scene insertion/removal/reorder, empty acts and scenes before first act: saved distribution stays correct.
- Autosave, manual save and immediate structural saves use the same document/page snapshot.
- Long titles and many acts remain readable without overflow in light/dark themes.
- Card navigation, keyboard and rename/duplicate/delete never trigger each other accidentally.

## Task 1: Stored summary metadata

- [ ] Add ScriptSummaryMetadata to @stagistic/script: pageCount: number | null, sceneCount: number, actSceneCounts: number[], unassignedSceneCount: number.
- [ ] Add buildScriptSummaryMetadata(document, pageCount = null), covering no acts, zero scenes, empty acts, pre-act scenes and normal two-act documents.
- [ ] Add nullable scripts.summary_metadata JSONB and optional ScriptSummary.summaryMetadata.
- [ ] Extend saveLatest(scriptId, document, metadata?) and persist metadata within the document transaction. Missing metadata derives structure and invalidates page count when content changes; unchanged saves preserve measured pages. Include metadata in list/single/reactive summary reads.
- [ ] Add saveSummaryMetadata(scriptId, expectedDocument, metadata), validating the stored document transactionally and preserving updatedAt. Invalidate measured pages on layout settings changes.
- [ ] Keep creation/import/duplication consistent and generate/compile migrations. Verify metadata survives reopen and concurrent saves.

## Task 2: Card UI

- [ ] Build shared ScriptCard with the approved header/body/footer, existing Button and ScriptActionsMenu, stretched whole-card action and neutral border.
- [ ] Replace only ScriptListSection with a two-column responsive grid consuming saved metadata. Delete obsolete row appearance CSS only.
- [ ] Update meaningful browser coverage for whole-card/button navigation, independent actions and missing/zero/normal metadata.

## Task 3: Editor save metadata

- [ ] Extend editor save callback contract with optional ScriptSummaryMetadata.
- [ ] Flush measured pagination before reading the save snapshot; build metadata for that snapshot and forward through both workspace save handlers.
- [ ] Refresh measured metadata after initial/clean settings layout without treating opening as an edit. Dedupe layout snapshots and skip dirty content.
- [ ] Verify autosave/manual/immediate behavior and forwarding to repository.

## Task 4: Verification

- [ ] Run scoped node/browser tests, root typecheck and changed-file lint/format checks via moon.
- [ ] Inspect the actual homepage in Synara; verify two columns, no-act bar and no overflow.
- [ ] Run graphify update . and review the complete new diff. Leave uncommitted.
