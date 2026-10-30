# Script format templates — progress

Plan: [docs/superpowers/plans/2026-10-27-script-format-templates.md](docs/superpowers/plans/2026-10-27-script-format-templates.md)
Execution: inline (native), commit after each task (user commits).

## Picker follow-up — 2026-10-29
- [x] Audit page rules against primary template standards: mandatory, optional and unsupported
- [x] Trace page flow/parity, logical and physical numbering, lists and Integrated score combinations
- [x] Audit consecutive-block spacing in editor, measurement and PDF
- [x] Record verified findings, combination checks and recommended template scope
  - Audit: docs/research/2026-10-29-template-export-audit.md; results JSON and reproducible diagnostic sources alongside it.
  - 288 export combinations, 35 isolated assembly cases, filtered-reference probes and live editor spacing measurements.
  - Existing export suite: 156 passed; diagnosed correctness bugs remain unfixed and are not covered by that green baseline.
  - Recommendation: block-style-only templates; independent page/reference policy and shared group-spacing rules. Scope decision and implementation remain next steps.
- [x] Keep inline export strip background without a border; match Continuation mark label typography and disabled opacity to switches (visually verified; lint/typecheck and 8 browser tests passed)
- [x] Simplify locked export Page breaks: inline template row and compact continuation select; visually verify
  - Quiet lock/name/Edit row replaces the export frame; the 26px select sizes to its content.
  - Verified at 332px sidebar width with Musical, longest template name and Custom.
  - Checks: app-routes browser 190, UI browser 298 (sequential), app-routes/UI
    node tests 74/75; root typecheck/lint/format-check; graph updated.
- [x] Template tabs: 5px title/description gap, description line-height 1.5, inline name suffix “(current)”; lint and 7 browser tests passed
  - Active tab indicator spans the full item height, including vertical padding.
- [x] Increase template tab vertical padding from 8px to 12px; lint and 7 picker browser tests passed
- [x] Space select separator; show Reset block settings only for changed styles or Typing and reset both for the current block
  - Select divider is separate from its next option, with a gap below the line.
  - Reset eligibility compares effective values, including default-equivalent overrides.
  - Verified: script node 198, app-routes node 74, UI node 75;
    app-routes browser 190 and UI browser 298 (sequential UI run avoids the
    known Input placeholder contrast timing failure); root typecheck/lint/format-check.
  - Split long template browser scenario into independent flows; graph updated.
- [x] Center shared toast contents and align block section spacing; visually verify
  - Shared ToastProvider: center marker/content/close for one- and multiline toasts.
  - Block settings: 28px between groups, 12px heading/content gap, flush numeric grids.
  - Verified visually; UI browser 298, app-routes browser 188, UI node 75,
    root typecheck/lint/format-check. Input placeholder contrast test failed
    once (4.449 vs 4.5), then passed alone and in the full UI rerun unchanged.
- [x] Use section-sized Format/Typing headings below the unchanged block title
- [x] Derive Stagistic Default/Custom from current format values; hide Reset at default
  - Manual restoration also restores the default label and picker Current marker.
  - Verified: script node tests (191), app-routes node tests (74) and browser
    tests (188), root typecheck/lint/format-check; graph refreshed.
- [x] Toast after successful template application (visible above Script settings; no success toast on failure)
- [x] Keep template name and Current on one line (20rem sidebar; longest name visually checked)
- [x] Fix editor replacement and stale overlay callbacks; regression tests
- [x] Run checks and update graph

Verified: root typecheck, lint, format-check and node tests (1190); editor (294),
app-routes (188) and ui (298) browser tests; ui node tests repeated after toast
portal changes (75). Graph updated; SQL extraction remains unavailable because
the optional tree_sitter_sql dependency is missing. No commits made.

## Task 1 — Persist spacingAfter + sceneNumberFormat
- [x] Failing persistence test (spacingAfterEm + sceneNumberFormat round-trip)
- [x] Add columns `spacing_after_millis`, `scene_number_format` + migration
- [x] Map in `buildConfigRows` + `hydrateBlockSettings` + query row type
- [x] Tests green
- [x] Prepare commit

