# View Switcher + Export View (dummy) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a prominent view switcher (segmented control) in the app header center that moves between per-script views — Editor (existing) and Export (new dummy).

**Architecture:** A new `ViewSwitcher` UI component renders into the header's existing center `scriptControls` slot. `ScriptEditorAppHeader` (UI) gains `activeView` + `onSelectView` props and mounts the switcher; the app-routes wrapper wires `onSelectView` to router navigation. Each route declares its own `activeView` (state derived from the route, no global store). A new `ScriptExportRoute` renders the same header with a dummy body.

**Tech Stack:** React 19, react-router-dom 7, react-aria-components, CSS Modules, `vite-plus/test` (unit + browser/playwright).

## Global Constraints

- Design register: "The Dark Stage" — quiet, precise, subtractive. The switcher is not a loud toolbar. See [DESIGN.md](../../../DESIGN.md) / [PRODUCT.md](../../../PRODUCT.md).
- Views are **script-scoped**: the switcher only appears inside an open script (Editor/Export), never on Home or the script list.
- **No commits during implementation.** The whole feature is pushed as one unit; the user commits at the end. Do NOT run `git commit`. Each task ends with a verification checkpoint (tests + lint green) instead of a commit.
- Test imports: `import {describe, it, expect} from 'vite-plus/test'`. Browser tests are `*.browser.test.tsx`, run via each package's `test:browser` script (`vp test run -c vitest.browser.config.ts`).
- Route paths: Editor `/script/:scriptId/editor`, Export `/script/:scriptId/export`.
- `ScriptView = 'editor' | 'export'`.

---

## File Structure

- `packages/ui/src/layout/header/types.ts` — add `ScriptView` type. (modify)
- `packages/ui/src/layout/header/ViewSwitcher.tsx` — segmented control component. (create)
- `packages/ui/src/layout/header/ViewSwitcher.module.css` — switcher styles. (create)
- `packages/ui/src/layout/header/ViewSwitcher.test.tsx` — unit test. (create)
- `packages/ui/src/layout/AppHeader.tsx` — `ScriptEditorAppHeader` mounts `ViewSwitcher`; re-export `ScriptView`. (modify)
- `packages/ui/src/index.ts` — export `ScriptView`. (modify)
- `packages/app-routes/src/layout/AppHeader.tsx` — wrapper wires `onSelectView` → navigate; passes `activeView`. (modify)
- `packages/app-routes/src/routes/script/ScriptExportRoute.tsx` — new route. (create)
- `packages/app-routes/src/index.ts` — export `ScriptExportRoute`. (modify)
- `packages/app-routes/src/routes/script/ScriptExportRoute.browser.test.tsx` — switching browser test. (create)
- `apps/web/src/App.tsx` — register export route. (modify)
- `packages/app-routes/src/routes/script/ScriptEditorRoute.tsx` — pass `activeView="editor"`. (modify)

---

### Task 1: `ViewSwitcher` UI component

Segmented control with the switcher's own presentation and behavior; pure/controlled, no router knowledge.

**Files:**
- Modify: `packages/ui/src/layout/header/types.ts`
- Create: `packages/ui/src/layout/header/ViewSwitcher.tsx`
- Create: `packages/ui/src/layout/header/ViewSwitcher.module.css`
- Test: `packages/ui/src/layout/header/ViewSwitcher.test.tsx`

**Interfaces:**
- Consumes: nothing (leaf component).
- Produces:
  - `type ScriptView = 'editor' | 'export'` (from `types.ts`)
  - `type ViewSwitcherItem = {view: ScriptView, label: string}`
  - `const VIEW_SWITCHER_ITEMS: readonly ViewSwitcherItem[]`
  - `ViewSwitcher(props: {activeView: ScriptView, onSelectView: (view: ScriptView) => void})`

- [ ] **Step 1: Add the `ScriptView` type**

In `packages/ui/src/layout/header/types.ts`, append:

```ts
export type ScriptView = 'editor' | 'export';
```

- [ ] **Step 2: Write the failing unit test**

Create `packages/ui/src/layout/header/ViewSwitcher.test.tsx`:

