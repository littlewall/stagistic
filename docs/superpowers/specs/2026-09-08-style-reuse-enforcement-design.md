# Style reuse enforcement — design

**Date:** 2026-09-08
**Status:** approved design, not yet planned
**Predecessors:** `2026-09-01-route-composition-and-css-elimination-design.md` (phase 1),
`2026-09-07-whole-number-pixel-pass-design.md` (the ladder)
**Replaces:** §11 of the phase-1 spec, "Phase 2 readiness (UnoCSS)"

## 1. Problem

Phase 1 removed the duplicated CSS. The pixel pass made the ladder whole-numbered, `rem`-based
and readable. Neither of them stopped the thing that produced the duplication in the first place:
**nothing in the toolchain objects when a new value is invented.**

`stylelint.config.js` extends `@dvdevcz/stylelint`, which brings the csstree validator, the
stylistic plugin and order rules. None of them look at whether a length came from the ladder.
Today `padding: 13px` or `color: #3a3a3a` in a new module passes every check. The token system is
held up by review, and review is the thing that forgets.

Measured against the ladder, the erosion is already visible. Of the declarations in `packages/ui`
and `packages/app-routes` that should carry a spacing, radius or font-size token, **704 do and 36
do not**. Of those 36:

- **19** resolve exactly to a value the ladder already carries. Seven of those are the
  hairline-overlap idiom (`bottom: -1px`, `margin: -1px`) — legitimate, but unnamed, and `1px` is
  `--space-px`. The other twelve are plain re-invention: `ToggleButtonGroup.module.css:3` writes
  `gap: 4px` next to a `--space-sm` that is 4px, and ships it.
- **17** contain a value the ladder does not carry at all: `5px` (7×), `6px` (6×), `3px` (4×),
  `7px`, `14px`.

There are, encouragingly, **zero raw hex colours** anywhere in the two packages.

## 2. Why not UnoCSS

§11 of the phase-1 spec planned UnoCSS for this. That plan is retired, for three reasons.

**It does not solve the stated problem.** `p-[13px]`, `gap-[6px]` and `text-[#3a3a3a]` are one
keystroke each and read as idiomatic. Utilities make *writing* styles cheaper; they do not make
*inventing values* harder, and inside JSX an invented value is less visible in review than a
declaration in a stylesheet. UnoCSS can be configured to reject arbitrary values — at which point
the mechanism doing the work is an enforcement rule, and the build tool is overhead.

**It contradicts four rules the design system already stands on.** The className Is Position Only
Rule says in as many words that "utility class precedence is decided by the stylesheet, not by the
attribute, so repainting through `className` is non-deterministic". The Declared Surface Rule, The
Component Variables Are Scoped Rule and The Variant Before Override Rule together make appearance
an API of variants and declared variables. Utilities are the opposite idiom for appearance.

**The cost is real and the residue permanent.** Introducing it means 1,773 layout declarations
across 94 files, plus a build and test-runner integration (UnoCSS generates CSS by scanning
sources, so the browser test config needs the plugin or geometry assertions silently lie). And
`packages/editor` is excluded by §11, so the repo would carry two styling idioms indefinitely.

What UnoCSS genuinely offers — fewer files, no class naming, terser layout — is authoring
ergonomics. That is a different problem from the one this spec addresses.

## 3. Decisions taken

| # | Decision |
|---|---|
| D1 | No UnoCSS. The goal is preventing re-invention, and enforcement addresses it directly with no new dependency. |
| D2 | Enforce values through stylelint rules already installed. The rule is **"no absolute length units"**, not "no units". |
| D3 | Enforce the route-module justification header, which is a convention nothing tests. |
| D4 | State the reuse discipline in `DESIGN.md` rather than trying to enforce it programmatically. |
| D5 | No declaration-count ratchet. It was considered and dropped: it is the only mechanism here that is not mechanical truth, and the likeliest to become noise. |
| D6 | The stylelint configuration comes in-house. `@dvdevcz/stylelint` is dropped and its config owned under `stagistic`. |
| D7 | The move is separated from any change to it. The extraction must be provably rule-for-rule identical; modernising the inherited rules comes later, as its own decision, against a work list this spec records. |

