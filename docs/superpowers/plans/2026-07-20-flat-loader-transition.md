# Flat Loader and Script Creation Transition Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Keep progress bars spatially stable in a flat loader and cover the complete new-script creation transition without showing the optimistically updated home list.

**Architecture:** Make `ProgressPanel` a reusable bar-first, flat stack and let `LoaderOverlay` anchor that stack at the viewport midpoint. Reuse `LoaderOverlay` inside the already-open native new-script dialog while creation is pending, then request editor navigation before closing the dialog.

**Tech Stack:** TypeScript, React 19, CSS Modules, React Router 7, Vite Plus browser tests, pnpm.

## Review Amendment

The first implementation exposed two regressions. The following requirements
supersede conflicting details later in this plan:

- `ProgressPanel` receives one accessible label and a list of active operation
  messages. Parallel operations render together; completed operations are
  removed from the list.
- New-script creation stores the target editor pathname and keeps the modal
  loader active after persistence resolves.
- `GlobalModalsProvider` closes the modal only when React Router reaches the
  stored target pathname.
- Tests must cover operation removal, the pending-to-navigation bridge, and
  route-confirmed completion.

## Global Constraints

- Do not add a transition animation.
- Keep the progress row vertically centered while text grows downward.
- Preserve the new-script name and structure selection after creation failure.
- Do not change persistence, optimistic store behavior, progress colors, or import/duplicate flows.
- Use fat-arrow functions, guard clauses, and keep every file below 300 lines.
- Do not commit; prepare the working tree for user review.

---

### Task 1: Make the Shared Loader Flat and Spatially Stable

**Files:**
- Create: `packages/ui/src/LoaderOverlay.browser.test.tsx`
- Modify: `packages/ui/src/feedback/ProgressPanel.tsx`
- Modify: `packages/ui/src/feedback/ProgressPanel.module.css`
- Modify: `packages/ui/src/LoaderOverlay.module.css`

**Interfaces:**
- Consumes: existing `ProgressPanelProps` and `LoaderOverlayProps`.
- Produces: unchanged public component APIs with bar-first DOM order and viewport-stable overlay geometry.

- [ ] **Step 1: Write the failing browser tests**

Render `LoaderOverlay` into a connected host, capture the progress bar's initial `getBoundingClientRect().top`, rerender with a long wrapping subtitle and hint, and assert the top coordinate is unchanged within one CSS pixel. Assert the progress bar is the first child of the `ProgressPanel` root and that the root computes to a transparent background, zero border width, and no box shadow.

```tsx
const progressBar = await waitForElement<HTMLElement>('[role="progressbar"]');
const panel = progressBar.parentElement!;
const initialTop = progressBar.getBoundingClientRect().top;

render({
    subtitle: 'A long subtitle '.repeat(30),
    hint: 'A long hint '.repeat(30),
});
await waitFor(() => progressBar.getBoundingClientRect().height > 0);

expect(Math.abs(progressBar.getBoundingClientRect().top - initialTop)).toBeLessThan(1);
expect(panel.firstElementChild).toBe(progressBar);
expect(getComputedStyle(panel).backgroundColor).toBe('rgba(0, 0, 0, 0)');
expect(getComputedStyle(panel).borderTopWidth).toBe('0px');
expect(getComputedStyle(panel).boxShadow).toBe('none');
```

- [ ] **Step 2: Verify RED**

Run:

```bash
pnpm --filter @stagistic/ui test:browser -- LoaderOverlay.browser.test.tsx
```

Expected: DOM-order and flat-style assertions fail; multiline text changes the progress bar's top coordinate.

- [ ] **Step 3: Put the progress bar before a grouped text stack**

Render `ProgressBar` first and move all optional copy below it:

```tsx
<div className={clsx(styles.panel, size === 'sm' && styles.small)}>
    <ProgressBar value={progress} label={title} size={size} />
    <div className={styles.copy}>
        <div className={styles.title}>{title}</div>
        {subtitle ? <div className={styles.subtitle}>{subtitle}</div> : null}
        {statusText ? <div className={styles.status}>{statusText}</div> : null}
        {hint ? <div className={styles.hint}>{hint}</div> : null}
    </div>
</div>
```

- [ ] **Step 4: Flatten the panel and anchor the overlay**

Remove card surface styles and padding from `ProgressPanel.module.css`. Keep only layout, responsive spacing, and typography. Position the `LoaderOverlay` width wrapper from the viewport midpoint so its first row remains fixed and later content flows down:

```css
.overlay {
    position: fixed;
    z-index: 20;
    inset: 0;
    overflow: auto;
    padding: var(--space-5xl);
    background: var(--color-bg);
}

.panel {
    position: absolute;
    top: 50%;
    left: 50%;
    width: min(520px, calc(100vw - 2 * var(--space-5xl)));
    transform: translateX(-50%);
}
```

- [ ] **Step 5: Verify GREEN**

Run:

```bash
pnpm --filter @stagistic/ui test:browser -- LoaderOverlay.browser.test.tsx
pnpm --filter @stagistic/ui typecheck
```

Expected: loader browser tests and UI typecheck pass.

---