```tsx
import {renderToStaticMarkup} from 'react-dom/server';
import {describe, expect, it} from 'vite-plus/test';

import {ViewSwitcher, VIEW_SWITCHER_ITEMS} from './ViewSwitcher';

describe('VIEW_SWITCHER_ITEMS', () => {
    it('lists editor then export', () => {
        expect(VIEW_SWITCHER_ITEMS.map(item => item.view)).toEqual(['editor', 'export']);
    });
});

describe('ViewSwitcher', () => {
    it('marks the active view as pressed and others as not pressed', () => {
        const markup = renderToStaticMarkup(
            <ViewSwitcher activeView="export" onSelectView={() => {}} />,
        );

        expect(markup).toContain('Editor');
        expect(markup).toContain('Export');
        // react-aria toggle buttons expose aria-pressed
        expect(markup).toMatch(/aria-pressed="true"[^>]*>\s*Export|Export[^<]*<\/span>/);
    });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `pnpm --filter @stagistic/ui test run src/layout/header/ViewSwitcher.test.tsx`
Expected: FAIL — `ViewSwitcher` / `VIEW_SWITCHER_ITEMS` not found (module does not exist).

- [ ] **Step 4: Create the stylesheet**

Create `packages/ui/src/layout/header/ViewSwitcher.module.css`:

```css
.switcher {
    display: inline-flex;
    gap: calc(2px * var(--size-scale));
    align-items: center;
    padding: calc(2px * var(--size-scale));
    background: color-mix(in oklch, var(--color-surface-raised) 70%, transparent);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-full);
}

.segment {
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: var(--space-sm) var(--space-lg);
    font-size: var(--font-size-md);
    font-weight: var(--font-weight-medium);
    color: var(--color-text-muted);
    background: transparent;
    border: 1px solid transparent;
    border-radius: var(--radius-full);
    transition: background .12s ease, border-color .12s ease, color .12s ease;

    &:focus {
        outline: none;
        box-shadow: none;
    }

    &[data-hovered] {
        color: var(--color-text);
        background: color-mix(in oklch, var(--color-surface-accent) 40%, transparent);
    }

    &[data-focus-visible] {
        outline: none;
        box-shadow: none;
        border-color: var(--color-border);
    }

    &[data-selected] {
        color: var(--color-text);
        background: var(--color-surface);
        border-color: var(--color-border);
    }
}
```

- [ ] **Step 5: Implement `ViewSwitcher`**

Create `packages/ui/src/layout/header/ViewSwitcher.tsx`:

```tsx
import clsx from 'clsx';
import {ToggleButton} from 'react-aria-components';

import styles from './ViewSwitcher.module.css';
import type {ScriptView} from './types';

export type ViewSwitcherItem = {
    view: ScriptView,
    label: string,
};

export const VIEW_SWITCHER_ITEMS: readonly ViewSwitcherItem[] = [
    {view: 'editor', label: 'Editor'},
    {view: 'export', label: 'Export'},
];

type ViewSwitcherProps = {
    activeView: ScriptView,
    onSelectView: (view: ScriptView) => void,
};