## 4. Part one — values must come from the ladder

### The rule shape

The obvious configuration — forbid every unit on ladder properties — was tested and produced two
false positives: `clamp(var(--space-sm), 1vw, var(--space-lg))` and
`calc(var(--space-md) - 1px)`. The rule inspects inside functions, which is correct behaviour but
means "no units" is the wrong demand.

The right demand is **no absolute lengths**. `px`, `rem` and `em` are the units the ladder exists
to carry; `%`, `vw`, `vh`, `ch` and `fr` are a different tool with no ladder to violate. Expressed
as an allowed-list, that is:

```js
const RELATIVE = ['%', 'vw', 'vh', 'svh', 'dvh', 'svw', 'dvw', 'ch', 'fr'];

'declaration-property-unit-allowed-list': {
    '/^padding/': RELATIVE,
    '/^margin/': RELATIVE,
    '/gap$/': RELATIVE,
    'font-size': RELATIVE,
    'border-radius': RELATIVE,
    inset: RELATIVE,
},
'color-no-hex': true,
```

Verified empirically against a probe stylesheet. **Passes:**

```css
padding: var(--space-md);                          /* a token */
padding-top: 0;  margin: auto;                     /* unitless */
gap: calc(var(--space-sm) * 2);                    /* dimensionless multiplier */
margin-top: calc(var(--space-px) * -1);            /* hairline offset, named */
inset: calc(var(--space-md) - var(--space-px));
gap: clamp(var(--space-sm), 1vw, var(--space-lg));
max-width: min(100%, var(--sidebar-width));
width: 100%;  padding-inline: 5%;
```

**Fails:**

```css
padding: 5px;  gap: 6px;  border-radius: 3px;  font-size: 13px;
margin-top: -1px;
padding: calc(var(--space-md) + 2px);              /* a raw px inside calc is still invented */
font-size: 1.2rem;  gap: 0.5em;
```

Three properties of the rule matter and were each confirmed by test rather than by reading docs:

- **Colour functions are untouched.** The rule is per-property and colour properties are not
  listed. `rgb()`, `hsla()`, `color-mix()` and `oklch(from var(--base-neutral) .5 calc(c * .8) h)`
  all pass. `color-no-hex` is added to lock in a state that already holds — the packages contain
  no hex at all — rather than to force a migration.
- **Hairlines, focus rings and durations are untouched.** `border-width`, `outline-width`,
  `outline-offset`, `box-shadow` and `transition` are not in the list, so `1px`, `2px` and `150ms`
  are unaffected.
- **`calc()` is inspected.** `calc(var(--x) * 2)` passes and `calc(var(--x) + 2px)` fails. This is
  the desired strictness: the fix is `calc(var(--space-md) + var(--space-xs))`.

### The hairline offset gets a name

Seven declarations write `±1px` to overlap a hairline. Rather than granting `px` an exemption on
offset properties — which would also readmit `margin-top: 12px` — they become
`calc(var(--space-px) * -1)`. `--space-px` already exists and means exactly this. The idiom stops
being an exception and becomes vocabulary.

### The 36 sites, and the ruling they need

This is where enforcement pays for itself, and it is not a pure find-and-replace.

**Nineteen declarations resolve to a token that already exists** — `gap: 4px` → `--space-sm`,
`padding: 24px` → `--space-3xl`, `gap: 2px` → `--space-xs`, and so on. Seven of the nineteen are
the `±1px` offsets described above. Mechanical, no visual change.

**Seventeen declarations contain a value the ladder does not carry:** `5px` (7×), `6px` (6×),
`3px` (4×), `7px` (1×), `14px` (1×). Each needs a ruling, and the honest options are the same
three every time:

1. snap to the nearest ladder step (`7px` → `8px`, `14px` → `12px` or `16px`) — a visual change of
   one or two pixels, covered by a single approved normalization row for the whole set;
2. extend the ladder, if a value turns out to recur for a reason;
3. record a documented exception where the value is genuinely singular.

The implementation plan must present these seventeen as a table for a ruling, not decide them
silently. They are the accumulated re-invention this work exists to surface; deciding them in
passing would waste the only moment when they are all visible at once.

### One config bug to fix while here

`MusicSuggestionsOverlay.module.css` carries a `stylelint-disable-next-line csstree/validator`
because csstree's grammar for `max-height` has not learned the math functions and rejects
`min(320px, 50vh)`. `stylelint.config.js` already has the correct escape hatch for exactly this —
`properties: { width: '| <min()> | <max()> | <clamp()>', … }` — and simply lacks a `max-height`
entry. The disable comment is replaced by that entry.

## 5. Part two — own the stylelint configuration

The rules in part one are configuration, and configuration we do not own is a poor place to put a
design system's guarantees. `@dvdevcz/stylelint` moves in-house.

### What is actually being taken over

The package is one 265-line config object — **128 rules once resolved** — that `extends
stylelint-config-clean-order` and loads two plugins. Dropping it makes four of its transitive
dependencies direct: `@carlosjeurissen/stylelint-csstree-validator`,
`@stylistic/stylelint-plugin`, `stylelint-config-clean-order`, `stylelint-order`. No new software
enters the repo; the same packages are simply named by us rather than by a wrapper. D1's claim of
"no new dependency" refers to the value rules and stays true.

The repo has already begun forking it in practice: `stylelint.config.js` overrides the package's
whole `csstree/validator` block to add `anchor-name`, `position-anchor`, `text-wrap` and an
`ignoreValue` for `oklch(`/`anchor(`. Owning the file makes that override a normal edit instead of
a shadow of an upstream object.

Several conventions worth knowing are already load-bearing here and must survive the move
unchanged: `@stylistic/indentation: 4`, `number-leading-zero: "never"` (this is why the ladder
reads `.875rem` rather than `0.875rem`), `string-quotes: "single"`, `selector-max-class: 3` and
`max-nesting-depth: 4`.

### Shape

**Recommendation: keep it in the repo, not in a workspace package** — `stylelint.config.js` at the
root, split into a small `stylelint/` directory if one file grows unreadable. There is exactly one
consumer today: a single root invocation, `stylelint "**/*.{css,scss}"`, covering all 129 CSS
files including `apps/landing`. A workspace package for one consumer is ceremony, and it is
precisely what The Variant Before Override Rule forbids one paragraph after we wrote it: shared
API is earned by the second call site.

Promoting it to `packages/stylelint-config` later is a file move and a `package.json` entry. If the
intent is to share it with another repository, that changes the answer and the package shape is
correct from the start — this is the maintainer's call, and the plan should take it either way.

### The move must be provably neutral

`stylelint --print-config <file>` resolves the full configuration for a path, and the repo is
currently **clean: 129 files, 0 problems**. That gives two checks, and the first is much stronger
than the second:

1. `--print-config` on a representative file before and after the extraction must produce an
   identical object — rule for rule, option for option, including the resolved `propertyGroups`
   from `stylelint-config-clean-order`. Anything that differs is either an intended addition from
   part one or a mistake.
2. A full run must still report 0 problems across the same 129 files.

**Copy first, prune second.** The extraction commit changes nothing but ownership; any rule we then
decide is wrong for this repo is removed in a separate commit with its own reasoning. Doing both at
once would make the `--print-config` diff meaningless, which is the only real safety net this part
has.

### Two things this surfaces, neither in scope

`@stylistic/stylelint-plugin@2.1.3` prints a deprecation warning for roughly thirty rules on every
run — the `context.fix is being deprecated` noise that currently buries real output. Owning the
config makes replacing or silencing that plugin possible; deciding it is separate work.

