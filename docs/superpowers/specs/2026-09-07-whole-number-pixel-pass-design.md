# Whole-number pixel pass — design

**Date:** 2026-09-07
**Status:** approved design, not yet planned
**Predecessor:** `2026-09-01-route-composition-and-css-elimination-design.md` (phase 1, complete)
**Successor:** phase 2, the UnoCSS migration (§11 of the predecessor)

## 1. Problem

Two problems, one root.

**Every dimension the app renders is a decimal.** `--space-md` is 8.64px,
`--font-size-sm` is 12.96px, `--menu-item-min-height` is 34.56px. None of these were
designed; they are all the product of one constant:

```css
/* packages/ui/styles/tokens.css:14 */
--size-scale: 1.08;
```

Thirty-six tokens are defined as `calc(<whole px> * var(--size-scale))`, and another 194
hand-written `calc(Npx * var(--size-scale))` expressions repeat the pattern in component
CSS.

The constant was introduced for the editor: a user-facing text-zoom control that had to
keep the canvas faithful to A4/Letter proportions while the text grew. It leaked out of
the editor into the whole design system, and the zoom feature it existed for was later
dropped. What remains is a coefficient with no meaning, applied to everything.

Two facts confirm it is vestigial:

- `.size-sm` / `.size-md` / `.size-lg` (1 / 1.1 / 1.2) exist in `base.css` and **nothing
  in the repo applies them**. A comment in `AccountMenu.tsx:44` already records this.
- Ten browser tests set `--size-scale: 1` on their host element purely so their
  assertions can be whole numbers.

The base ladder underneath is, by contrast, almost clean already: space
`2 4 8 12 16 20 24 28 32 40 48`, radius `4 6 8 10 12`. The decimals are not a broken
scale. They are the multiplier, and only the multiplier.

**And the app ignores the reader's own font size.** Browser *page* zoom (`Cmd +`) scales
px along with everything else, so that case is fine today. But a reader who raises the
default font size in their browser — Chrome's Appearance → Font size, the standard remedy
for low vision — changes only the root font size, and px ignores it. Our entire UI,
including `body { font-size: var(--font-size-md) }`, is px. That reader gets nothing.
This is WCAG 1.4.4 (Resize Text). The 40 media-query declarations across the repo — ten
distinct widths in 20 files — are px as well, so the layout does not respond either.

`html` has no `font-size` rule, so the root already *is* the reader's setting; the
mechanism is in place and simply unused. Of the 275 `rem` values in the repo, 239 are in
`apps/landing` — the application proper is px throughout.

Both problems have to be settled before phase 2, because phase 2 turns these tokens into
a UnoCSS theme. A theme built on `calc(8px * 1.08)` inherits the arithmetic permanently,
and a theme built on px inherits the accessibility failure permanently.

## 2. Goals

- No `--size-scale` anywhere; page geometry keeps a coefficient under a name that says
  what it does.
- One whole-number ladder is the single source of truth for every size in the app.
- UI sizes scale with the reader's font-size setting; the printed-page canvas does not.
- All visual change is confined to one step, under one approved normalization row, and
  is verified by measurement rather than by eye.

**Non-goals.** Redesigning the type scale, changing the light/dark token values, moving
to fluid/`clamp()` typography, or touching anything in phase 2's scope.

## 3. Decisions taken

| # | Decision |
|---|---|
| D1 | Accept the 8% shrink. Tokens equal their base values; the UI renders 8% smaller than today. Where something reads as too small afterwards, the fix is to raise that one token by a step — not to reintroduce a multiplier. |
| D2 | The coefficient survives only for **page geometry**, owned by the editor and renamed for what it does. Editor chrome and route CSS lose it entirely and size from tokens like the rest of the app. |
| D3 | Tokens ship as `rem`, computed from the whole-pixel ladder at a 16px root, with the pixel value in a comment. Breakpoints become `em`. Hairlines and canvas geometry stay `px`. |
| D4 | Five steps. All visual change is isolated in step 3; steps 1, 2, 4 are provably zero-change and step 5 carries its own rows. |