export const ViewSwitcher = ({activeView, onSelectView}: ViewSwitcherProps) => {
    return (
        <div className={styles.switcher} role="group" aria-label="Views">
            {VIEW_SWITCHER_ITEMS.map(item => (
                <ToggleButton
                    key={item.view}
                    className={clsx(styles.segment)}
                    isSelected={item.view === activeView}
                    onPress={() => {
                        if (item.view !== activeView) {
                            onSelectView(item.view);
                        }
                    }}
                >
                    {item.label}
                </ToggleButton>
            ))}
        </div>
    );
};
```

- [ ] **Step 6: Run the test to verify it passes**

Run: `pnpm --filter @stagistic/ui test run src/layout/header/ViewSwitcher.test.tsx`
Expected: PASS (both `describe` blocks green).

- [ ] **Step 7: Verification checkpoint (no commit)**

Run: `pnpm --filter @stagistic/ui lint`
Expected: no lint errors in the new files.

---

### Task 2: Mount `ViewSwitcher` in UI `ScriptEditorAppHeader`

Header composes the switcher into the center `scriptControls` slot; still no router knowledge — receives `activeView` + `onSelectView` from its caller.

**Files:**
- Modify: `packages/ui/src/layout/AppHeader.tsx`
- Modify: `packages/ui/src/index.ts`

**Interfaces:**
- Consumes: `ViewSwitcher`, `ScriptView` (Task 1).
- Produces: `ScriptEditorAppHeaderProps` gains `activeView: ScriptView` and `onSelectView: (view: ScriptView) => void`; `ScriptView` re-exported from `@stagistic/ui`.

- [ ] **Step 1: Import the switcher and type in `AppHeader.tsx`**

In `packages/ui/src/layout/AppHeader.tsx`, add near the other header imports (after the `ScriptMenu` import on line 27):

```tsx
import {ViewSwitcher} from './header/ViewSwitcher';
import type {ScriptView} from './header/types';
```

And extend the re-export block (currently `export type {ScriptListItem, ScriptSyncState};`) to also surface `ScriptView`:

```tsx
export type {
    ScriptListItem,
    ScriptSyncState,
    ScriptView,
};
```

- [ ] **Step 2: Add props to `ScriptEditorAppHeaderProps`**

In `packages/ui/src/layout/AppHeader.tsx`, extend `ScriptEditorAppHeaderProps` (the `type` around line 132) with two fields:

```tsx
export type ScriptEditorAppHeaderProps = {
    currentScript: ScriptListItem,
    recentScripts?: ScriptListItem[],
    onSelectScript: (script: ScriptListItem) => void,
    onMenuAction?: (actionId: string) => void,
    scriptSyncState?: ScriptSyncState,
    onHome: () => void,
    onBackToEditor?: () => void,
    backToEditorLabel?: string,
    isFullWidth?: boolean,
    activeView: ScriptView,
    onSelectView: (view: ScriptView) => void,
};
```

- [ ] **Step 3: Render the switcher into the center slot**

In `ScriptEditorAppHeader`, destructure the two new props and pass `scriptControls` to the inner `AppHeader`. Update the component so its `AppHeader` call includes:

```tsx
export const ScriptEditorAppHeader = ({
    currentScript,
    recentScripts = [],
    onSelectScript,
    onMenuAction,
    scriptSyncState,
    onHome,
    onBackToEditor,
    backToEditorLabel = 'Back to editor',
    isFullWidth = true,
    activeView,
    onSelectView,
}: ScriptEditorAppHeaderProps) => {
    const handleScriptMenuAction = useCallback((key: string) => {
        if (key.startsWith('script:')) {
            const scriptId = key.replace('script:', '');
            const script = recentScripts.find(item => item.id === scriptId);

            if (script) {
                onSelectScript(script);
            }

            return;
        }

        onMenuAction?.(key);
    }, [
        onMenuAction,
        onSelectScript,
        recentScripts,
    ]);

    return (
        <AppHeader
            onMenuAction={onMenuAction}
            onHome={onHome}
            isFullWidth={isFullWidth}
            scriptControls={<ViewSwitcher activeView={activeView} onSelectView={onSelectView} />}
            leftControls={(
                <>
                    {onBackToEditor ? (
                        <Button
                            className={clsx(styles.menuTrigger, styles.backButton)}
                            onPress={onBackToEditor}
                        >
                            {backToEditorLabel}
                        </Button>
                    ) : null}
                    <ScriptMenu
                        script={currentScript}
                        recentScripts={recentScripts}
                        onAction={handleScriptMenuAction}
                    />
                    <SyncIndicator state={scriptSyncState} />
                </>
            )}
        />
    );
};
```

- [ ] **Step 4: Export `ScriptView` from the package entry**

In `packages/ui/src/index.ts`, extend the `./layout/AppHeader` export block (lines ~46-52) to include `ScriptView`:

```ts
export {
    AppHeader,
    type AppHeaderProps,
    ScriptEditorAppHeader,
    type ScriptEditorAppHeaderProps,
    type ScriptListItem,
    type ScriptSyncState,
    type ScriptView,
} from './layout/AppHeader';
```

> Note: keep whatever members already exist in that block; only add `type ScriptView`. If `ScriptSyncState` is not currently re-exported there, do not add it — add only `type ScriptView`.

- [ ] **Step 5: Typecheck the UI package**

Run: `pnpm --filter @stagistic/ui lint`
Expected: passes. (Consumers of `ScriptEditorAppHeader` in app-routes will now error about missing `activeView`/`onSelectView` — that is expected and fixed in Task 3/5; the UI package itself must be clean.)

---

### Task 3: Wire navigation in app-routes `ScriptEditorAppHeader`

The app-routes wrapper turns `onSelectView` into router navigation and forwards `activeView`.

**Files:**
- Modify: `packages/app-routes/src/layout/AppHeader.tsx`

**Interfaces:**
- Consumes: UI `ScriptEditorAppHeader` (now requires `activeView` + `onSelectView`), `ScriptView` from `@stagistic/ui`.
- Produces: app-routes `ScriptEditorAppHeaderProps` requires `activeView`; the wrapper derives `scriptId` from `props.currentScript.id` and navigates to `/script/:scriptId/:view`.

- [ ] **Step 1: Update imports and prop type**

In `packages/app-routes/src/layout/AppHeader.tsx`, add `type ScriptView` to the `@stagistic/ui` import, then change the wrapper's prop type so `onSelectView` is supplied by the wrapper (omit it from the caller) but `activeView` is required:

```tsx
import {
    AppHeader as UIAppHeader,
    type AppHeaderProps as UIAppHeaderProps,
    ScriptEditorAppHeader as UIScriptEditorAppHeader,
    type ScriptEditorAppHeaderProps as UIScriptEditorAppHeaderProps,
    type ScriptView,
} from '@stagistic/ui';
```

Change the `ScriptEditorAppHeaderProps` alias in this file to also omit `onSelectView`:

```tsx
type ScriptEditorAppHeaderProps = Omit<
    UIScriptEditorAppHeaderProps,
    'onHome' | 'onSelectScript' | 'onSelectView'
