# View Switcher + Export View (dummy) — Design

Date: 2026-07-03
Status: Approved for planning

## Goal

Introduce a **view switcher** in the app header so a user can move between
per-script *views*. Today there are two views:

- **Editor** — the existing script editing surface (`/script/:scriptId/editor`).
- **Export** — new, currently a dummy placeholder (`/script/:scriptId/export`).

Views share the same app header (with the switcher). Everything below the
header is each view's own surface; views do not share a layout wrapper — we
compose per-page rather than introducing a shared `ScriptViewLayout`.

## Scope

**In scope**
- View switcher UI in the header center, prominent enough to show the active view.
- New `/script/:scriptId/export` route with a dummy body.
- Header wiring so both Editor and Export render the switcher marking their view.
- Tests: `ViewSwitcher` unit + a browser test for switching.

**Out of scope (but must not be designed against)**
- The Export view will later load the **full** script **read-only** (no edit
  sidebars) and expose **in-state** settings that affect appearance /
  pagination for PDF and other export formats. Nothing there persists to the
  DB — settings live in component state only. The Export route must be a clean
  home for this: self-contained, so swapping the light name-only load for a
  full script load and adding an in-state settings panel later is additive, not
  a rewrite.

## Context (current structure)

- `apps/web/src/App.tsx` holds the `<Routes>`: `/`, `/script/list`,
  `/script/:scriptId/editor`, `/script/:scriptId/settings`.
- `packages/ui/src/layout/AppHeader.tsx` renders a three-column grid:
  `leftControls | scriptControls (center) | rightControls`. The center
  `scriptControls` slot is currently unused.
- `ScriptEditorAppHeader` (UI) composes `AppHeader` with `ScriptMenu` +
  `SyncIndicator` in `leftControls`.
- `packages/app-routes/src/layout/AppHeader.tsx` wraps the UI headers to inject
  navigation.

## Approach

**Chosen: switcher as a UI component placed in the header's `scriptControls`
(center) slot.** Minimal, follows the existing "each route renders its own
header" pattern. No shared layout wrapper (premature for two views;
reconsider at a third view — "compose, don't sprawl").

Rejected:
- Shared `ScriptViewLayout` wrapper — premature abstraction over two views.
- Routing-level tabs outside the header — contradicts the requirement (switcher
  must live in the header center).

## Components

### 1. Routing (`apps/web/src/App.tsx`)
Add `<Route path="/script/:scriptId/export" element={<ScriptExportRoute />} />`.

### 2. `ViewSwitcher` (`packages/ui/src/layout/header/ViewSwitcher.tsx`)
- Segmented control: `[ Editor | Export ]`.
- Controlled: `activeView: ScriptView` + `onSelectView(view: ScriptView)`.
- `ScriptView = 'editor' | 'export'` (shared type in the header module).
- Active segment: prominent background (e.g. `--color-surface-raised` /
  accent); inactive segments muted. Aesthetic: Dark Stage — quiet, precise,
  not a loud toolbar.
- Accessible via react-aria-components (consistent with the rest of the header).
- Sized to sit in the center `scriptControls` slot.

### 3. Header wiring
- UI `ScriptEditorAppHeader` gains props `activeView: ScriptView` and
  `onSelectView(view)`, and renders `<ViewSwitcher>` into the `scriptControls`
  slot.
- app-routes `ScriptEditorAppHeader` wrapper wires `onSelectView` to
  `navigate('/script/:scriptId/' + view)`, deriving `scriptId` from
  `currentScript.id`.
- Editor route passes `activeView="editor"`; Export route `activeView="export"`.

### 4. `ScriptExportRoute` (`packages/app-routes/src/routes/script/ScriptExportRoute.tsx`)
- Light load for now: resolve only the script **name** for the header
  (`ScriptMenu`) plus `recentScripts`, via the existing scripts hook / repo
  lookup by `:scriptId`. No heavy editor controller.
- Renders `AppLayout` with `ScriptEditorAppHeader` (`activeView="export"`, no
  sync indicator) and a dummy body: centered placeholder in Dark Stage style —
  muted "Export" heading, "Coming soon" subtitle.
