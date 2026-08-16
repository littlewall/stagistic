# Editor Shell v0 Production Implementation Plan

> **For Codex:** Execute this plan in the current `rewrite` worktree. Do not commit; prepare the changes for user review.

**Goal:** Bring the production editor shell in line with `docs/design/v0-2026-08-14/editor-shell.html`, while retaining the existing editor status footer per the user's explicit direction.

**Architecture:** The editor body becomes a three-column shell at desktop widths: each sidebar owns its integrated header and content, while the center column owns the formatting toolbar and canvas. Below 1200px, open sidebars become full-height overlay drawers above a scrim without reducing the center column. Sidebar toggles remain at the toolbar's outer edges in both open and closed states.

**Tech Stack:** React 19, TypeScript, CSS Modules, Tiptap, Vite Plus browser tests.

---

### Task 1: Lock the responsive shell contract in browser tests

**Files:**
- Modify: `packages/editor/src/editor/editorShellLayout.browser.test.tsx`
- Modify: `packages/editor/src/editor/components/editorShell/EditorShell.tsx`
- Modify: `packages/editor/src/editor/Editor.module.css`

1. Replace the old test fixture with the new integrated sidebar/main-column DOM.
2. Add failing assertions for a docked 256px panel, full-height overlay drawer, scrim stacking, and an unsqueezed canvas below 1200px.
3. Restructure `EditorShell` and CSS until the new layout tests pass.
4. Retain `EditorStatusBar` below the shell body.

### Task 2: Integrate panel navigation and actions into one header row

**Files:**
- Modify: `packages/app-routes/src/routes/script/editor/sidebar/types.ts`
- Modify: `packages/app-routes/src/routes/script/editor/sidebar/useEditorSidebars.tsx`
- Modify: `packages/app-routes/src/routes/script/editor/sidebar/SidebarMiniHeader.tsx`
- Modify: `packages/app-routes/src/routes/script/editor/sidebar/SidebarMiniHeader.module.css`
- Modify: `packages/app-routes/src/routes/script/editor/sidebar/SidebarPanelSelect.module.css`
- Modify: the structure, characters, and music sidebar components and route panel definitions
- Delete after references are removed: `EditorSidebarToolbar.tsx` and its CSS

1. Add tests around panel rendering/navigation where existing coverage permits.
2. Pass the panel selector into the selected panel's mini-header.
3. Make the selector content-hugging, monospaced, uppercase, with the chevron at the end of its actual clickable area.
4. Keep the panel-specific add action and attribute-manager action in the same row.

### Task 3: Move persistent panel toggles to toolbar edges

**Files:**
- Modify: `packages/editor/src/editor/contracts.ts`
- Modify: `packages/editor/src/editor/components/editorShell/EditorShell.tsx`
- Modify: `packages/editor/src/editor/components/EditorToolbar.tsx`
- Modify: `packages/editor/src/editor/components/EditorToolbar.module.css`
- Add: panel-side icon components under `packages/ui/src/icons/` if no suitable icon exists

1. Extend the sidebar toggle contract with its stable panel label.
2. Render left/right toggle buttons at the extreme toolbar edges in both states.
3. Use `aria-pressed` for state and stable tooltip text (`Structure panel`, `Characters panel`, etc.).
4. Keep undo/redo, inline marks, and block selector grouped with dividers as in the approved mockup.

### Task 4: Complete responsive drawer behavior

**Files:**
- Modify: `packages/editor/src/editor/components/editorShell/EditorShell.tsx`
- Modify: `packages/editor/src/editor/Editor.module.css`
- Add/modify browser tests in `packages/editor/src/editor/`

1. Render a dismissible scrim below 1200px whenever a sidebar drawer is open.
2. Close open overlay drawers on editor text input, without affecting docked panels.
3. Verify canvas overlays remain below drawers and reduced-motion behavior remains safe.

### Task 5: Match remaining sizing and toolbar details

**Files:**
- Modify: `packages/ui/styles/tokens.css`
- Modify: `packages/editor/src/editor/buildRootStyle.ts`
- Modify: `packages/editor/src/editor/components/toolbar/BlockTypeSelect.tsx`
- Modify: `packages/editor/src/editor/components/EditorToolbar.module.css`

1. Set the canonical editor panel width to 256px.
2. Show the active block shortcut in the block selector trigger.
3. Align shell background, border, spacing, state, and layer tokens with the mockup.

### Task 6: Verify the complete production result

1. Run focused editor and app-routes tests while iterating.
2. Run `npx tsc -b`.
3. Run ESLint/stylelint on changed files, then relevant browser tests.
4. Run `graphify update .`.
5. Compare the running production editor against the mockup at 1440px and 1200px, including light/dark themes.
6. Report any unrelated repository-wide failures without modifying their expectations.