### Task 2: Keep the New-Script Dialog Covering Creation and Navigation

**Files:**
- Modify: `packages/ui/src/dialogs/NewScriptModal.browser.test.tsx`
- Modify: `packages/ui/src/dialogs/NewScriptModal.tsx`
- Create: `packages/app-routes/src/global-modals/modals/useGlobalModalMutations.browser.test.tsx`
- Modify: `packages/app-routes/src/global-modals/modals/useGlobalModalMutations.ts`

**Interfaces:**
- Consumes: existing `NewScriptModalProps.onCreate(name, shape): void | Promise<void>` and React Router `NavigateFunction`.
- Produces: immediate modal-contained loading state; successful creation calls `navigate(path)` before `setIsNewScriptOpen(false)`.

- [ ] **Step 1: Write the failing modal transition test**

Use a controllable promise for `onCreate`, enter a title and select one-act, submit, then assert the form disappears and a progress bar appears. Resolve the promise while the parent keeps the modal open and assert the same title and one-act choice return.

```tsx
let resolveCreate = () => {};
const onCreate = vi.fn(() => new Promise<void>(resolve => {
    resolveCreate = resolve;
}));

await page.elementLocator(nameInput).fill('Long Day');
await page.elementLocator(oneAct.closest('label')!).click();
await page.elementLocator(submitButton).click();

expect(document.querySelector('[role="progressbar"]')).not.toBeNull();
expect(document.querySelector('form')).toBeNull();

resolveCreate();
await waitFor(() => document.querySelector('form') !== null);
expect(nameInput.value).toBe('Long Day');
expect(oneAct.checked).toBe(true);
```

- [ ] **Step 2: Verify modal RED**

Run:

```bash
pnpm --filter @stagistic/ui test:browser -- NewScriptModal.browser.test.tsx
```

Expected: the form remains visible and no loader progress bar exists while creation is pending.

- [ ] **Step 3: Replace pending form content with the shared loader**

Import `LoaderOverlay`. When `isPending` is true, render it as the `ModalDialog` child; otherwise render the existing title, subtitle, and form. Keep the modal mounted and keep `name` and `shape` in their existing local state.

```tsx
{isPending ? (
    <LoaderOverlay
        title="Preparing editor"
        subtitle="Creating your script"
        hint="Please wait while we set up the editor."
    />
) : (
    <>
        {/* existing title, subtitle, and form */}
    </>
)}
```

Prevent backdrop or Escape closure while pending by passing a guarded close callback to `ModalDialog`.

- [ ] **Step 4: Verify modal GREEN**

Run:

```bash
pnpm --filter @stagistic/ui test:browser -- NewScriptModal.browser.test.tsx
```

Expected: all `NewScriptModal` browser tests pass.

- [ ] **Step 5: Write the failing navigation-order hook test**

Render a harness using `useGlobalModalMutations` with a resolved `createScript`. Record calls from `navigate` and `setIsNewScriptOpen`, invoke `handleCreate`, and assert:

```ts
expect(sequence).toEqual([
    'navigate:/script/script-1/editor',
    'close',
]);
```

- [ ] **Step 6: Verify navigation-order RED**

Run:

```bash
pnpm --filter @stagistic/app-routes test:browser -- useGlobalModalMutations.browser.test.tsx
```

Expected: sequence is `['close', 'navigate:/script/script-1/editor']`.

- [ ] **Step 7: Request navigation before closing the modal**

Change only the successful create path:

```ts
void navigate(`/script/${scriptId}/editor`);
setIsNewScriptOpen(false);
```

Leave the catch path unchanged so the modal remains open and its local pending state returns to the preserved form.

- [ ] **Step 8: Verify GREEN**

Run:

```bash
pnpm --filter @stagistic/app-routes test:browser -- useGlobalModalMutations.browser.test.tsx
pnpm --filter @stagistic/app-routes typecheck
```

Expected: navigation-order test and app-routes typecheck pass.

---

### Task 3: Verify the Combined Change

**Files:**
- Review only: all files modified in Tasks 1-2.

**Interfaces:**
- Consumes: completed flat loader and new-script transition.
- Produces: review-ready working tree and refreshed project graph.

- [ ] **Step 1: Refresh the knowledge graph**

Run:

```bash
graphify update .
```

Expected: graph update completes successfully.

- [ ] **Step 2: Run focused checks**

Run:

```bash
pnpm --filter @stagistic/ui test:browser
pnpm --filter @stagistic/app-routes test:browser
pnpm --filter @stagistic/ui typecheck
pnpm --filter @stagistic/app-routes typecheck
```

Expected: affected package checks pass, except any explicitly reported pre-existing browser failures outside touched files.

- [ ] **Step 3: Run canonical repository checks**

Run:

```bash
npx tsc -b
pnpm lint
pnpm test
```

Expected: typecheck and lint pass. Report the known unrelated export transcription test failures if they remain; do not change snapshots or assertions to hide them.

- [ ] **Step 4: Review the diff**

Run:

```bash
git diff --check
git status --short
git diff -- packages/ui packages/app-routes docs/superpowers
```

Expected: no whitespace errors, no unrelated user files modified, and no commit created.
