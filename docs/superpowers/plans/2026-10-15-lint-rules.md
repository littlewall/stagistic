# Selected lint rules implementation plan

**Goal:** Enable the user's selected Ultracite-inspired correctness, complexity,
React Compiler and non-null assertion rules in the existing oxlint pipeline.

**Architecture:** Keep the existing moon commands and post-edit hook. Add explicit
rules to `packages/linters/src/oxlint.ts`; repair findings without weakening rules
or changing tests to hide bugs. No Ultracite dependency or formatter change.

**Scope:** Groups 1 and 2 from the conversation, plus React Compiler rules and
`typescript/no-non-null-assertion`. Complexity limit: 20. Inline type imports.
No commits: the user reviews and commits.

- [x] Enable selected rules and capture diagnostics by rule and package.
- [x] Apply safe automatic fixes, then review the diff.
- [x] Repair independent package findings in parallel, preserving behavior.
- [x] Run moon lint, format-check, typecheck and relevant tests; repair regressions.
- [x] Verify the post-edit hook uses the configuration and update graphify.

Baseline: clean `cloud-sync` branch at `1a0add50`; root lint reports 7 existing
errors in inline.ts, platform.ts, readContainer.test.ts and createScriptNode.ts.

Review focus: hook dependencies and closures; render-time refs; effect-driven
state resets; sort/reverse mutation semantics; absent values previously asserted
with `!`; accessibility of existing pointer interactions.

## Completed implementation

Rules are enforced as errors by the existing oxlint configuration, including
complexity 20, shadowing, import cycles/duplicates, strict equality, selected
accessibility rules, React Compiler checks and non-null assertions. Existing
formatter conventions and commands are retained.

Production fixes preserve subscription cleanup, form resets and editor refresh
triggers. Narrow, documented `oxlint-disable-next-line` comments remain for
external DOM measurements/invalidation the compiler cannot infer. These are
oxlint directives so the formatter's ESLint configuration does not reject
unknown React rule names.

`requireValue` replaces unchecked assertions where absence violates an invariant;
its tests cover null, undefined and valid falsy values. Expected absence uses
guards. Array sorting/reversing uses non-mutating methods; TypeScript libraries
now include ES2023 while emitted syntax still targets ES2022. The editor's live
selector uses `use-sync-external-store/with-selector` with an explicit dependency.

## Verification, 2026-10-19

- `moon run root:lint-js-fix`: **0 warnings, 0 errors**, 228 rules, 1538 files.
- `moon run root:format-check -- <changed JS/TS files>`: passed, including the
  extracted surface-color hook.
- `moon run root:typecheck`: passed for the whole graph.
- `moon run db:db-compile-migrations`: completed; 28 compiled migrations verified.
- Post-edit hook: a temporary non-null assertion was rejected with exit 2 and
  `typescript/no-non-null-assertion`; replacing it with a guard passed with exit 0.
  The temporary file was removed.
- `moon run collab:test -- --maxWorkers=1`: **20/20** passed.
- `moon run app-core:test-browser`: **9/9** passed.
- Editor surface reuse and selector browser tests: **9/9** passed after the final
  helper extraction.
- Earlier package validation: UI node **76/76**, editor node **279/279**,
  app-routes node **71/71**, app-routes browser **175/175** plus **2/2** new loader
  reset/cancellation tests. Shared tests **32/32** passed.
- Independent read-only review found no actionable regressions in the production
  refactors. `graphify update .` completed successfully.

### Existing failures and environmental limits

- `moon run root:lint` passes JavaScript lint, then fails stylelint with **856
  errors and 53 warnings**. No CSS/SCSS files or stylelint configuration changed.
- The default `root:test` run also collects cloud Playwright e2e tests and causes
  widespread 5-second PGlite timeouts under full concurrency. No test timeout,
  runner configuration, assertion, snapshot or viewport was loosened.
- Node validation with `moon run root:test -- --maxWorkers=2
  --exclude=apps/web/e2e/cloud/**`: **1171 passed, 5 failed**. Four failures are
  marketing markup/copy expectations in unchanged assertions/templates; the
  marketing test's only edit adds a null guard around structured-data parsing.
  The fifth is the live cloud-sync test timing out under combined load; the
  complete collab suite passes independently (20/20).
- UI browser: **234/235** passed. The remaining AppLayout preview-copy expectation
  also fails with the original implementation.
- Editor focused browser: **84/88** passed. A detached original-HEAD checkout and
  the working tree each reproduce the same four failures in the paired focused
  run (**27 passed, 4 failed**): two metadata-retry timeouts, disconnected page
  measurement `null` versus `7`, and scene numbering `'1.'` versus `'1'`. Those
  production paths and assertions are unchanged. Temporary checkout removed.

## Review and commit

No commit created. Previously staged changes remain staged; final formatting,
directive fixes, this report and the extracted surface hook need reviewing with
the staged work before committing.

Suggested message: `chore(lint): enable stricter correctness and React Compiler rules`