## 4. Ownership split

Today `--size-scale` serves two unrelated roles in `packages/editor`:

| Role | Where | After |
| --- | --- | --- |
| Page geometry — page width, `renderScale`, pagination, suggestion-overlay placement | `Editor.tsx:110`, `useResponsiveScale.ts`, `useEditorExtensions.ts:94`, `characterSuggestions/model/overlayPosition.ts` | Keeps the coefficient, renamed `--editor-zoom` / `editorZoom`, default `1` |
| Chrome — toolbar height, status-bar min-height, suggestion overlay widths, block-action icons | `EditorToolbar.module.css`, `EditorStatusBar.module.css`, `CharacterSuggestionsOverlay.module.css`, `MusicSuggestionsOverlay.module.css`, `EditorBlockActionsOverlay.module.css`, `EditorCanvas.module.css`, `HeaderFooterOverlay.module.css` | Loses it; sizes from tokens |

`Editor.tsx:110` currently reads the value off `document.documentElement` with
`getComputedStyle`. That is the leak in code form: the editor reaches into a global the
UI owns. It becomes an explicit input the editor controls.

`MiniScriptEditor.module.css:2` pins `--size-scale: 1` locally; that pin disappears with
the variable.

`base.css` loses `.size-sm` / `.size-md` / `.size-lg`. They are dead, and they are the
one place from which the coefficient could crawl back into the UI.

D3 sharpens this split rather than blurring it: **the UI scales with the reader, the
canvas scales with the zoom.** Those are different needs with different controls.

## 5. The ladder

The whole-number ladder is the source of truth. It ships as `rem`, and because the root
is 16px — a power of two — every value converts exactly, with no rounding anywhere:

| px | rem | | px | rem | | px | rem |
| ---: | --- | --- | ---: | --- | --- | ---: | --- |
| 2 | 0.125 | | 13 | 0.8125 | | 26 | 1.625 |
| 4 | 0.25 | | 14 | 0.875 | | 28 | 1.75 |
| 6 | 0.375 | | 15 | 0.9375 | | 32 | 2 |
| 8 | 0.5 | | 16 | 1 | | 35 | 2.1875 |
| 10 | 0.625 | | 18 | 1.125 | | 36 | 2.25 |
| 11 | 0.6875 | | 20 | 1.25 | | 40 | 2.5 |
| 12 | 0.75 | | 22 | 1.375 | | 48 | 3 |
| | | | 24 | 1.5 | | 256 | 16 |
| | | | | | | 280 | 17.5 |

At the default setting each renders as exactly the whole pixel chosen. At a 20px root
each scales by 20/16.

The families, in pixels:

```
space    2  4  8  12  16  20  24  28  32  40  48
radius   4  6  8  10  12
font     10 11 12 13 15 16 18 22 35
control  24 26 32 40          (heights)
chrome   48 shell, 256 sidebar, 280 menu-max-height, 32 menu-item, 14 chevron,
         24 bubble-menu-button, 15 bubble-menu-icon
```

Space is a 4px grid above `xs`; radius is a 2px grid. Both stand as they are.

`tokens.css` writes the rem value with the pixel in a trailing comment
(`--font-size-xs: 0.6875rem; /* 11px */`), so the ladder stays readable at the one place
it is defined. No component ever writes a `rem` literal; components use tokens.

Three values sit off their grid and are addressed in **step 5**, each as its own
normalization row, never inside the flip:

| Token | Now | Proposed | Why |
| --- | --- | --- | --- |
| `--control-height-sm` | 26 | 28 | 28px is the most common hand-written control height in the repo (15 ad-hoc occurrences, plus the structure sidebar's rows); 26 is used by 5 files and matches nothing. Adopting 28 also retires the recorded Sidebar Row Rule deviation from phase 1. |
| `--font-size-4xl` | 35 | 36 | One consumer. 35 is arbitrary. |
| `--bubble-menu-icon-size` | 15 | 16 | Two consumers, and 16 is already the icon size everywhere else. |

## 6. Units by domain

The unit is not a style preference; each domain has one correct answer.

| Domain | Unit | Why |
| --- | --- | --- |
| font-size, space, radius, control heights, shell/sidebar/menu dimensions | `rem` | Text grows with the reader and its containers grow with it. Growing the text alone is worse than doing nothing — the content clips. |
| Hairline borders and dividers (1px, 2px) | `px` | A scaled hairline is a blurred sub-pixel line. It costs sharpness and buys no legibility. |
| Media-query breakpoints | `em` | In a media query the unit resolves against the root font size. Px breakpoints do not respond to the reader's setting, so a reader with large text gets bigger content in an unchanged column — exactly where layouts break. All ten widths convert exactly: 900px → 56.25em, 1199px → 74.9375em. |
| Editor canvas page geometry | `px` × `--editor-zoom` | A4 is a physical size. If it grew with the root font, the app would silently render a different sheet of paper. The reader's control here is the zoom. |
| `--editor-font-size` (script content) | `px` | Typography measured against the page (the 12pt Courier convention), not UI chrome. It follows the canvas, not the reader's chrome setting. |

This boundary gets a named rule in `DESIGN.md` so px cannot creep back in through the
side door.

## 7. The hand-written `calc()` sweep

194 hand-written `calc(Npx * var(--size-scale))` expressions live outside `tokens.css` —
125 in `packages/ui`, 42 in `packages/editor`, 27 in `packages/app-routes`. After the
flip each becomes a plain value.

Where the number already **is** a token, it becomes the token. Examples found:

- `4 → --space-sm`, `12 → --space-lg`, `16 → --space-xl`, `24 → --space-3xl`
- `ScriptEditorRoute.tsx:44` builds `calc(256px * var(--size-scale))` by hand — that is
  `--sidebar-width`, duplicated.
- `ListRow.module.css`, `IconButton.module.css`, `ToggleButtonGroup.module.css` and
  `ActionCard.module.css` each hand-write a 28px control box.

Tokenising these matters more once the ladder is in `rem`: a token carries the right
unit for its domain, a hand-written number does not.

One cluster has no token: icon sizes `14 / 16 / 18`, with 55 occurrences. Step 5 adds
`--icon-size-sm / md / lg` for them. This is deliberately **not** part of the flip — it
is a new token family, and new families get their own review.

## 8. Verification

**There is no visual safety net today, and this pass must not pretend otherwise.**

The repo contains 63 committed PNGs under `__screenshots__/` directories, and phase 1
treated them as goldens. They are not. Nothing in the repo calls `toMatchScreenshot`,
`toMatchImageSnapshot`, `toMatchFileSnapshot` or `.screenshot(`; `vitest.browser.config.ts`
configures no image comparison. The files are named after test names with a `-1` suffix —
vitest browser mode's `screenshotOnFailure` artifacts — and one of them corresponds to a
test on the known-red list. They were accidentally committed debris from failing runs, and
they assert nothing.

They have been deleted and `**/__screenshots__/` added to `.gitignore` as a prerequisite
to this work, so failing runs stop seeding new debris.

The consequence is that the measurement probe is not a supplement to image baselines. It
is the only verification this pass has, and it is scoped accordingly: it must cover a
representative surface from every family the ladder touches — a dialog, a menu, a list
row, a form control, a sidebar header, a toolbar, the editor canvas — not a token sample.

**Step 3, the flip.** Before and after, a temporary probe dumps `getBoundingClientRect`
and `getComputedStyle` for the probed surfaces, using the technique phase 1 used for
`SidebarPanelSelect`. The expected relation is exact:

```
after == before / 1.08
```

Every measurement that fails it is a candidate regression and is explained by hand before
the step is called done. Values that were already hardcoded whole pixels (borders,
breakpoints) must be unchanged, and are checked for that instead.

**Step 4, the rem conversion.** At a 16px root the conversion is the identity, so the
relation is stricter still — `after == before`, exactly, on every probed measurement. A
single differing value means a conversion error.

The accessibility goal is then proved rather than assumed: the probe runs the same
surfaces at a 16px and a 20px root and asserts that every token-derived dimension grew by
20/16 while hairlines stayed at 1px. A dimension that refuses to grow is a px value that
escaped the sweep.

**Throughout.** The probe must use the settle discipline phase 1 established: double
`requestAnimationFrame`, `await document.fonts.ready`, and a delay long enough for
transitions to finish — applied identically at every measurement point, or webfont swap
and in-flight transitions produce phantom diffs.

The ten browser tests that set `--size-scale: 1` on their host lose that setup line at
step 3: they already assert the unscaled base values, which is exactly what the tokens
become. Any other px assertion that shifts at step 3 shifts by the same ÷1.08 relation and
is updated there, with the probe's outlier list as the evidence. Step 4 touches no
assertion at all, since the test root is the default 16px.

Whether this pass should end by introducing real visual-regression coverage is a separate
question, deliberately left out of scope here.

## 9. Steps

Each step ships independently with typecheck, lint and tests green.

1. **Editor split.** Introduce `--editor-zoom` / `editorZoom` owned by the editor, wired
   through `useResponsiveScale`, pagination and overlay placement, **with its value still
   1.08**. Editor chrome and route CSS keep their `--size-scale` calcs for now. Nothing
   moves: the probe must read identical values before and after. That is the step's own
   test.
2. **Token sweep.** Rewrite hand-written `calc(Npx * var(--size-scale))` to the
   equivalent token wherever a token exists, in all three packages. Still multiplied,
   still 1.08. Nothing moves: the probe must read identical values before and after.
3. **The flip.** Delete `--size-scale` from `tokens.css`; every token becomes a literal
   whole number of pixels. Remaining hand-written calcs become plain px. `--editor-zoom`
   defaults to 1. Delete `.size-sm/.size-md/.size-lg`. Drop the `--size-scale: 1` lines
   from the ten browser tests. Run the probe before and after and explain every outlier.
   **All visual change lives here, under one approved normalization row.**
4. **Units.** Convert the ladder in `tokens.css` to `rem` with pixel comments; convert
   the 40 breakpoint declarations to `em`; leave hairlines and canvas geometry in px. Add the
   `DESIGN.md` rule naming the boundary. The probe must read identical values before and
   after at a 16px root; then run the 16px/20px root check.
5. **Ladder tidy.** `--control-height-sm 26 → 28`, `--font-size-4xl 35 → 36`,
   `--bubble-menu-icon-size 15 → 16`, and the new `--icon-size-sm/md/lg` family with the
   55 icon sites converted. Each carries its own normalization row.

## 10. Success criteria

- `grep -ri 'size-scale\|sizeScale' packages apps` returns nothing at all; the name is
  retired along with the concept.
- Every size token in `tokens.css` is a `rem` value drawn from the whole-number ladder,
  with its pixel value in a comment, and no `calc()` remains in the file.
- `--editor-zoom` is read only by page geometry — canvas width, `renderScale`,
  pagination, overlay placement — and by nothing else.
- No hand-written `calc(Npx * <any scale>)` survives in component CSS, and no component
  writes a bare `rem` literal.
- At a 20px root, every token-derived dimension on the probed surfaces has grown by
  20/16, and hairlines have not.
- Typecheck, lint, node and browser suites green, save for the reds already recorded in
  the phase-1 close-out.
- The probe reads identical values before and after steps 1, 2 and 4, and exactly
  `before / 1.08` after step 3; every outlier is explained in writing.
- No `__screenshots__` directory is tracked by git.

## 11. Follow-on

This clears the way for phase 2. The UnoCSS theme maps `spacing.md` to `var(--space-md)`
and gets `0.5rem` — a value that is both a whole number in the ladder and responsive to
the reader.

Two items recorded in the phase-1 close-out remain open and are **not** part of this
pass, though step 5 is a natural place to schedule them:

- The hardcoded mono stack on `IndentRangeSlider.module.css:131`.
- The root-cause fix for the UA `dialog { color: CanvasText }` break.

## 12. Notes

Per `AGENTS.md`, this document is written but not committed. Commit is the maintainer's.
