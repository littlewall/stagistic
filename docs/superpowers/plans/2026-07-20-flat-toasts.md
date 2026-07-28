# Flat Toasts Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restyle toast notifications as compact neutral surfaces with status dots and a proportionate close control.

**Architecture:** Keep the existing React Aria toast queue and public controller API. Add only presentational markup for the status indicator and accessible close label, then express the approved design in the existing CSS module.

**Tech Stack:** React 19, TypeScript, React Aria Components, CSS Modules, Vite Plus browser tests

## Global Constraints

- Preserve the current bottom-right region, maximum of three visible toasts, and four-second default timeout.
- Use the existing `success`, `error`, and `info` variants.
- Do not commit; prepare the changes for user review.

---

### Task 1: Flat toast presentation

**Files:**
- Create: `packages/ui/src/feedback/ToastProvider.browser.test.tsx`
- Modify: `packages/ui/src/feedback/ToastProvider.tsx`
- Modify: `packages/ui/src/feedback/ToastProvider.module.css`

**Interfaces:**
- Consumes: existing `ToastProvider`, `useToastController`, `ToastContent`, and `ToastVariant` APIs.
- Produces: the same public API, plus internal status-indicator markup and accessible close labeling.

- [ ] **Step 1: Write the failing browser test**

Create `ToastProvider.browser.test.tsx` with a small child component that calls `addToast` for `success`, `error`, and `info` variants in `useEffect`. Render it inside `ToastProvider`, wait for three `[data-variant]` elements, then assert:

```tsx
expect(new Set(toasts.map(toast => getComputedStyle(toast).backgroundColor)).size).toBe(1);
expect(toasts.every(toast => getComputedStyle(toast).boxShadow === 'none')).toBe(true);
expect(toasts.every(toast => toast.querySelector(':scope > [aria-hidden="true"]'))).toBe(true);

const closeButtons = Array.from(document.querySelectorAll<HTMLButtonElement>(
    'button[aria-label="Zavřít oznámení"]',
));

expect(closeButtons).toHaveLength(3);
closeButtons.forEach(button => {
    const buttonStyle = getComputedStyle(button);
    const iconStyle = getComputedStyle(button.querySelector('svg')!);

    expect(buttonStyle.width).toBe('24px');
    expect(buttonStyle.height).toBe('24px');
    expect(iconStyle.width).toBe('12px');
    expect(iconStyle.height).toBe('12px');
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm --filter @stagistic/ui test:browser -- ToastProvider.browser.test.tsx`

Expected: FAIL because the toast has no status indicator or accessible close label, retains its variant tint and shadow, and the close control is oversized.

- [ ] **Step 3: Implement the approved markup and styling**

In `ToastProvider.tsx`, render the status indicator before the content and label the close button:

```tsx
<span className={styles.statusIndicator} aria-hidden="true" />
<ToastContent className={styles.content}>...</ToastContent>
<Button
    slot="close"
    className={styles.closeButton}
    aria-label="Zavřít oznámení"
>
    <CloseIcon />
</Button>
```

In `ToastProvider.module.css`, change the toast to a three-column compact grid with a neutral surface, neutral border, no shadow, and `var(--radius-md)`. Give `.statusIndicator` a six-pixel circle with neutral default color and success/danger variant overrides. Set `.closeButton` to a 24-pixel square, its child SVG to 12 pixels, and provide restrained hover and focus-visible backgrounds.

- [ ] **Step 4: Run focused verification**

Run: `pnpm --filter @stagistic/ui test:browser -- ToastProvider.browser.test.tsx`

Expected: PASS.

Run: `pnpm --filter @stagistic/ui typecheck`

Expected: PASS.

- [ ] **Step 5: Run repository verification and refresh the graph**

Run: `pnpm lint`

Expected: PASS, apart from explicitly reported unrelated baseline warnings or failures.

Run: `graphify update .`

Expected: graph update completes successfully.

- [ ] **Step 6: Prepare review handoff**

Review the diff, report the exact checks and any unrelated baseline failures, and leave all changes uncommitted for the user.