>;
```

- [ ] **Step 2: Wire `onSelectView` to navigation**

Replace the `ScriptEditorAppHeader` wrapper body so it navigates on view select, deriving the id from `currentScript`:

```tsx
export const ScriptEditorAppHeader = (props: ScriptEditorAppHeaderProps) => {
    const navigate = useNavigate();

    return (
        <UIScriptEditorAppHeader
            {...props}
            onHome={() => void navigate('/')}
            onSelectScript={script => void navigate(`/script/${script.id}/editor`)}
            onSelectView={view => void navigate(`/script/${props.currentScript.id}/${view}`)}
        />
    );
};
```

- [ ] **Step 3: Typecheck**

Run: `pnpm --filter @stagistic/app-routes lint`
Expected: `ScriptEditorRoute.tsx` errors that `activeView` is missing (fixed in Task 5). No errors in `layout/AppHeader.tsx` itself.

---

### Task 4: `ScriptExportRoute` (dummy) + route registration

New route: light name-only load for the header, dummy body. Self-contained so a later full read-only load + in-state export settings panel is additive.

**Files:**
- Create: `packages/app-routes/src/routes/script/ScriptExportRoute.tsx`
- Modify: `packages/app-routes/src/index.ts`
- Modify: `apps/web/src/App.tsx`

**Interfaces:**
- Consumes: `useScripts`, `useRecentScripts` from `@stagistic/app-core`; `AppLayout` from `@stagistic/ui`; `ScriptEditorAppHeader` from `../../layout/AppHeader`.
- Produces: `export const ScriptExportRoute` (re-exported from `packages/app-routes/src/index.ts`).

- [ ] **Step 1: Create the route component**

Create `packages/app-routes/src/routes/script/ScriptExportRoute.tsx`:

```tsx
import {
    useRecentScripts,
    useScripts,
} from '@stagistic/app-core';
import {AppLayout} from '@stagistic/ui';
import {useMemo} from 'react';
import {useParams} from 'react-router-dom';

import {ScriptEditorAppHeader} from '../../layout/AppHeader';
import styles from './ScriptExportRoute.module.css';

