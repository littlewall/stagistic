# Finding and reviewing documentation Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans task-by-task. Preserve the shared workspace; do not stage or commit.

**Goal:** Complete the approved overview and six review task guides.

**Architecture:** Markdown under `/editor/review/`, a flat sidebar group, shared keycaps and static icons. No application behavior changes.

**Tech Stack:** Astro, Starlight, Lucode, Markdown, SVG, moon checks.

**Spec:** `docs/proposals/editor-documentation-finding-and-reviewing.md`, approved 12 October 2026.

## Global Constraints

- English user-facing guides; Czech proposal and verification record.
- Literal input in code, platform-specific white keycaps, actual icons for controls without text.
- Trace registered search/comment controls and handlers, rather than inferring behavior from labels alone.
- Keep the human-owned shared browser untouched until a new handoff. Record source verification honestly.
- Preserve unrelated edits and staging. No commits, deployment or schema changes.

## Review Focus

- Search filters affect replacement; Clear search and resetting options have different scope.
- Enter navigates in Find, replaces in Replace with, and adds a line in a comment unless combined with Command/Ctrl.
- Passage anchors and block anchors differ; Detached comments remain accessible through List.
- Resolve preserves a thread; deleting a thread offers its own notification Undo, separate from editor history.
- Undo/redo of script edits is not permanent version history or a guarantee for every metadata operation.

## Task 1: Verify and write

**Files:** `apps/docs/src/content/docs/editor/review/{index,find,replace,comment,threads,comments-view,history}.md` and required SVGs in `apps/docs/public/icons/editor/`.

- [ ] Verify active search, replace, comment composers, navigation/filtering and history handlers.
- [ ] Write six independent guides around Alex's revised line and its editing note.
- [ ] Check conditions, focus-dependent shortcuts and scopes against current source.

## Task 2: Integrate and verify

**Files:** `apps/docs/src/navigation/sections.ts`, `apps/docs/README.md`, relevant cross-links, approved proposal and this record.

- [ ] Add the flat sidebar group and contextual links, update article inventory and icon provenance.
- [ ] Run `moon run docs:lint docs:typecheck docs:build`, validate generated links/fragments/assets, and run scoped `git diff --check`.
- [ ] Request independent content review, resolve findings, and run `graphify update .` after navigation changes.

## Verification record

Pending execution.
