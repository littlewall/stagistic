# Delete Script Navigation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Leave the editor before optimistic script deletion can select and render another editor route.

**Architecture:** `useScriptEditorSettingsModal` owns the destructive action and the route transition. It will navigate to the home route synchronously, then await the existing delete mutation. A browser test will hold the mutation pending and assert the route transition has already happened.

**Tech Stack:** React 19, React Router, Vite Plus browser tests, TypeScript.

## Global Constraints

- Preserve the existing delete mutation, toast, loading, and error behavior.
- Use `navigate('/', {replace: true})` before `deleteScript(currentScriptId)`.
- Do not commit changes; the user performs the final commit.

---

### Task 1: Leave editor before deleting its script

**Files:**
- Create: `packages/app-routes/src/routes/script/useScriptEditorSettingsModal.browser.test.tsx`
- Modify: `packages/app-routes/src/routes/script/useScriptEditorSettingsModal.ts:45-50`

**Interfaces:**
- Consumes: `useScriptEditorSettingsModal({currentScriptId, navigate, searchParams, setSearchParams, deleteScript})`.
- Produces: `handleDeleteScript(): Promise<void>` that calls `navigate('/', {replace: true})` before awaiting `deleteScript(currentScriptId)`.

- [ ] **Step 1: Write the failing browser regression test**

Create a harness that calls `handleDeleteScript` from a button. Pass a deferred `deleteScript` promise and a `navigate` spy. After clicking the button, assert the spy was called with `('/', {replace: true})` while the deferred promise is still pending, then resolve the promise.

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm --filter @stagistic/app-routes test:browser -- useScriptEditorSettingsModal.browser.test.tsx`

Expected: FAIL because the current handler awaits deletion before navigating.

- [ ] **Step 3: Implement the minimal ordering change**

Replace the handler body with:

```ts
void navigate('/', {replace: true});
await deleteScript(currentScriptId);
```

- [ ] **Step 4: Run the focused test to verify it passes**

Run: `pnpm --filter @stagistic/app-routes test:browser -- useScriptEditorSettingsModal.browser.test.tsx`

Expected: PASS.

- [ ] **Step 5: Run typecheck and refresh the code graph**

Run: `pnpm --filter @stagistic/app-routes typecheck && graphify update .`

Expected: both commands exit with code 0.
