# Modal Focus Implementation Plan

**Goal:** Predictable initial and return focus for native dialogs, with cross-browser regressions.
**Spec:** `docs/superpowers/specs/2026-10-26-modal-focus-design.md` (approved audit points 3 and 4).
**Architecture:** UI focus target types and helpers serve `ModalDialog`; wrappers forward restore options and supply semantic initial targets. Application controllers carry stable trigger elements.
**Tech stack:** React, native dialog, React Aria controls, Vite+ browser tests, moon.

## Constraints

- Work in the supplied `drafts` checkout. Never commit or stage.
- Preserve the root focus-visibility signal, document schema, native top layer and existing menu keyboard behavior.
- Use moon for checks. Keep source files below 300 lines. Update graphify after code changes.
- Browser suites run one at a time. Do not change snapshots or viewports to hide unrelated failures.

## Tasks

- [x] Add primitive regressions: explicit trigger differs from active element, missing trigger falls back, nested modal returns to parent, single close/unmount restore, hidden/disabled tab stops, initial field selection. Observe red, then implement focus target helpers and `ModalDialog` lifecycle.
- [x] Migrate form opening timers and default targets; forward return options through modal wrappers. Keep initial selection and pending behavior.
- [x] Wire stable return targets through global modals, header/card menus, settings and local editor/attribute-manager modal controls. Add application integration regressions.
- [x] Verify Chromium and WebKit focus/ring flows; run affected suites, typecheck, lint, format, related node tests and duplication checks. Review, update graphify, leave a suggested commit.

## Review focus

- A menu item disappears before the modal effect runs; restore its stable trigger.
- A trigger disappears or becomes disabled during a mutation; restore a live fallback.
- Closing a child dialog retains the parent top layer and restores within it.
- Closing/unmounting must not refocus twice or steal focus from a new route/dialog.
- Inputs arriving or changing while a dialog is open must not repeatedly steal focus.

## Result

Dialogs now accept explicit return/fallback and initial-focus targets. Forms focus their field, confirmations the safe action, and settings the active navigation item. Opening timers were removed. Persistent header, card, sidebar and parent-dialog triggers are carried through application controllers; editor requests clear stale sidebar targets.

Attribute and script-state managers use the same native dialog primitive. React Aria menus, tooltips and color pickers portal inside their owning dialog. Nested Escape closes only the child; Tab stays within the current dialog. Closing restores once and preserves focus already owned by another dialog. A missing, hidden or disabled trigger falls back to a live parent, editor or main region.

Review findings fixed: overlays outside the native top layer, missing music-sidebar trigger propagation, and Chromium blurring a generic fallback container when its temporary tabindex was removed immediately. Each behavioral regression was observed failing before its fix.

## Verification — 2026-10-26

Browser commands used `--no-file-parallelism` and ran one suite at a time.

| Check | Result |
| --- | --- |
| `moon run ui:test-browser -- --no-file-parallelism` | Chromium: 295 tests, 48 files passed |
| `moon run app-routes:test-browser -- --no-file-parallelism` | Chromium: 180 tests, 48 files passed |
| `moon run web:test-browser -- --no-file-parallelism` | Chromium: 8 tests, 4 files passed |
| UI dialog and focus suites | WebKit: 136 tests, 21 files passed |
| Global/home, attribute manager and music integration suites | WebKit: 53 tests, 7 files passed |
| `moon run root:typecheck` | Passed |
| `moon run root:lint` | Passed, including styles and duplication: 0 clones |
| `moon run root:format-check -- <changed TS/TSX files>` | Passed |
| `moon run root:test-related -- <changed TS/TSX files>` | 232 tests, 32 files passed |
| `git diff --check HEAD` | Passed |
| `graphify update .` | Passed; AST graph updated |

WebKit runs temporarily selected `instances: [{browser: 'webkit'}]`; both browser configs were restored afterward. UI filters covered `src/dialogs/{modal,script,settings,attribute-manager}` and both layout focus suites. Application filters covered global modal actions, HomeRoute, ScriptListSection, ScriptAttributeManagerModal, AttributeManagerMusicAttachments, ScriptMusicSidebar and useMusicModalsState.

Initial parallel full runs hit timing failures in the unchanged Input contrast and comments Escape tests. Both passed individually and in the full serial runs; their assertions and viewports were preserved. New focus-retention tests explicitly establish focus before exercising metadata changes or owner teardown, since WebKit does not focus plain HTML buttons/checkboxes on pointer click. Menu restoration is polled because React Aria restores it asynchronously.

## Suggested commit

`fix(ui): make modal focus targets explicit`

Use explicit initial and return focus throughout dialogs and their application triggers. Keep nested dialogs and React Aria overlays in the native top layer, with Chromium/WebKit regression coverage.

No commit or staging operation was performed by the agent. Review the changes and commit manually.