- Structured so the future full read-only script load + in-state export
  settings panel drop in without restructuring the route.

## Data flow

1. User on Editor (`/script/:id/editor`) sees switcher, `Editor` active.
2. Clicks `Export` → `onSelectView('export')` → `navigate('/script/:id/export')`.
3. `ScriptExportRoute` mounts, loads name, header shows `Export` active.
4. Clicking `Editor` navigates back; editor route re-mounts as today.

The active view is derived from the route (each route declares its own
`activeView`), not from shared state — no global store needed.

## Error handling

- Export route with an unknown `:scriptId`: render the header (switcher +
  account menu) and a neutral empty/placeholder body; do not crash. Follow the
  editor route's existing redirect/guard conventions where applicable.

## Testing

- `ViewSwitcher` unit (`vite-plus/test`): renders both active states; clicking
  a segment fires `onSelectView` with the right value; active segment reflects
  `activeView`.
- Browser test (`*.browser.test.tsx`, via `test:browser`): from the editor,
  clicking `Export` changes the URL to `/script/:id/export` and marks the
  Export segment active; clicking `Editor` returns.

## Non-goals / future

- Full read-only script load in Export.
- In-state export settings (pagination, appearance) affecting PDF/other formats.
- Actual export/PDF generation.

---

## Addendum (2026-07-03): Shared script load across views

**Problem:** Switching Editor → Export → Editor re-mounts the editor route,
which re-runs `useScriptEditorController` → `useScriptLoader` (a DB read of the
document + settings), flashing the full-screen `LoaderOverlay`. Every view will
work with the same script; while inside `/script/:scriptId/*` the script should
load **once**, and any view-specific loading should be a non-blocking overlay
(content stays visible underneath), never a full-screen takeover.

**Approach (chosen): nested layout route.** A parent workspace route owns the
shared load and stays mounted while the active view swaps via `<Outlet/>`.

- **`ScriptWorkspaceRoute`** at `/script/:scriptId` calls
  `useScriptEditorController(scriptId)` (the shared load: document, settings
  override, recent scripts, save handlers, `editorLoadState`, redirects). While
  `editorLoadState.isLoading || !initialValue` it renders the full-screen
  `LoaderOverlay` — this now happens once on entry. Otherwise it provides the
  controller via a new `ScriptWorkspaceContext` and renders `<Outlet/>`.
- **`ScriptWorkspaceContext` / `useScriptWorkspace()`** exposes the
  `ScriptEditorController` value to child views.
- **Editor route** becomes a child: reads the controller from
  `useScriptWorkspace()` instead of calling `useScriptEditorController`; its own
  full-screen loader branch is removed (parent guarantees `initialValue`). All
  editor-specific state (drafts, sidebars, settings modal, header, editor)
  stays.
- **Export route** becomes a child: reads `currentScript` / `recentScripts`
  from `useScriptWorkspace()` (drops its own `useScripts` / `useRecentScripts`).
- **Routing:** parent `/script/:scriptId` with index → redirect to `editor`,
  plus `editor` and `export` children. `/script/:scriptId/settings` stays a
  separate redirect-only route (does not need the workspace load).

**Deliberate boundary for this pass:**
- Only the document/settings load (the full-screen-loader cause) moves up.
- **Characters** (`useScriptEditorCharacters`) stay in the editor for now — that
  load is sidebar-level (`isCharactersLoading`), not a full-screen overlay, and
  Export does not need characters yet. A future pass may lift characters into
  the workspace and introduce a reusable non-blocking `ViewLoaderOverlay`.
- The header keeps rendering per view (fed from the workspace context, so it is
  instant), avoiding hoisting editor-specific header menu actions
  (`getEditorValue`, `.stagistic` export, settings modal) in this pass.

**Data flow after change:** enter `/script/:id/editor` → parent loads once
(full-screen loader) → provides context → editor renders. Switch to Export →
parent stays mounted, Outlet swaps to Export child, which reads the same
context (no load). Back to Editor → editor child re-mounts and reads the
already-loaded context — no full-screen loader.