export const ScriptExportRoute = () => {
    const {scriptId} = useParams();
    const {scripts} = useScripts();
    const {scripts: recentScripts} = useRecentScripts();

    const currentScript = useMemo(
        () => scripts.find(script => script.id === scriptId) ?? null,
        [scripts, scriptId],
    );

    return (
        <AppLayout
            header={currentScript ? (
                <ScriptEditorAppHeader
                    currentScript={currentScript}
                    recentScripts={recentScripts}
                    activeView="export"
                />
            ) : null}
        >
            <div className={styles.placeholder}>
                <p className={styles.heading}>Export</p>
                <p className={styles.subtitle}>Coming soon</p>
            </div>
        </AppLayout>
    );
};
```

- [ ] **Step 2: Create the placeholder stylesheet**

Create `packages/app-routes/src/routes/script/ScriptExportRoute.module.css`:

```css
.placeholder {
    display: flex;
    flex-direction: column;
    gap: var(--space-sm);
    align-items: center;
    justify-content: center;
    height: 100%;
    padding: var(--space-xl);
    text-align: center;
}

.heading {
    margin: 0;
    font-size: var(--font-size-lg);
    font-weight: var(--font-weight-medium);
    color: var(--color-text);
}

.subtitle {
    margin: 0;
    font-size: var(--font-size-md);
    color: var(--color-text-muted);
}
```

- [ ] **Step 3: Export the route**

In `packages/app-routes/src/index.ts`, add (keep alphabetical grouping with the other `routes/script` exports):

```ts
export {ScriptExportRoute} from './routes/script/ScriptExportRoute';
```

- [ ] **Step 4: Register the route in the app**

In `apps/web/src/App.tsx`, add `ScriptExportRoute` to the `@stagistic/app-routes` import list, then add the route inside `<Routes>` right after the editor route (line 80):

```tsx
<Route path="/script/:scriptId/export" element={<ScriptExportRoute />} />
```

- [ ] **Step 5: Typecheck app-routes and web**

Run: `pnpm --filter @stagistic/app-routes lint && pnpm --filter @stagistic/web lint`
Expected: no errors in `ScriptExportRoute.tsx` or `App.tsx`. (`ScriptEditorRoute.tsx` may still error until Task 5.)

---

### Task 5: Editor route declares its `activeView`

**Files:**
- Modify: `packages/app-routes/src/routes/script/ScriptEditorRoute.tsx`

**Interfaces:**
- Consumes: app-routes `ScriptEditorAppHeader` (now requires `activeView`).
- Produces: nothing new.

- [ ] **Step 1: Pass `activeView="editor"`**

In `packages/app-routes/src/routes/script/ScriptEditorRoute.tsx`, in the `AppLayout` header where `ScriptEditorAppHeader` is rendered (around lines 217-223), add the prop:

```tsx
<ScriptEditorAppHeader
    currentScript={displayedCurrentScript}
    recentScripts={recentScripts}
    scriptSyncState={saveIndicator}
    onMenuAction={handleMenuAction}
    activeView="editor"
/>
```

- [ ] **Step 2: Typecheck the whole workspace**

Run: `pnpm --filter @stagistic/app-routes lint && pnpm --filter @stagistic/ui lint && pnpm --filter @stagistic/web lint`
Expected: all pass — no missing-prop errors anywhere.

- [ ] **Step 3: Run the existing unit test suite**

Run: `pnpm test`
Expected: PASS (no regressions; `ViewSwitcher.test.tsx` green).

---

### Task 6: Browser test — switching Editor ↔ Export

End-to-end confirmation that the switcher navigates and reflects the active view. Mounts the app-routes `ScriptEditorAppHeader` inside a `MemoryRouter` with a probe route so we can assert the URL.

**Files:**
- Create: `packages/app-routes/src/routes/script/ScriptExportRoute.browser.test.tsx`

**Interfaces:**
- Consumes: app-routes `ScriptEditorAppHeader`.

- [ ] **Step 1: Write the browser test**

Create `packages/app-routes/src/routes/script/ScriptExportRoute.browser.test.tsx`:

```tsx
import {createRoot, type Root} from 'react-dom/client';
import {
    MemoryRouter,
    Route,
    Routes,
    useLocation,
} from 'react-router-dom';
import {
    afterEach,
    describe,
    expect,
    it,
} from 'vite-plus/test';
import {userEvent} from 'vite-plus/test/browser';

import {ScriptEditorAppHeader} from '../../layout/AppHeader';

const mountedRoots: Root[] = [];

const LocationProbe = () => {
    const location = useLocation();

    return <div data-testid="pathname">{location.pathname}</div>;
};

