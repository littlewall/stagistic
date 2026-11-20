# Block templates and export corrections implementation plan

> Follow-up applied: score pages are no longer reduced or given a dedicated numbering band; numbers share the script footer position relative to paper edges. Basic/Simple offers Scenes contents only, with music variants restricted to Integrated score; old Basic configs are normalized during plan derivation. Blank pages is labelled “Blank pages after last initial page”. Tests for the revised behavior replace the old assumptions below.


> **For agentic workers:** Use superpowers:executing-plans inline. Never stage or commit; user manages branch rewrite.

**Goal:** Templates apply/lock block styles only; consistent grouped spacing and independently correct export numbering/assembly.
**Architecture:** Keep the template pointer and Typing overrides. Preserve independent page settings, including legacy live template values. Share adjacency policy between editor and transcript. Use one final assembly for score references and output.
**Tech Stack:** TypeScript, React, Tiptap/ProseMirror, jsPDF, pdf-lib, Vite+ via moon.
**Spec:** User decision 2026-10-29 accepting [audit](../../research/2026-10-29-template-export-audit.md): templates affect block styles only; group every type except act/scene; fix audited independent export defects.

## Global constraints
- Page size/margins, global typography, headers/footers and PDF flow remain user-owned across apply/reset/unlock.
- Typing remains user-owned; per-block Reset block settings still resets both style and Typing.
- Existing locked documents/drafts/packages retain formerly resolved page values via a legacy adapter; new applications store independent values explicitly.
- Consecutive same-type blocks share before/after spacing, excluding act and scene. Explicit blank paragraphs retain line height. Music boundaries end a group. Distinct types keep additive spacing (no unapproved margin collapse).
- No stored ScriptDocument shape changes or schema-version bump.

## Review focus
- Old locked settings with no materialized page data must not revert on first page edit, unlock, draft or import.
- Odd-page scenes include the first scene of an act and keep its act heading together.
- Missing PDFs, multi-page PDFs and inserted blanks must count toward final physical parity.
- Filtered exports preserving pagination retain original scene/music identifiers and page references.
- Imported landscape scores retain all original artwork; numbering must be visible without deleting a footer band.

## Tasks

### Task 1: Restrict template scope and preserve existing values
Files: script templates/settings; settings draft; page/header panels; export controls; picker summary/navigation; existing script/route/DB tests.
Interfaces: applyFormatTemplate returns existing selection shape; materializeLegacyTemplateSettings(id, override) upgrades only old page-less locked payloads; resolveScriptEditorSettings preserves user pages and locks only block styles.
- [x] Add regression tests for apply/copy/reset/lock and independent page edits, plus legacy preservation; run and observe failures.
- [x] Narrow definitions and resolver; remove page/export locks and misleading picker copy; place page items outside template group.
- [x] Run script tests and route browser tests; adjust obsolete tests to approved block-only behavior; verify DB persistence/draft path.

### Task 2: Shared adjacent-block spacing
Files: script shared helper/tests; editor spacing extension/CSS/browser tests; transcript preparation/tests.
Interface: resolveBlockSpacingGroups(nodes: readonly ScriptNode[]) returns per-block {before, after} flags; same-type contiguous runs except act/scene, music boundaries split runs.
- [x] Add unit, editor DOM and transcript tests for all types, mixed runs, blanks, music boundaries, edits and pagination splits; observe failures.
- [x] Add shared policy and editor decorations; apply flags to transcript spacing; consume missing after-spacing CSS for all types.
- [x] Verify script/editor/export tests and browser geometry.

### Task 3: Scene breaks and stable contents identifiers
Files: deriveBasicExportPlan.ts, deriveContentsPlan.ts, structureMarks.ts and tests.
Interfaces: deriveContentsPlan optionally receives sourceDoc for stable IDs while emitting only visible entries; forced scene break targets preceding act heading when it belongs to the first scene.
- [x] Add failing tests for first scenes, odd/new page combinations, filtered music identifiers and new-act page marks.
- [x] Derive contents from the numbering document and filter entries afterward; fix scene-break planning and page mark selection.
- [x] Run export tests.

### Task 4: Final assembly and visible numbering
Files: planIntegratedAssembly.ts, transcript contents-page labels/headerFooter, drawPdf.ts (extract drawing helpers), visualLine types and tests.
Interfaces: assembly uses steps.length for parity and explicit odd-start boundaries; contents references the actual visible book label; integrated sequence works independently of footer tokens. Imported score pages get a dedicated number band without erasing artwork.
- [x] Add failing parity matrix, contents/header agreement and real PDF tests with no footer, landscape scores, multiple scores and missing scores.
- [x] Count every output page exactly once; enforce odd boundaries after insertion; share final numbers with contents and PDF drawing. Separate book labels from integrated sequence.
- [x] Verify export node suite and render a representative generated PDF for visual inspection.

### Task 5: Verification and documentation
- [x] Update design, research decision and TODO; self-review the final implementation against audit witnesses.
- [x] Run root typecheck/lint/format-check, node tests and affected browser suites sequentially. Fix failures; no assertion weakening.
- [x] Run graphify update . and git diff --check; record final results and remaining limitations. Leave all changes uncommitted.

## Implementation review notes

- Reused normalized block-style equality for Default/Custom and picker change summaries; independent page values and Typing do not create a style delta. Picker preview retains the current page geometry and renders each block’s line height.
- The legacy adapter preserves formerly live page profiles without DB/schema changes; the first-page-edit browser test proves that editing the page cannot discard legacy typography or PDF flow.
- Corrected old assembly expectations that explicitly called page 4 “odd”; new tests assert actual 1-based parity and all source ownership. Audit matrix JSON remains historical evidence, not a claim of post-fix correctness.
- Real PDF checks found and fixed empty-Contents embedding and rotated CropBox handling. Imported artwork is scaled uniformly above a dedicated number band on the same physical paper dimensions. This preserves printed artwork, not interactive score annotations.
- Final self-review added regressions for custom footer collision, split paragraphs, long compound Contents labels and music ending in a hidden note. They pass; default parallel test timeouts are recorded in TODO and the ledger.

## Final verification

- Root node suite: 1289 tests / 257 files (`moon run root:test -- --maxWorkers=2`).
- Root typecheck, lint (0 errors/warnings, no new clones), format-check and diff whitespace check pass.
- Export: 219 tests; Script: 216; App routes node: 75.
- App routes browser: 191; Editor browser: 302 with `--no-file-parallelism`.
- Graph updated: 10085 nodes / 24005 edges; optional SQL parser still unavailable, unchanged from baseline.
- Final PDF proof `/tmp/stagistic-integrated-numbering-final.pdf` rendered and inspected after the final score-artwork implementation. Diagnostic source removed.
- No commits or staging; all work remains on rewrite for user review.
