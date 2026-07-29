# Content Standard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Apply one concise English content standard across editor settings, notifications, empty states, and the syntax reference.

**Architecture:** Keep content local to its owning component and document the shared rules in `DESIGN.md`. Change only copy and the narrow syntax table-of-contents presentation; preserve routes, navigation structure, component APIs, and data behavior.

**Tech Stack:** React 19, TypeScript, Astro, CSS Modules, Vite Plus browser tests.

## Global Constraints

- Product UI uses concise English sentence case.
- Uppercase is reserved for script structure where the script’s voice is speaking.
- Empty states explain either the absence or the next useful action without duplicating the same sentence across split panes.
- No localization abstraction is introduced before a real localization layer exists.
- Do not commit; the user reviews and commits.

---

### Task 1: Settings and notification copy

**Files:**
- Modify: `packages/app-routes/src/routes/script/settings/settingsMenu.ts`
- Modify: `packages/ui/src/feedback/ToastProvider.browser.test.tsx`
- Modify: `packages/ui/src/feedback/ToastProvider.tsx`

**Interfaces:**
- Produces: sentence-case settings navigation and English toast close labels.

- [ ] Change the existing toast browser test to look for `Dismiss notification`.
- [ ] Run the toast browser test and confirm it fails against the current copy.
- [ ] Update the production labels.
- [ ] Re-run the toast browser test and confirm it passes.
- [ ] Verify the static settings copy through TypeScript and lint rather than adding a source-text change detector.

### Task 2: Action-oriented character empty states

**Files:**
- Modify: `packages/ui/src/dialogs/AttributeManagerCharactersPanel.browser.test.tsx`
- Modify: `packages/ui/src/dialogs/AttributeManagerCharactersPanel.tsx`

**Interfaces:**
- Produces: a list status describing the empty collection and a distinct detail prompt describing the next action.

- [ ] Add a browser fixture with no characters and assert `No characters yet.` in the list plus `Create a character to edit details here.` in the detail pane.
- [ ] Run the browser test and confirm it fails because both panes currently repeat `No confirmed characters`.
- [ ] Separate list and detail copy, including a specific no-search-results message.
- [ ] Re-run the browser test and confirm it passes.

### Task 3: Narrow syntax navigation and documented rules

**Files:**
- Modify: `apps/landing/src/pages/syntax.astro`
- Modify: `apps/landing/src/pages/syntax.module.css`
- Modify: `DESIGN.md`

**Interfaces:**
- Produces: a semantic `On this page` disclosure below 860px while preserving the existing sticky desktop table of contents.

- [ ] Reuse the existing `toc` data in a `<details>` navigation placed before syntax content.
- [ ] Show the disclosure only below 860px and retain the desktop aside above that width.
- [ ] Add the English, sentence-case, structural-uppercase, and action-oriented empty-state rules to `DESIGN.md`.
- [ ] Run the landing build and changed-code lint checks.

### Task 4: Final verification

**Files:**
- No production files.

**Interfaces:**
- Produces: an uncommitted verified diff for user review.

- [ ] Run the full TypeScript graph, complete node test suite, affected browser tests, ESLint, Stylelint, landing build, and `git diff --check`.
- [ ] Inspect the diff for accidental route, behavior, localization-layer, or unrelated copy changes.
- [ ] Do not run `graphify update .` because this repository has no `graphify-out/graph.json`.
