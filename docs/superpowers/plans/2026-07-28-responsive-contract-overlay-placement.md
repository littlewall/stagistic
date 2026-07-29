# Responsive Contract and Overlay Placement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Stagistic’s alpha editor predictable from 1024 CSS px upward, keep 900–1023 px usable on a best-effort basis, and prevent anchored menus from being clipped by the viewport.

**Architecture:** Preserve the existing desktop-first visual system. Document one product-level viewport contract, retain component-specific breakpoints where content width requires them, and extend the shared anchored-menu hook so all current select menus use the same vertical collision logic.

**Tech Stack:** React 19, TypeScript, CSS Modules, CSS anchor positioning, Vite Plus browser tests.

## Global Constraints

- Supported alpha desktop viewport: 1024 CSS px and wider.
- Best-effort viewport: 900–1023 CSS px.
- Viewports below 900 CSS px are not a supported alpha layout and do not receive a mobile UX redesign.
- Editor sidebars become mutually exclusive overlay drawers below 1200 CSS px.
- Preserve routes, component APIs outside the affected anchored-menu hook, accessibility semantics, theme behavior, and persistent-state keys.
- Do not commit; the user reviews and commits.

---

### Task 1: Shared anchored-menu collision behavior

**Files:**
- Create: `packages/ui/src/molecules/forms/anchoredMenuPlacement.ts`
- Create: `packages/ui/src/molecules/forms/anchoredMenuPlacement.test.ts`
- Modify: `packages/ui/src/molecules/forms/useAnchoredMenuHeight.ts`
- Modify: `packages/ui/src/molecules/forms/Select.tsx`
- Modify: `packages/ui/src/molecules/forms/Select.module.css`
- Modify: `packages/ui/src/index.ts`
- Modify: `packages/editor/src/editor/components/toolbar/BlockTypeSelect.tsx`
- Modify: `packages/editor/src/editor/components/EditorToolbar.module.css`
- Modify: `packages/app-routes/src/routes/script/editor/sidebar/SidebarPanelSelect.tsx`
- Modify: `packages/app-routes/src/routes/script/editor/sidebar/SidebarPanelSelect.module.css`
- Modify: `packages/editor/src/editor/components/toolbar/SelectViewportHeight.browser.test.tsx`

**Interfaces:**
- Produces: `resolveAnchoredMenuPlacement(args): {placement: 'above' | 'below', maxHeight: number}`.
- Produces: `useAnchoredMenuPlacement({anchorRef, menuRef, isOpen, viewportMargin?}): {placement, style}`.
- Consumes: trigger and rendered menu DOM refs.

- [ ] **Step 1: Write failing unit tests**

Cover a menu that fits below, one that must flip above, and one constrained to the larger available side.

- [ ] **Step 2: Run the unit test and confirm RED**

Run: `pnpm --filter @stagistic/ui test -- anchoredMenuPlacement.test.ts`

Expected: FAIL because the placement module does not exist.

- [ ] **Step 3: Write a failing browser assertion**

Extend the existing near-bottom select fixture to assert that the rendered listbox ends at or above the trigger’s top edge and remains inside the viewport.

- [ ] **Step 4: Run the browser test and confirm RED**

Run: `pnpm --filter @stagistic/editor test:browser -- SelectViewportHeight.browser.test.tsx`

Expected: FAIL because the current shared hook only shrinks the menu below its trigger.

- [ ] **Step 5: Implement shared placement**

Measure the trigger, rendered menu, and viewport. Prefer below; flip above only when the menu does not fit below and above has more room. Expose max height through `--anchored-menu-max-height`.

- [ ] **Step 6: Apply the shared placement**

Update Select, block-type select, and sidebar-panel select to provide menu refs and select above/below CSS geometry. For the right sidebar selector, align from the right edge and cap menu width to the viewport.

- [ ] **Step 7: Run focused tests and confirm GREEN**

Run the unit and browser commands from steps 2 and 4.

---

### Task 2: Desktop responsive contract

**Files:**
- Modify: `DESIGN.md`
- Modify: `packages/ui/styles/tokens.css`
- Modify: `packages/editor/src/editor/Editor.module.css`
- Modify: `packages/app-routes/src/routes/script/editor/sidebar/useSidebarLayout.ts`
- Modify: `packages/ui/src/dialogs/ScriptSettingsModal.module.css`
- Modify: `packages/app-routes/src/routes/script/ScriptExportRoute.module.css`
- Modify: `packages/app-routes/src/routes/script/export/ExportControlPanel.module.css`

**Interfaces:**
- Consumes: the agreed 1024/900 product contract.
- Produces: documented supported, best-effort, and component-specific breakpoint behavior.

- [ ] **Step 1: Update the documented contract**

Add a responsive-layout section to `DESIGN.md`: 1024 px minimum support, 900–1023 px best effort, under 900 px unsupported for alpha, and component breakpoints based on content constraints.

- [ ] **Step 2: Remove misleading media-query custom properties**

Remove the unused `--media-tablet` and `--media-mobile` values, since custom properties cannot be consumed by `@media` rules.

- [ ] **Step 3: Align editor sidebar behavior**

Change both the CSS drawer threshold and the JavaScript mutual-exclusion media query from 1100 px to 1199 px, making 1200 px the first wide layout.

- [ ] **Step 4: Improve compact settings and export**

At compact desktop widths, reduce settings navigation and content padding without changing its information architecture. Make the export control panel fluid down to 300 px and preserve useful preview width.

- [ ] **Step 5: Run static verification**

Run:

```sh
pnpm --filter @stagistic/ui typecheck
pnpm --filter @stagistic/editor typecheck
pnpm --filter @stagistic/app-routes typecheck
npx eslint DESIGN.md packages/ui/styles/tokens.css packages/editor/src/editor/Editor.module.css packages/app-routes/src/routes/script/editor/sidebar/useSidebarLayout.ts packages/ui/src/dialogs/ScriptSettingsModal.module.css packages/app-routes/src/routes/script/ScriptExportRoute.module.css packages/app-routes/src/routes/script/export/ExportControlPanel.module.css
npx stylelint "packages/**/*.{css,scss}"
```

Expected: all changed-code checks pass. If the repository’s pnpm wrapper is blocked by ignored build scripts, use the equivalent local binaries and record that limitation.

---

### Task 3: Final regression verification

**Files:**
- No production files.

**Interfaces:**
- Consumes: Tasks 1 and 2.
- Produces: verified diff ready for user review.

- [ ] **Step 1: Run affected test suites**

Run the focused UI unit test and editor browser test, then package typechecks.

- [ ] **Step 2: Inspect the final diff**

Confirm no route, persistence key, mobile UX, unrelated visual token, or existing user change was altered.

- [ ] **Step 3: Update the code graph if available**

Run `graphify update .` only when the repository contains the graphify CLI and `graphify-out/graph.json`.

- [ ] **Step 4: Prepare handoff**

Summarize the responsive contract, overlay collision behavior, verification evidence, and any pre-existing failures. Do not commit.