The planned move from eslint to **oxlint/oxfmt is independent of this**. Those tools cover
JavaScript and TypeScript; neither lints CSS. Stylelint remains the CSS toolchain regardless of
what happens to eslint, which is a further reason to own its configuration rather than inherit it.

### Modernisation: deferred, but scoped

Bringing the config in-house is the moment to ask which of the 128 rules still earn their place.
Doing it *in* the extraction would destroy the `--print-config` proof, so it is deliberately a
second step — but the work list is recorded here rather than left as an intention, because the
evidence is easiest to gather now.

**The csstree finding is the substantial one, and it is measured.** The `csstree/validator` plugin
resolves **`css-tree@2.3.1`, unpatched**. Stylelint 16.26.1 itself depends on **`css-tree@^3.1.0`
together with `@csstools/css-syntax-patches-for-csstree@^1.0.19`** — a syntax database two major
versions newer and actively patched for shipping CSS. The escape hatches in our config are the
scar tissue: `width`, `padding` and `font-size` each carry a hand-written
`| <min()> | <max()> | <clamp()>` extension, and the whole-number pixel pass had to add a
`stylelint-disable-next-line` for `max-height: min(320px, 50vh)` for the same reason. Those are not
our quirks; they are a two-year-old grammar being asked about modern CSS.

The candidate is therefore to **drop the plugin and lean on stylelint's own built-in value
validation** — `declaration-property-value-no-unknown` and its siblings, which run on the modern
patched grammar. This is a candidate, not a conclusion: the built-in rules and the plugin do not
have identical coverage (the plugin also validates at-rules and their descriptors), so the swap
needs its own before/after comparison over all 129 files. If it holds, one plugin, one dependency
and every escape hatch leave together.

Other items for that pass, in descending confidence:

- Decide `@stylistic/stylelint-plugin`. Stylelint 16 removed stylistic rules from core on the
  argument that a formatter should own them; roughly thirty of ours come from this plugin and every
  one of them is on a deprecated internal API. Note that oxfmt does not cover CSS, so "let the
  formatter do it" has no answer in this repo yet — which is exactly why this needs deciding rather
  than assuming.
- Re-examine the rules the config inherited but this codebase may not need: `selector-max-id: 1`
  and `selector-max-type: 1` in a repo that is entirely CSS Modules, the Sass/Less at-rule
  allowances (`mixin`, `include`, `extend`) in a repo with no preprocessor, and
  `no-unknown-animations` pinned to `severity: "warning"`, which means it cannot fail a build.
- Reconsider `@stylistic/indentation: 4` and `number-leading-zero: "never"` only if something else
  forces the question. They are load-bearing conventions, and churning them would rewrite every
  stylesheet for no gain.

Sequencing, to be explicit: **extract 1:1, add the part-one guards, then modernise.** The
`max-height` escape hatch in §4 is added under that sequence and is expected to be short-lived — if
the plugin goes, it goes with it.

## 6. Part three — the route-module header

The Routes Carry No CSS Rule requires every surviving route module to open with a one-line
justification. Nothing tests it, and the rule additionally requires a `phase-2 Uno` marker that D1
has just made meaningless.

**The marker goes; the justification stays and becomes enforced.** 26 of the 27 route modules carry
the marker line and lose it. The odd one out is
`PageLayoutSettingsPanel.module.css`, which has a justification (`/* Three field columns instead of
the shared flat grid's default of two. */`) and never had a marker — which is itself the argument
for testing the justification rather than the marker.

The check: every `*.module.css` under `packages/app-routes/src` must open with a comment. It joins
the `lint` script, which today is `eslint . && stylelint "**/*.{css,scss}"`, so a missing
justification fails the build instead of the review.

The `DESIGN.md` rule is edited in the same change as the 26 files, so the documentation never
describes a state the code is not in.

## 7. Part four — the reuse discipline, in `DESIGN.md`

