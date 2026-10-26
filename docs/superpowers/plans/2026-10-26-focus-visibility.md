# Focus Visibility Implementation Plan

**Goal:** Show product focus indicators only after actual keyboard navigation.
**Architecture:** `FocusVisibilityManager` owns the document modality attribute; product CSS consumes it exclusively.
**Tech stack:** React, React Aria Components, CSS modules, Stylelint, Vite+ browser tests, moon.
**Spec:** `docs/superpowers/specs/2026-10-26-focus-visibility-design.md` (approved audit points 1 and 2).

## Constraints

- Work on the supplied `drafts` checkout. Do not commit or stage changes.
- Preserve focus restoration, tab order, ring tokens and text-entry affordances.
- Run repository checks through moon; update graphify after code changes.

## Review focus

- Consumed Tab and text-cursor navigation must not arm later programmatic focus.
- Pointer-opened menus and dialogs must stay ring-free after activation/Escape.
- Real and virtual keyboard navigation must reveal indicators.
- Wrapped inputs and parent-level indicators must still show rings after Tab.
- Capture listeners, mutation observation and root attributes must clean up on unmount.

## Tasks

1. Add browser regressions for pointer/text/programmatic transfers, consumed Tab, keyboard navigation and actual menu/dialog flows. Observe failures against the old tracker/CSS.
2. Replace React Aria visibility tracking with capture listeners that confirm a navigation key through focus movement; include virtual focus and cleanup.
3. Migrate product selectors, conditional action reveals and existing focus style tests to the shared signal. Keep native focus resets unconditional.
4. Add and exercise Stylelint selector guards with marketing/docs exceptions.
5. Run browser suites, relevant node tests, typecheck, formatting, lint and duplicate checks. Review the diff and update graphify. Leave a suggested commit message for user review.

## Completion record

- Implemented all five tasks; changes remain uncommitted on `drafts`.
- Review found route-level tracker ownership would lose keyboard modality and omit the first-run notice. Moved ownership above gates/routes; route-replacement and real preview-dialog regressions cover the fix.
- Added coverage for deferred submenu focus, virtual focus, editor-consumed Tab, one-control dialog traps, custom tab stops, native/RAC controls, cleanup and real editor gutter menus.
- Chromium UI: 271 passing; routes: 175 passing; web: 8 passing; real editor regressions: 2 passing; related node tests: 236 passing; linter package: 25 passing. Focus scenarios also pass in WebKit 26.5 (38 UI and 2 real editor scenarios).
- One repeated routes run had hover/action timeouts in `BlankPagesModule` and `ScriptCommentsSidebar`; the subsequent complete run passed all 175 tests without changing those tests or production code.
- Root typecheck, lint, formatting and duplication checks pass. Graphify updated.
- Existing editor failure: `musicPillInteraction.browser.test.tsx` → `uses manual popover mode so the activation gesture cannot light-dismiss it`; reproduced with the original CSS and tracker. No unrelated production changes made.
- Suggested commit: `fix(ui): unify keyboard focus visibility`.
