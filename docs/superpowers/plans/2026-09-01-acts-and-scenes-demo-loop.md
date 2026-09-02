# Acts and Scenes Demo Loop Implementation Plan

> **For agentic workers:** Execute inline in this session. The repository rule forbids agents from committing; leave the change ready for maintainer review.

**Goal:** Add a Recordly-ready 7–8.5 second editor capture that shows a live outline gaining a second scene, a second act, and a cross-act scene move.

**Architecture:** Create a separately named, deterministic demo fixture and dev seed route. Its flow drives only real editor controls: `Ctrl+1` converts the prepared boundary block to a scene, the existing Add act button creates `ACT II`, and the existing DnD handle moves the first scene into it. The browser runner remains operator-gated before playback and after its final hold.

**Tech Stack:** TypeScript, React, Playwright, Vite Plus tests, local Stagistic editor.

**Spec:** Approved in-thread storyboard: start with `ACT I` and one populated scene; add the second scene, create `ACT II`, move the original scene under it, then hold.

## Global Constraints

- Keep the existing `editor-blocks` demo unchanged.
- Modify no editor-product behavior; only demo fixtures, the development-only seed route, and the capture runner.
- Use real editor interactions; fixture text may be preloaded, but no DOM mutation may simulate structure changes.
- The content of both scenes is prefilled rather than typewritten.
- Do not commit; the maintainer performs commits.

---

### Task 1: Deterministic outline fixture and development route

**Files:**

- Create: `demos/feature-loops/src/fixtures/actsAndScenesFixture.ts`
- Create: `demos/feature-loops/src/fixtures/actsAndScenesFixture.test.ts`
- Create: `demos/feature-loops/src/demo/runActsAndScenesDemo.ts`
- Create: `demos/feature-loops/src/demo/runActsAndScenesDemo.test.ts`
- Create: `apps/web/src/dev/ActsAndScenesDemoRoute.tsx`
- Modify: `apps/web/src/App.tsx`
- Modify: `demos/feature-loops/package.json`

**Interfaces:**

- Produces `createActsAndScenesDemoDocument()` with stable ids for the first scene, the convertible second-scene boundary, and both scene bodies.
- Produces `seedActsAndScenesDemoScript(repository): Promise<string>` and `runActsAndScenesDemo({seedScript, navigate}): Promise<string>`.
- Exposes `@stagistic/feature-demos/acts-and-scenes-fixture` and `@stagistic/feature-demos/run-acts-and-scenes-demo` to the web dev route.

- [ ] **Step 1: Write the failing fixture tests**

Assert that the seeded document starts with `ACT I`, exactly one `scene` heading, a blank stage-direction boundary with a stable id, and 5–10 populated blocks after each scene boundary. Assert that the seed helper creates `Acts and scenes demo` and focuses the first scene.

- [ ] **Step 2: Run fixture tests to verify RED**

Run: `corepack pnpm --filter @stagistic/feature-demos test -- actsAndScenesFixture.test.ts`

Expected: FAIL because the fixture module does not exist.

- [ ] **Step 3: Implement the smallest deterministic fixture**

Build the flat `ScriptDocument` with literal ids. The second scene's body follows a blank `stageDirection` block: converting that block through the actual editor shortcut makes both its outline row and already-filled body appear together. Reuse the repository shape from `editorBlocksFixture.ts` and no production-editor APIs.

- [ ] **Step 4: Write and run the dev-route tests**

Assert that `runActsAndScenesDemo` waits for seeding, navigates to `/script/<id>/editor`, and returns the id. Add the DEV-only `/dev/demos/acts-and-scenes` route whose loading state and failure state match the existing editor-blocks route.

- [ ] **Step 5: Verify GREEN**

Run: `corepack pnpm --filter @stagistic/feature-demos test -- actsAndScenesFixture.test.ts runActsAndScenesDemo.test.ts`

Expected: PASS.

### Task 2: Real structure interaction flow

**Files:**

- Create: `demos/feature-loops/src/flows/runActsAndScenesFlow.ts`
- Create: `demos/feature-loops/src/flows/runActsAndScenesFlow.test.ts`
- Create: `demos/feature-loops/src/flows/createPlaywrightActsAndScenesDriver.ts`
- Create: `demos/feature-loops/src/flows/createPlaywrightActsAndScenesDriver.test.ts`

**Interfaces:**

- Consumes the stable fixture ids from Task 1.
- Produces `runActsAndScenesFlow(driver)` and `createPlaywrightActsAndScenesDriver(page)`.
- The driver owns `moveToBlock`, `press`, `pause`, `addAct`, `waitForAct`, and `moveFirstSceneToSecondAct`.

- [ ] **Step 1: Write the failing timeline test**