const renderAt = (view: 'editor' | 'export') => {
    const host = document.createElement('div');

    document.body.appendChild(host);

    const root = createRoot(host);

    root.render(
        <MemoryRouter initialEntries={[`/script/s1/${view}`]}>
            <ScriptEditorAppHeader
                currentScript={{id: 's1', name: 'My Script'}}
                recentScripts={[]}
                activeView={view}
            />
            <Routes>
                <Route path="/script/:scriptId/editor" element={<LocationProbe />} />
                <Route path="/script/:scriptId/export" element={<LocationProbe />} />
            </Routes>
        </MemoryRouter>,
    );
    mountedRoots.push(root);
};

const waitFor = async (predicate: () => boolean) => {
    const deadline = Date.now() + 1000;

    while (Date.now() < deadline) {
        if (predicate()) {
            return;
        }

        await new Promise(resolve => window.setTimeout(resolve, 10));
    }

    throw new Error('Timed out waiting for condition');
};

const pathname = () => document.querySelector('[data-testid="pathname"]')?.textContent ?? '';

const findSegment = (label: string): HTMLElement => {
    const button = Array.from(document.querySelectorAll('button'))
        .find(el => el.textContent?.trim() === label);

    if (!button) {
        throw new Error(`Segment "${label}" not found`);
    }

    return button as HTMLElement;
};

afterEach(() => {
    mountedRoots.forEach(root => root.unmount());
    mountedRoots.length = 0;
    document.body.innerHTML = '';
});

describe('view switcher navigation', () => {
    it('navigates to export when the Export segment is pressed', async () => {
        renderAt('editor');

        expect(pathname()).toBe('/script/s1/editor');
        expect(findSegment('Export').getAttribute('aria-pressed')).toBe('false');

        await userEvent.click(findSegment('Export'));
        await waitFor(() => pathname() === '/script/s1/export');

        expect(pathname()).toBe('/script/s1/export');
    });

    it('navigates back to editor from the export view', async () => {
        renderAt('export');

        expect(pathname()).toBe('/script/s1/export');
        expect(findSegment('Export').getAttribute('aria-pressed')).toBe('true');

        await userEvent.click(findSegment('Editor'));
        await waitFor(() => pathname() === '/script/s1/editor');

        expect(pathname()).toBe('/script/s1/editor');
    });
});
```

- [ ] **Step 2: Run the browser test**

Run: `pnpm --filter @stagistic/app-routes test:browser src/routes/script/ScriptExportRoute.browser.test.tsx`
Expected: PASS — both navigation cases green.

> If `aria-pressed` is not emitted by `ToggleButton` in the DOM, assert active state via the `data-selected` attribute instead (`findSegment('Export').hasAttribute('data-selected')`), and update the Task 1 unit test to match. Prefer `aria-pressed`; fall back only if the runtime disagrees.

- [ ] **Step 3: Final verification checkpoint (no commit)**

Run: `pnpm test && pnpm --filter @stagistic/ui test:browser && pnpm --filter @stagistic/app-routes test:browser && pnpm lint`
Expected: everything green. Do NOT commit — report completion and hand the staged, uncommitted work to the user for a single feature commit.

---

## Self-Review

**Spec coverage:**
- View switcher UI in header center → Tasks 1–2. ✔
- Prominent active view → segmented control styles (Task 1 CSS, `data-selected`). ✔
- `/script/:scriptId/export` route + dummy body → Task 4. ✔
- Header wiring (both views mark their view) → Tasks 2, 3, 5. ✔
- Script-scoped (only inside a script) → switcher lives only in `ScriptEditorAppHeader`, not the plain `AppHeader` used by Home/list. ✔
- Export future-proofing (full read-only load + in-state settings later) → `ScriptExportRoute` is self-contained; body is a plain child of `AppLayout`, load is swappable. ✔
- Tests: `ViewSwitcher` unit (Task 1) + browser switching test (Task 6). ✔
- No commits during implementation → verification checkpoints replace commit steps. ✔

**Placeholder scan:** No TBD/TODO; all code shown in full. ✔

**Type consistency:** `ScriptView` defined in Task 1 (`types.ts`), re-exported in Task 2 (ui `AppHeader.tsx` + `index.ts`), consumed in Task 3 (app-routes). `activeView`/`onSelectView` names consistent across Tasks 2, 3, 5. `ViewSwitcher` prop shape matches usage in Task 2. ✔
