# Editor Pre-release Notice Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Block first web-app startup until the user acknowledges the versioned pre-release notice, and expose the same facts from the footer.

**Architecture:** A web-only gate checks a safe, versioned `localStorage` contract before rendering the existing boot component. A shared UI notice body supplies consistent copy to both the required gate and the dismissible footer dialog.

**Tech Stack:** React 19, TypeScript, CSS Modules, React Aria-backed UI atoms, Vite Plus unit and browser tests.

## Global Constraints

- The notice copy must match `docs/superpowers/specs/2026-07-30-editor-prerelease-notice-design.md`.
- The acknowledgement key is `stagistic.web.publicPreviewAcknowledgement` and the current value is `"1"`.
- The local database must not initialize before acknowledgement.
- The required modal cannot close through Escape or the backdrop.
- Storage failures must not crash the app; failed writes may allow only the current session to proceed.
- Reuse the existing product design system without new colors, typography, assets, or motion.
- Follow the repository TypeScript/React style and keep each file below 300 lines.
- Do not create commits; leave all changes for user review.

## Design Decision Record

- **Mode:** Extension.
- **Preserve:** Routes, app boot behavior after entry, `ModalDialog`, footer layout, theme behavior, keyboard focus handling.
- **Improve:** Complete the empty footer explanation and add the first-run acknowledgement gate.
- **Remove:** Nothing.
- **Protected contracts:** Route structure, existing storage keys, accessibility semantics, exact approved notice copy.
- **Design dials:** Visual variance 2, motion 1, information density 5, asset dependence 1, brand fidelity 10.
- **Highest-risk change:** Accidentally initializing the repository or local database before acknowledgement.
- **Fallback:** Treat storage reads as unacknowledged; allow the current session after a failed acknowledgement write.

---

### Task 1: Versioned acknowledgement storage

**Files:**
- Create: `apps/web/src/publicPreview/publicPreviewAcknowledgement.ts`
- Test: `apps/web/src/publicPreview/acknowledgement.test.ts`

**Interfaces:**
- Produces: `hasCurrentPrereleaseAcknowledgement(storage?: Pick<Storage, 'getItem'>): boolean`
- Produces: `storeCurrentPrereleaseAcknowledgement(storage?: Pick<Storage, 'setItem'>): boolean`
- Produces: `PUBLIC_PREVIEW_ACKNOWLEDGEMENT_STORAGE_KEY` and `CURRENT_PUBLIC_PREVIEW_ACKNOWLEDGEMENT_VERSION`

- [ ] **Step 1: Write failing storage tests**

Cover a missing value, exact current value, stale/malformed values, a throwing read,
a successful write observed through a subsequent real read, and a throwing write.
Use a small in-test `Storage` implementation backed by `Map<string, string>`.

- [ ] **Step 2: Verify the tests fail for the missing module**

Run: `pnpm test -- apps/web/src/publicPreview/acknowledgement.test.ts`

Expected: FAIL because `./acknowledgement` does not exist.

- [ ] **Step 3: Implement the safe version contract**

Use these exact public constants:

```ts
export const PUBLIC_PREVIEW_ACKNOWLEDGEMENT_STORAGE_KEY
    = 'stagistic.web.publicPreviewAcknowledgement';
export const CURRENT_PUBLIC_PREVIEW_ACKNOWLEDGEMENT_VERSION = '1';
```

Both public functions accept no required arguments. Keep browser storage lookup
inside a guarded helper; return `false` on unavailable storage or exceptions.

- [ ] **Step 4: Verify storage tests pass**

Run: `pnpm test -- apps/web/src/publicPreview/acknowledgement.test.ts`

Expected: PASS.

### Task 2: Shared notice and completed footer dialog

**Files:**
- Create: `packages/ui/src/dialogs/PublicPreviewNotice.tsx`
- Create: `packages/ui/src/dialogs/PublicPreviewNotice.module.css`
- Modify: `packages/ui/src/index.ts`
- Modify: `packages/ui/src/layout/AppFooter.tsx`
- Modify: `packages/ui/src/layout/AppFooter.module.css`
- Test: `packages/ui/src/layout/AppLayout.browser.test.tsx`

**Interfaces:**
- Produces: exported `PublicPreviewNotice` with no props.
- Consumes: existing `ModalDialog` and `Button`.

