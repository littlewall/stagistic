# Quiet Act Row Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove the act icon, align act titles with scene numbers, and restore the quiet delete control.

**Architecture:** Keep act behavior unchanged. Modify only the act-row markup and its local CSS module, with browser coverage in the existing act-row test.

**Tech Stack:** React 19, TypeScript, CSS Modules, Vite Plus browser tests

## Global Constraints

- Preserve delete accessibility and keyboard behavior.
- Do not change scene-row markup or drag behavior.
- Do not commit; leave the work ready for user review.

---

### Task 1: Quiet and aligned act row

**Files:**
- Modify: `packages/app-routes/src/routes/script/editor/structure/StructureRowAct.browser.test.tsx`
- Modify: `packages/app-routes/src/routes/script/editor/structure/StructureRowAct.tsx`
- Modify: `packages/app-routes/src/routes/script/editor/structure/ScriptStructureSidebar.module.css`

**Interfaces:**
- Consumes: existing `StructureRowActStatic` props and `onDelete(blockId)` callback.
- Produces: unchanged public props and behavior.

- [ ] **Step 1: Add a failing browser test**

Render `StructureRowActStatic`, set `--size-scale: 1`, and assert that the row contains no SVG, the delete button has transparent background and border colors, and the title input starts 14 pixels from the row edge.

- [ ] **Step 2: Verify RED**

Run: `pnpm --filter @stagistic/app-routes exec vp test run -c vitest.browser.config.ts src/routes/script/editor/structure/StructureRowAct.browser.test.tsx`

Expected: FAIL because the icon is present, the shared danger variant supplies a colored border, and the title starts beyond the scene-number axis.

- [ ] **Step 3: Implement the approved markup and CSS**

Remove `ActBlockIcon`, restore the native delete `<button type="button">`, make `.actRow` a single-column grid, delete `.actIconWrapper`, and set `.actTitle` left padding to `calc(14px * var(--size-scale))`.

- [ ] **Step 4: Verify GREEN and regression coverage**

Run the focused browser test, full app-routes browser suite, app-routes typecheck, and `pnpm lint`.

- [ ] **Step 5: Refresh graph and hand off**

Run `graphify update .`, inspect `git diff --check`, and leave all changes uncommitted.