Two failure modes have no rule today, and neither is mechanically detectable: a route assembling a
pseudo-component inline rather than reusing one, and a route-specific modification landing inside a
shared component. **These are documented, not enforced** — the judgement is the point, and a linter
that tried to make it would be wrong more often than right.

**Already applied** (this part of the spec records what was done rather than proposing it):

- **The Variant Before Override Rule** was amended rather than duplicated. It already covered the
  ground and merely lacked a threshold and its inverse. It now states that the threshold is two —
  shared API is earned by the second call site, and a variant whose only consumer is one route is a
  route-specific modification wearing a shared component's clothes.
- **The Nameable Is A Component Rule** is new, and is the one addition that earned its place:
  nothing previously objected to a route composing a "card" out of primitives with no CSS of its
  own. It ends by requiring the difference from the catalogue entry to be stated in the module's
  header comment, which ties it to part two.
- **The Reusable Skeleton Rule** gained one sentence resolving what would otherwise read as a
  contradiction: structure may be lifted at a single use because the reason is legibility, while an
  appearance parameter waits for a second caller because the reason is sharing.

`DESIGN.md` went from 488 lines and 33 named rules to 490 and 34. Adding only one rule was
deliberate: the file is already long enough that nobody, human or model, reads it whole, and
amending the rule that owns the ground is the discipline these rules themselves demand.

## 8. Non-goals

- No UnoCSS, and no other new build dependency. Every rule used here is already installed.
- No modernisation of the inherited stylelint rules in this pass: no plugin swap, no decision about
  `@stylistic/stylelint-plugin`, no eslint → oxlint/oxfmt move. §5 records the work list and the
  evidence; acting on it is the next piece of work, not this one.
- No declaration-count ratchet (D5).
- No conversion of layout CSS to anything. The 1,773 layout declarations stay as they are.
- `packages/editor` and `apps/landing` are out of scope for the new rules in this pass; the config
  change is scoped to the packages whose ladder compliance was measured.
- No attempt to enforce part three programmatically.

## 9. Success criteria

- `pnpm lint` fails on a newly written `padding: 13px`, `gap: 6px`, `font-size: 1.2rem` or
  `color: #3a3a3a` in `packages/ui` or `packages/app-routes`.
- `pnpm lint` passes on `var()`, `calc()` with tokens, `clamp()`/`min()`/`max()` with relative
  units, percentages, unitless values, and every colour function in use.
- All 36 offending declarations are resolved: 19 by substitution (seven of them the hairline
  idiom), 17 by an approved ruling recorded as a normalization row.
- The seven `±1px` hairline offsets read `calc(var(--space-px) * -1)`.
- No `.module.css` under `packages/app-routes/src` lacks an opening comment, and `pnpm lint` proves
  it.
- `grep -r 'phase-2 Uno' packages` returns nothing, and `DESIGN.md` no longer asks for the marker.
- The `csstree/validator` disable comment in `MusicSuggestionsOverlay.module.css` is gone, replaced
  by a `max-height` entry in the shared config.
- `@dvdevcz/stylelint` appears nowhere in `package.json` or the lockfile, and its four plugin
  dependencies are named directly.
- `stylelint --print-config` on a representative file differs from today's output only by the rules
  part one adds deliberately.
- The full run still covers 129 CSS files and, once the 36 sites are resolved, reports 0 problems.
- Typecheck, lint and the suites green, save the reds already recorded in the pixel-pass close-out.

## 10. Follow-on, deliberately not in this spec

The maintainer has raised that the project's written guidance is scattered and long —
`DESIGN.md` (490 lines, 34 rules), `AGENTS.md` (55), `PRODUCT.md` (41), `README.md` (1), plus a
`stagistic-general-codestyle` skill outside the repo — and that nothing that size gets read whole.
That is a real problem and a separate one: it is about where guidance lives and what is actually
read, not about style reuse. It gets its own design.

## 11. Notes

Per `AGENTS.md`, this document is written but not committed. Commit is the maintainer's.