- [ ] **Step 1: Extend the footer browser test first**

Open the Alpha pre-release dialog and assert the approved heading, experimental
warning, browser-only storage, no-sync statement, device privacy statement,
analytics/telemetry statement, local theme/layout preferences, backup warning,
and a Close button. Click Close and assert the dialog is no longer open.

- [ ] **Step 2: Verify the footer test fails on the empty current dialog**

Run: `pnpm --filter @stagistic/ui test:browser -- AppLayout.browser.test.tsx`

Expected: FAIL because the factual notice and Close button are absent.

- [ ] **Step 3: Add the shared notice and footer action**

Render the approved title, introduction, and four bullet points in
`PublicPreviewNotice`. Keep readable prose within the existing modal width, use only
design-system tokens, and add a right-aligned secondary Close action to
`AppFooter`.

- [ ] **Step 4: Verify the footer test passes**

Run: `pnpm --filter @stagistic/ui test:browser -- AppLayout.browser.test.tsx`

Expected: PASS.

### Task 3: Required first-run gate before boot

**Files:**
- Create: `apps/web/src/publicPreview/PublicPreviewGate.tsx`
- Create: `apps/web/src/publicPreview/PublicPreviewGate.module.css`
- Test: `apps/web/src/publicPreview/PublicPreviewGate.browser.test.tsx`
- Test: `apps/web/src/App.browser.test.tsx`
- Modify: `apps/web/src/App.tsx`

**Interfaces:**
- Produces: `PublicPreviewGate({children}: {children: ReactNode})`.
- Consumes: `PublicPreviewNotice`, `ModalDialog`, `Button`, and Task 1 storage functions.

- [ ] **Step 1: Write the failing gate browser test**

With the acknowledgement key removed from real browser `localStorage`, render the
gate around visible application content. Assert the content is absent, the
approved acknowledgement sentence and sole continue action are present, Escape
and a backdrop-targeted click leave the dialog open, and clicking continue stores
literal value `"1"` under the literal approved key and renders the content.

- [ ] **Step 2: Verify the gate test fails for the missing component**

Run: `pnpm --filter @stagistic/web test:browser -- PublicPreviewGate.browser.test.tsx`

Expected: FAIL because `PublicPreviewGate` does not exist.

- [ ] **Step 3: Implement the gate**

Initialize acknowledgement state from `hasCurrentPrereleaseAcknowledgement`.
When false, render only an always-open `ModalDialog` whose close handler is a
module-level no-op. Add the acknowledgement sentence and primary
**I understand and continue** button. On press, attempt persistence and set the
in-memory state to acknowledged regardless of write success.

- [ ] **Step 4: Verify the gate test passes**

Run: `pnpm --filter @stagistic/web test:browser -- PublicPreviewGate.browser.test.tsx`

Expected: PASS.

- [ ] **Step 5: Place the gate before the existing boot component**

Extract the current database-loading implementation to `BootedApp` within
`App.tsx`. Remove the runtime static import of `scriptRepository`; it creates the
local database as a module-evaluation side effect. Dynamically import `./repo`
inside `BootedApp` only after database preparation completes. Make the default
`App` render:

```tsx
<PublicPreviewGate>
    <BootedApp />
</PublicPreviewGate>
```

Because `BootedApp` is not rendered and the repository module is not evaluated
while the gate is closed, local database initialization cannot run before
acknowledgement. Add an App-level browser test that tracks real Worker
construction and verifies zero workers before acknowledgement and one afterward.

- [ ] **Step 6: Run focused regression checks**

Run:

```bash
pnpm test -- apps/web/src/publicPreview/acknowledgement.test.ts
pnpm --filter @stagistic/ui test:browser -- AppLayout.browser.test.tsx
pnpm --filter @stagistic/web test:browser -- App.browser.test.tsx
pnpm --filter @stagistic/web test:browser -- PublicPreviewGate.browser.test.tsx
pnpm --filter @stagistic/ui typecheck
pnpm --filter @stagistic/web typecheck
pnpm lint
```

Expected: all checks pass with no new warnings.

- [ ] **Step 7: Update the code knowledge graph**

Run: `graphify update .`

Expected: the graph incorporates the new prerelease storage and UI relationships.