Assert the exact storyboard event sequence:

```ts
[
    ['pause', 600],
    ['moveToBlock', 'acts-demo-second-scene-boundary'],
    ['press', 'Control+1'],
    ['typeText', 'THE CONSERVATORY'],
    ['pause', 700],
    ['addAct'],
    ['waitForAct'],
    ['pause', 500],
    ['moveFirstSceneToSecondAct'],
    ['pause', 2_000],
]
```

- [ ] **Step 2: Run the flow test to verify RED**

Run: `corepack pnpm --filter @stagistic/feature-demos test -- runActsAndScenesFlow.test.ts`

Expected: FAIL because the flow module does not exist.

- [ ] **Step 3: Implement the minimal flow and Playwright driver**

Use the actual `Ctrl+1` shortcut, `[aria-label="Add act"]`, and the first `Drag scene` handle. Use the second `[data-structure-act-id]` row as the target, and wait for the sidebar to contain `ACT II` before the move. The move must use DnD input, not an editor or repository mutation.

- [ ] **Step 4: Write the failing browser-driver behavior tests**

Test that the driver selects a fixture block in the real editor DOM, clicks Add act, waits for a second act row, and performs the scene-handle drag onto that row. Use narrow Page/Locator fakes only at the Playwright boundary.

- [ ] **Step 5: Verify GREEN**

Run: `corepack pnpm --filter @stagistic/feature-demos test -- runActsAndScenesFlow.test.ts createPlaywrightActsAndScenesDriver.test.ts`

Expected: PASS.

### Task 3: Operator-gated capture runner

**Files:**

- Create: `demos/feature-loops/src/runner/prepareActsAndScenesCapture.ts`
- Create: `demos/feature-loops/src/runner/prepareActsAndScenesCapture.test.ts`
- Create: `demos/feature-loops/src/runner/runRecordedActsAndScenesDemo.ts`
- Create: `demos/feature-loops/src/runner/runRecordedActsAndScenesDemo.test.ts`
- Create: `demos/feature-loops/src/runActsAndScenesDemo.ts`
- Modify: `demos/feature-loops/package.json`
- Modify: `demos/feature-loops/README.md`

**Interfaces:**

- Produces `prepareActsAndScenesCapture({page, baseUrl})` for the new dev route.
- Produces `runRecordedActsAndScenesDemo({page, driver, baseUrl, waitForOperator, log})` with the same before/after operator gates as the existing demo.
- Adds `demo:acts-and-scenes` to the feature-demos package.

- [ ] **Step 1: Write the failing runner tests**

Assert that preparation acknowledges public preview, opens `/dev/demos/acts-and-scenes`, waits for the editor route, and focuses the script editor. Assert that recording begins only after the first operator confirmation and that Chromium remains open after the flow completes.

- [ ] **Step 2: Run runner tests to verify RED**

Run: `corepack pnpm --filter @stagistic/feature-demos test -- prepareActsAndScenesCapture.test.ts runRecordedActsAndScenesDemo.test.ts`

Expected: FAIL because the runner modules do not exist.

- [ ] **Step 3: Implement the runner by adapting only its generic capture shell**

Retain the existing viewport, dark color scheme, fresh browser context, Recordly prompts, and `STAGISTIC_DEMO_BASE_URL` support. Point only to the new preparation and flow modules.

- [ ] **Step 4: Verify GREEN and update operating instructions**

Run: `corepack pnpm --filter @stagistic/feature-demos test -- prepareActsAndScenesCapture.test.ts runRecordedActsAndScenesDemo.test.ts`

Document the new command and its 7–8.5 second sequence in `README.md`.

### Task 4: Live editor validation

**Files:**

- Modify only if the live check exposes a deterministic runner defect: files from Tasks 1–3.

- [ ] **Step 1: Run focused static checks**

Run: `corepack pnpm --filter @stagistic/feature-demos typecheck && corepack pnpm --filter @stagistic/feature-demos test`

Expected: PASS.

- [ ] **Step 2: Run the real capture flow against the local web app**

Run: `corepack pnpm --filter @stagistic/feature-demos demo:acts-and-scenes`

Verify manually in the headed browser that the outline starts with one scene, gains `THE CONSERVATORY`, gains `ACT II`, shows the DnD drop treatment, and finishes with the original scene nested in `ACT II`.

- [ ] **Step 3: Run repository checks proportionately**

Run: `npx tsc -b` and the targeted ESLint command for the changed TypeScript/TSX files. If the whole repository check has unrelated baseline failures, report them without mutating unrelated code.

- [ ] **Step 4: Refresh the project graph**

Run: `graphify update .`

Expected: the graph updates without modifying source files.