## Task 2 — Format template definitions
- [x] Failing templates test (ids, default identity, dg-modern indent, cont. mark, format-only keys)
- [x] Author `FormatTemplate` type + 6 definitions
- [x] Tests green
- [x] Prepare commit

## Task 3 — Lock storage + resolver + snapshot round-trip
- [x] Failing resolver test (locked ignores override; null uses override)
- [x] `resolveScriptEditorSettings`
- [x] `scripts.format_template_id` column + migration + repo helpers
- [x] Package/snapshot round-trip + test
- [x] Tests green
- [x] Prepare commit

## Task 4 — Wrap in parentheses (Stage direction)
- [x] Failing persistence + render tests
- [x] `parenWrap` field + column + codec + CSS pseudo-element
- [x] Set on dg-traditional / dg-musical / samuel-french
- [x] Tests green
- [x] Prepare commit

## Task 5a — Sidebar split + Page format rename
- [x] Failing settingsMenu test (groups, rename, headerAccessory)
- [x] Regroup Script/Format, rename, add `headerAccessory`
- [x] Tests green
- [x] Prepare commit

## Task 5b — Picker, apply/confirm, lock/unlock
- [x] Failing browser tests (lock disables, unlock copies, custom chip, header/footer partial lock)
- [x] Picker chip + ApplyTemplateDialog + FormatLockBanner + disabled wiring
- [x] Tests green
- [x] Prepare commit

## Task 6 — Export: Export type + Page flow + lock inheritance
- [x] Failing tests (rename, cont. mark none default, locked page-flow)
- [x] Rename, config fields, Page-flow controls, lock inheritance
- [x] Tests green
- [x] Prepare commit

## Task 7 — New-script dialog template picker
- [x] Failing create-with-template test
- [x] Picker + Lock toggle + create wiring
- [x] Full checks (typecheck, lint, tests)
- [x] Prepare commit

## 2026-10-29 — Block-only templates and export corrections

Plan: [implementation](docs/superpowers/plans/2026-10-29-block-templates-export-corrections.md). User approved scope; continue inline without commits.

- [x] Restrict apply/lock/reset to block styles, preserve page settings and legacy values.
- [x] Group spacing for every adjacent type except Act/Scene in editor and export.
- [x] Correct first-scene breaks, filtered identifiers and page marks.
- [x] Correct final assembly parity, contents references and independent visible score numbering.
- [x] Verify real PDF geometry/artwork, checks, documentation and graph.

Verified so far: Script 216 node tests; App routes 75 node + 191 browser tests; Editor 302 browser tests (sequential); Export 219 node tests including real PDF sheets with all four rotations, blank sheets and no footer token. Rendered landscape proof retains original bottom-edge copyright and places its integrated number below it. Export tests also cover long compound labels and hidden-note music endings.

Default parallel runs showed DB 5s timeouts and `musicPillInteraction` pointer-activation timeout; reduced worker/sequential runs pass without changing assertions, viewport or timeout limits. Final results below.

Final verification: `moon run root:test -- --maxWorkers=2` **1289/1289**, root typecheck/lint/format-check all pass; export **219/219**; app-routes browser **191/191**; editor browser sequential **302/302**. `graphify update .` succeeded (10085 nodes / 24005 edges; unchanged optional SQL parser warning). `git diff --check` clean. No DB schema/document schema changes in this correction; no commits or staging.

Final PDF proof: `/tmp/stagistic-integrated-numbering-final.pdf`, generated by a temporary diagnostic test then removed from the source tree. Landscape score and extracted text visually verified: Contents score 5 / next scene 7, numbers printed, original copyright preserved. Rendering imports preserves printed page content; interactive annotations are outside the artwork embedding path.

## Export follow-up — 2026-10-29

- [ ] Put score page numbers at the same position as script numbers; preserve score artwork at full size.
- [ ] Restrict Basic/Simple contents to Scenes; keep music variants available for Integrated score, including old config values.
- [ ] Rename Blank pages to Blank pages after last initial page.
- [ ] Run export and affected browser tests, static checks, graph update.
