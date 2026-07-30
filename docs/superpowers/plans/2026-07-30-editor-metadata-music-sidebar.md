# Editor Metadata, Music-Out, and Sidebar Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use
> superpowers:subagent-driven-development (recommended) or
> superpowers:executing-plans to implement this plan task-by-task. Steps use
> checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add editor browser metadata and contextual titles, reject structural
music-out drop targets, and make sidebar exclusivity begin below 1470 px.

**Architecture:** Keep static browser identity in the web app, own contextual
titles in the route that has the required data, enforce music targets in the
existing pure predicate, and separate sidebar exclusivity from overlay layout
with two media queries.

**Tech Stack:** React 19, React Router, TypeScript, CSS Modules, Vite Plus

## Global Constraints

- Do not modify or discard unrelated worktree changes.
- Do not commit.
- Reuse the landing favicon assets and `#3d2a1d` theme color exactly.
- Use `context — Stagistic Editor`; export uses
  `Export · <script title> — Stagistic Editor`.
- Reject both `act` and `scene` as music-out targets.
- Keep the existing 1199 px overlay breakpoint.
- Allow both sidebars only at 1470 px and wider.

---

### Task 1: Browser metadata and contextual titles

**Files:**

- Create: `apps/web/src/documentMetadata.test.ts`
- Create: `packages/app-routes/src/documentTitle.ts`
- Create: `packages/app-routes/src/documentTitle.test.ts`
- Create: `packages/app-routes/src/useDocumentTitle.ts`
- Create: `packages/app-routes/src/useDocumentTitle.browser.test.tsx`
- Modify: `apps/web/index.html`
- Modify: `packages/app-routes/src/routes/home/HomeRoute.tsx`
- Modify: `packages/app-routes/src/routes/script/ScriptEditorRoute.tsx`
- Modify: `packages/app-routes/src/routes/script/ScriptExportRoute.tsx`
- Copy: `apps/landing/public/favicon*` and `apple-touch-icon.png` to
  `apps/web/public/`

**Interfaces:**

- Produces: `formatDocumentTitle(context?: string): string`.
- Produces: `useDocumentTitle(context?: string): void`, committed through a
  layout effect before the browser paints the next route.

- [ ] Write tests that expect the complete favicon metadata, literal title
  strings, live title updates, and cleanup restoration.
- [ ] Run focused tests and confirm they fail because the metadata and helpers
  do not exist.
- [ ] Implement the formatter and effect hook, call it from the three routes,
  copy the assets, and update `index.html`.
- [ ] Run the focused tests and confirm they pass.

### Task 2: Structural music-out targets

**Files:**

- Modify: `packages/editor/src/editor/components/musicRange/musicRangeModel.test.ts`
- Modify: `packages/editor/src/editor/components/musicRange/musicRangeModel.ts`

**Interfaces:**

- Consumes and preserves:
  `canDropMusicOutAtBoundary(snapshot, musicId, targetBlockId): boolean`.

- [ ] Add a table-driven regression test expecting `false` for literal `act`
  and `scene` targets that otherwise satisfy scene/order constraints.
- [ ] Run the focused test and confirm it fails on the current predicate.
- [ ] Add the minimal structural-target guard.
- [ ] Run the focused test and confirm it passes.

### Task 3: Three-tier sidebar behavior

**Files:**

- Create:
  `packages/app-routes/src/routes/script/editor/sidebar/sidebarViewport.ts`
- Create:
  `packages/app-routes/src/routes/script/editor/sidebar/sidebarViewport.test.ts`
- Modify:
  `packages/app-routes/src/routes/script/editor/sidebar/useSidebarLayout.ts`

**Interfaces:**

- Produces:
  `getSidebarViewportMode(width): {isExclusive: boolean, isOverlay: boolean}`.
- Keeps overlay placement at `max-width: 1199px`.
- Uses `max-width: 1469px` for open-state exclusivity.

- [ ] Add literal boundary tests for widths 1199, 1200, 1469, and 1470.
- [ ] Run the focused test and confirm it fails because the viewport model does
  not exist.
- [ ] Implement the viewport model and use separate media-query subscriptions
  for exclusivity and overlay state.
- [ ] Run the focused test and package browser tests.

### Task 4: Verification and graph update

**Files:**

- Update: `graphify-out/`

- [ ] Run focused unit and browser tests.
- [ ] Run `pnpm --filter @stagistic/editor typecheck`,
  `pnpm --filter @stagistic/app-routes typecheck`, and
  `pnpm --filter @stagistic/web typecheck`.
- [ ] Run lint for changed source files using the canonical ESLint command.
- [ ] Validate favicon dimensions and SVG/ICO file types.
- [ ] Run `graphify update .`.
- [ ] Review `git diff` and prepare a commit message for the user.
