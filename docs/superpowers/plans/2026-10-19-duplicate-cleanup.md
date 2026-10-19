# Existing duplication cleanup

**Goal:** Review all 29 current jscpd matches and remove shared implementation without changing behavior, before resuming process integration.

**Constraints:** Keep current thresholds and scan scope. Do not accept unexplained baseline entries, commit, or stage changes. Preserve existing work on hooks/configuration. Reuse existing regression tests; add coverage where a new shared boundary has meaningful edge cases.

## Work

- [x] App shells: shared boot sequence, PGlite initialization, Vite configuration; preserve platform dependencies.
- [x] Marketing editor pages and sync spike adapters: extract reusable presentation/protocol behavior where appropriate.
- [x] App core: share reactive singleton record subscription, loading/error state, and save callback for editor/title page settings.
- [x] App routes: share music item construction across document/live structure adapters.
- [x] Editor/script: share tag indexing, suggestion overlay computation/listeners, and common styles.
- [x] UI: share attribute manager list/modal styles, character controls, sidebar states and form-control styles.
- [x] Run unchanged scan settings again; inspect any remaining/new matches. Record any deliberate exception individually.
- [x] Verify typecheck, lint/format and affected tests; update graphify.

## Review focus

- Settings subscriptions must preserve confirmed data, failed mutation errors, null-script handling and save behavior.
- Music adapters must preserve catalog precedence, numbering, scene/act labels and unassigned ordering.
- Shared CSS must preserve selector specificity, cascade order, focus/disabled/drag behavior and spacing differences.
- Platform boot/config extraction must retain cancellation, worker options, cloud configuration and desktop hooks.
- Suggestions/indexing must preserve identity resolution, position calculations and event cleanup.

## Verification

Initial scan: `moon run root:duplicates` — 29 matches, 0.7% duplication. Baseline currently accepts all 29; this is an inventory, not a reviewed exception list.

## Disposition of all 29 matches

| Original matches | Shared implementation | Count |
| --- | --- | ---: |
| Desktop/web startup | `app-routes/bootstrap/useAppBootstrap` | 1 |
| Desktop/web worker startup | `db/pglite/createWorkerDb` and asset loading helpers | 1 |
| Desktop/web Vite config | `@stagistic/vite-config` | 1 |
| Marketing editor landing heroes | `EditorLandingHero.astro`; reusable reveal script | 1 |
| Node/Deno spike metrics routes | `metricsRequest.ts` | 1 |
| Editor/title-page record hooks | `collections/useReactiveRecord` | 1 |
| Live/document music item mapping | `buildMusicItems`, with separate location adapters | 1 |
| Suggestion item CSS | `SuggestionOverlay.module.css` | 1 |
| Music suggestion keyboard handling | `suggestionKeyboardNavigation.ts` | 1 |
| Character/music RAF scheduling | `useAnimationFrameUpdate` | 1 |
| Empty-enter/music bubble icons | `BubbleMenuIcon.module.css` | 1 |
| JSON/ProseMirror tag indexing | `indexCharacterTags` | 1 |
| Character/list/place panel CSS | `attributeManagerWorkspace.module.css`, retaining local differences | 9 |
| Attribute/script settings modal chrome | `dialogs/shared/workspaceModal.module.css` | 1 |
| Three character color controls | Existing color picker hook assembles shared control props | 2 |
| Character/group name forms | `AttributeNameForm` | 1 |
| Sidebar button states | Combined selectors within `EditorSidebar.module.css` | 1 |
| Table/shared input control and table drag states | CSS composition and combined selectors | 2 |
| Select/voice menu items | `forms/shared/menuItem.module.css` | 1 |
| **Total** | **No ignored matches or intentional exceptions** | **29** |

Final scan: **0 clones**, with unchanged scan paths, formats, thresholds and exclusions. Removed all obsolete baseline fingerprints; baseline is empty. No new process-flow integration was added during cleanup; earlier hook/configuration work remains in the working tree.

## Verification results

- Whole repository typecheck passes; compiled migrations verified (28).
- Whole repository JavaScript lint passes: 0 warnings/errors.
- Both `root:duplicates` and `root:duplicates-changed` pass with the empty baseline.
- Changed JavaScript/TypeScript formatting passes. ESLint does not configure Astro formatting; marketing's own typecheck/build verifies its files.
- App core: 75 Node tests and 12 browser tests pass, including confirmed record updates, store switching, missing script and error precedence.
- Music item adapters: 4 tests pass, including parity for missing labels, catalog overrides and ordering. Attribute-manager Node tests: 6 pass.
- Editor/script: 452 Node tests and 22 focused editor browser tests pass.
- UI: 71 focused browser tests pass after final CSS fixes; typecheck, JS lint and changed CSS lint pass.
- Web and desktop UI builds pass. Marketing build/typecheck pass. Vite config and sync spike typechecks pass.
- DB: 173/173 tests pass with `moon run db:test -- --maxWorkers=2`; default worker concurrency had one 5-second timeout. Four new asset-loading tests cover HTTP failures and invalid WASM.
- Affected app-routes browser tests: 26/26 pass (attribute manager, settings, bootstrap); bootstrap lifecycle coverage includes cancellation.
- Production worker smoke: two browser tabs synchronize, persist and survive closing the leader tab (1/1 e2e pass).
- Independent read-only review found no Critical/Important issues, including CSS specificity/composition, bootstrap cancellation and suggestion cleanup.
- `graphify update .` completed (AST only); `git diff --check` passes.

Existing unrelated failures remain: whole-repository stylelint reports 856 errors and 53 warnings in the unchanged `docs/designs/home-script-cards/styles.css`; root format-check reports 35 errors in unchanged `docs/designs/home-script-cards/preview.js` plus 2 in ignored generated `apps/docs/.astro/content-assets.mjs`. The full UI browser suite has the previously documented `AppLayout` preview-copy mismatch (234/235 pass). These files/assertions were not changed.

Full app-routes browser suite: 178/179 pass; unchanged `ScriptCommentsSidebar.browser.test.tsx:629` uses an accessible-name locator matching both the editor marker and collapsed group button (`3 comments`). Comment implementation/tests are unchanged. Assertions and viewport were not altered; this separate test issue remains recorded for follow-up.

No staging or commits were performed.
