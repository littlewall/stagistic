# Whole-number pixel pass — execution

**Plan:** `docs/superpowers/plans/2026-09-07-whole-number-pixel-pass.md`
**Spec:** `docs/superpowers/specs/2026-09-07-whole-number-pixel-pass-design.md`

> **Never commit or push.** Each task ends with a prepared message; the maintainer commits.
> Tick each box immediately after that step is done, so work can resume mid-task.

## Task 1 — Measurement probe harness

- [x] 1.1 Confirm screenshot cleanup (0 tracked; deletions already committed by maintainer as `f4f58e38`; gitignore entry present, uncommitted)
- [x] 1.2 Write `packages/ui/src/sizeProbe.browser.test.tsx`
- [x] 1.3 Write `/tmp/probe-extract.py`
- [x] 1.4 Write `/tmp/probe-compare.py`
- [x] 1.5 Capture baseline → `/tmp/probe-baseline.json` (36 tokens, 5 boxes; --space-md reads 8.6399)
- [x] 1.6 Comparator agrees with itself (ratio 1 → 0 outliers)
- [x] 1.7 Checks: tsc, eslint
- [x] 1.8 Commit message prepared

## Task 2 — Editor owns its zoom (value still 1.08, nothing moves)

- [x] 2.1 Capture before payload
- [x] 2.2 `Editor.tsx`: drop the `--size-scale` memo, add `editorZoom` prop (default 1.08)
- [x] 2.3 `cssVars.ts`: emit `--editor-zoom`; wire through `editorStyle`
- [x] 2.4 `overlayPosition.ts`: read `--editor-zoom`
- [x] 2.5 Rename params in `useResponsiveScale.ts` + `useEditorExtensions.ts`
- [x] 2.6 SKIPPED — plan was wrong: that pin exists for `--sidebar-width`, a UI token, so it belongs to Task 4's ten files, not here
- [x] 2.7 Checks: tsc, eslint, editor node + browser suites
- [x] 2.8 Probe proves nothing moved (ratio 1 → 0 outliers)
- [x] 2.9 Commit message prepared

## Task 3 — Hand-written calc → tokens (still 1.08, nothing moves)

- [ ] 3.1 Capture before payload
- [ ] 3.2 Inventory → `/tmp/adhoc-calc.txt` (expect 194)
- [ ] 3.3 Replace every occurrence whose number matches a token (NOT the 28px control boxes)
- [ ] 3.4 `ScriptEditorRoute.tsx:44` → `var(--sidebar-width)`
- [ ] 3.5 Checks: tsc, eslint, stylelint, all three packages node + browser
- [ ] 3.6 Probe proves nothing moved (ratio 1 → 0 outliers)
- [ ] 3.7 Commit message prepared

## Task 4 — THE FLIP (all visual change lives here)

- [ ] 4.1 Capture before payload
- [ ] 4.2 `tokens.css`: 36 definitions → literal px, delete `--size-scale`
- [ ] 4.3 `base.css`: delete `.size-sm/.size-md/.size-lg`; fix the `AccountMenu.tsx:44` comment
- [ ] 4.4 `editorZoom` default → 1; delete `MiniScriptEditor.module.css:2` pin
- [ ] 4.5 Remaining hand-written calcs → plain px
- [ ] 4.6 Drop `--size-scale: 1` setup from the ten browser tests
- [ ] 4.7 Probe at ratio 1.08; explain every outlier in writing
- [ ] 4.8 Checks: tsc, stylelint, eslint, all three packages node + browser
- [ ] 4.9 Confirm `grep -ri 'size-scale|sizeScale'` returns nothing
- [ ] 4.10 Commit message prepared, including the outlier explanations

## Task 5 — Units: rem ladder + em breakpoints

- [ ] 5.1 Capture before payload
- [ ] 5.2 `tokens.css` → rem with px comments (leave `--space-none`, `--space-px`)
- [ ] 5.3 40 breakpoint declarations → em
- [ ] 5.4 Verify px stayed where px is correct (hairlines, canvas, `--editor-font-size`)
- [ ] 5.5 Probe proves identity at 16px root (ratio 1 → 0 outliers)
- [ ] 5.6 Probe at 20px root proves growth (ratio 0.8; only hairlines outlying)
- [ ] 5.7 `DESIGN.md`: The Sizes Scale With The Reader Rule
- [ ] 5.8 Checks: tsc, stylelint, all three packages node + browser
- [ ] 5.9 Commit message prepared

## Task 6 — Ladder tidy + icon-size family

- [ ] 6.1 Capture before payload
- [ ] 6.2 `--control-height-sm` 26→28, `--font-size-4xl` 35→36, `--bubble-menu-icon-size` 15→16
- [ ] 6.3 The four 28px control boxes adopt `--control-height-sm`; update the Sidebar Row Rule paragraph in `DESIGN.md`
- [ ] 6.4 Add `--icon-size-sm/md/lg`; convert the icon sites
- [ ] 6.5 Probe: every outlier must match a row in 6.2/6.3
- [ ] 6.6 Checks: tsc, stylelint, all three packages node + browser
- [ ] 6.7 Commit message prepared

## Task 7 — Retire the probe, close-out

- [ ] 7.1 Delete `packages/ui/src/sizeProbe.browser.test.tsx`
- [ ] 7.2 Suites clean without it
- [ ] 7.3 Verify every success criterion from the spec
- [ ] 7.4 Close-out appended to `docs/design/route-composition-audit-2026-09-01.md`
- [ ] 7.5 Commit message prepared

## Known pre-existing reds — report, never "fix"

- `app-routes` node: `prepareExampleScriptDocument.test.ts > prepares the example source as a two-act musical…`
- `app-routes` browser: `ScriptExportRoute.browser.test.tsx > renders exact-kind character catalog rows only`
- `app-routes` browser, full-dir runs only: `useScriptEditorSettingsDraft.browser.test.tsx > retains toggle and formatting changes…`
- `ui` browser, timing flake: `useSaveIndicator.browser.test.tsx > shows slow saving and a full success confirmation…`
- **found 2026-09-07, editor browser** (verified pre-existing by patch round-trip against a clean tree):
  - `paginationGolden.browser.test.tsx > produces stable multi-page boundaries for a heading + long-dialogue document`
  - `BlockActionMenu.browser.test.tsx > supports keyboard submenu navigation and restores trigger focus`
