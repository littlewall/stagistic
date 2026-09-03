# Step 5 — modals and notices recomposition

Spec §9 step 5. Audit and rulings: `docs/design/route-composition-audit-2026-09-01.md`,
section "Step 5 audit (2026-09-03)".

**Standing constraints.** Never commit or push. Never `git stash` — use `git diff > /tmp/x.patch` +
`git apply -R /tmp/x.patch`, always run from the repo root. `packages/editor` is untouched.
`vite.config.js` is a gitignored artifact. Mono font is script content only. Do not mutate golden
snapshots or loosen assertions to turn a red green. Same DOM semantics, same `aria-*`, same heading
levels. Checks: `pnpm -w exec tsc -b`, `eslint --fix`, `stylelint --fix`, `vp test run`,
`vp test run -c vitest.browser.config.ts` from each package directory.

**Approved rulings:** M1 both packages · M2 confirms unify onto dialect A (approved normalization) ·
M3 dead `.panel` widths deleted, 520px stays · M4 `DraftSaveError` stays hand-rolled · M5 non-confirm
modals get shell + header/footer slots only, bodies stay custom.

---

## Task 1 — shared modal chrome in `packages/ui/src/dialogs`

New files, all in `packages/ui/src/dialogs/`:

**`modalChrome.module.css`** — the dialect-A spec, tokens only:

```css
.title       { font-size: var(--font-size-3xl); }
.description { color: var(--color-text-muted); }
.note        { margin-top: var(--space-md); color: var(--color-text-muted); }
.actions     { display: flex; gap: var(--space-md); justify-content: flex-start; }
.actionsSpaced { margin-top: var(--space-lg); }
```

**`ModalHeader.tsx`** — **must render a fragment, not a wrapper.** `h2` / `p` / `p` are direct flex
children of `.panel` today and take its `gap: var(--space-lg)`; a wrapping `<div>` would collapse that
spacing and is a silent visual regression.

```tsx
interface ModalHeaderProps {
    title: ReactNode,
    description?: ReactNode,
    notes?: ReactNode[],
}
```

`notes` renders one `<p className={styles.note}>` per entry (keyed by index) after the description —
this is `.subtitleSecondary` in `RemoveCharacterModal`/`RemoveGroupModal`.

**`ModalActions.tsx`** — `{spacing?: 'none' | 'lg', children}`. `spacing` maps to a class inside the same
module, so there is no cross-module specificity tie to fight.

**`ConfirmModal.tsx`**:

```tsx
interface ConfirmModalProps {
    isOpen: boolean,
    ariaLabel: string,
    title: ReactNode,
    description?: ReactNode,
    notes?: ReactNode[],
    confirmLabel: string,
    cancelLabel?: string,          // default 'Cancel'
    isPending?: boolean,           // default false
    lockWhilePending?: boolean,    // default false — blocks backdrop/Esc close while pending
    onClose: () => void,
    onConfirm: () => void | Promise<void>,
}
```

Renders `ModalDialog` → `ModalHeader` → `ModalActions spacing="lg"` with a `danger` confirm
(`isPending`) and a `ghost` cancel (`isDisabled={isPending}`). No `panelClassName`.

Export all four from `packages/ui/src/index.ts`.

**Steps**
1. Write the four files.
2. Export from `index.ts`.
3. `pnpm -w exec tsc -b`.
4. **Parity probe (blocking).** Temporary browser test in `packages/ui/src/dialogs/` mounting the current
   `RemoveCharacterModal` and an equivalent `ConfirmModal`, dumping panel width/padding/gap, `h2`
   size/weight/margin, both `p` colour/size/margin, and the actions gap/margin via
   `throw new Error(JSON.stringify(...))`. Every value must match. Delete the probe and its
   `__screenshots__` afterwards.
5. **Approval gate** — report the probe numbers before touching any consumer.

## Task 2 — migrate the five `packages/ui` confirm modals (zero visual change)

`RemoveCharacterModal`, `RemoveGroupModal`, `RemovePlaceModal`, `RemoveAttachmentModal`.
`DeleteScriptModal` is **not** a plain confirm — its body is `DeleteScriptConfirm` with a
`secondaryAction` slot, so per M5 it keeps `ModalDialog` + `ModalHeader` and its own body.

**Steps**
1. `RemovePlaceModal` and `RemoveAttachmentModal` → `ConfirmModal` (`isRemoving` → `isPending`,
   `onClose` unguarded). Delete `RemovePlaceModal.module.css` and `RemoveAttachmentModal.module.css`.
2. `RemoveCharacterModal` → `ConfirmModal` with `notes={[...]}`, the group-membership note pushed
   conditionally. Delete `RemoveCharacterModal.module.css`.
3. `RemoveGroupModal` → `ConfirmModal`; it currently imports `RemoveCharacterModal.module.css`, so
   that cross-file import goes away with it.
4. `DeleteScriptModal` → `ModalHeader`; keep `.body` in its own module, drop `.title`/`.subtitle`.
5. `pnpm -w exec tsc -b`; `vp test run` and `vp test run -c vitest.browser.config.ts` in `packages/ui`.

## Task 3 — migrate the four `packages/app-routes` confirm modals (approved normalization M2)

`DeleteMusicModal`, `UnassignMusicModal`, `DeleteSceneHeadingModal`, `ConvertSceneHeadingModal`.

**Steps**
1. Measure the four at HEAD (patch round-trip if the tree is dirty) — panel width, `h2` size/weight,
   `p` size/colour/margin, actions gap/margin. Record in the audit.
2. Rewrite each as `ConfirmModal`. `DeleteMusicModal`, `DeleteSceneHeadingModal` and
   `ConvertSceneHeadingModal` pass `lockWhilePending` (they guard `onClose` on `isDeleting`/`isConverting`
   today); `UnassignMusicModal` does not. `DeleteMusicModal`'s `<strong>` inside the description is
   preserved verbatim, including its surrounding spaces.
3. Delete `DeleteMusicModal.module.css`, `DeleteSceneHeadingModal.module.css`,
   `ConvertSceneHeadingModal.module.css`.
4. Re-measure and record the deltas against step 1 — they must be exactly the M2 list and nothing else.
5. `DeleteSceneHeadingModal.browser.test.tsx` asserts copy and behaviour only; it must stay green
   unmodified.

## Task 4 — form modals adopt the header/footer slots (M5)

`AddCharacterModal`, `AddMusicModal` (app-routes); `CreateCharacterModal`, `CreateGroupModal`,
`CreatePlaceModal`, `NewScriptModal`, `RenameScriptModal`, `DuplicateScriptModal`, `ImportScriptModal`
(ui). The `<form>` body of each stays exactly as it is.

**Steps**
1. Per file: `<h2 className={styles.title}>` → `<ModalHeader title=… description=… />`;
   `<div className={styles.actions}>` → `<ModalActions>`. Delete the now-unused `.title`, `.subtitle`
   and `.actions` from each module; keep `.form`, `.field`, `.label`, `.input`, `.error` and every
   body-specific class.
2. `dialogForm.module.css` should be left with `.form`, `.label`, `.input` once no module composes
   `.title`/`.subtitle`/`.actions` from it — delete those three rules and confirm no `composes:`
   references remain.
3. Note the one real divergence: `dialogForm .form` carries `margin-top: var(--space-md)` and the
   420px group does not. `.form` is body, not chrome — leave both as they are.
4. `pnpm -w exec tsc -b`; both test suites in both packages.

## Task 5 — delete the dead panel CSS (M3)

Measured dead (consumer `.panel` is 0-1-0, `ModalDialog`'s `.dialog & .panel` is 0-2-0):

```
app-routes  editor/scene/DeleteSceneHeadingModal .panel      (module deleted in Task 3)
            editor/scene/ConvertSceneHeadingModal .panel     (module deleted in Task 3)
            editor/music/DeleteMusicModal .panel             (module deleted in Task 3)
            editor/music/AddMusicModal .panel
            editor/characters/AddCharacterModal .panel
ui          dialogs/CreateCharacterModal .panel
            dialogs/CreatePlaceModal .panel
            dialogs/ImportScriptModal .modal                 (all 9 declarations inert)
```

**Steps**
1. Delete each rule and the matching `panelClassName={styles.panel}` / `={styles.modal}` prop.
   `CreateGroupModal` also passes `styles.panel` from `CreateCharacterModal.module.css`.
2. Leave `ScriptSettingsModal` alone — it overrides through `--modal-panel-*` custom properties, which
   is the channel that actually works.
3. Probe: `ImportScriptModal` and one 420px form modal must still render at 520px with 30.24px padding
   and 12.96px gap.

## Task 6 — notices and the preview modal

**Steps**
1. `IntegratedScoreWarning` — no change. Confirm it still uses `Notice variant="warning"` and that
   `.warningExtras` is local layout only.
2. `DraftSaveError` — no change (M4). Record the reasoning in the audit residue table.
3. `MusicAttachmentPreviewModal` — body stays custom (M5). Tokenize its header only:
   `.title` `16px` → `var(--font-size-lg)`, `600` → `var(--font-weight-semibold)`;
   `.header` `margin-block-end: 12px` → `var(--space-lg)`; `.body`/`.pages`/`.page`/`.overlay`/`.message`
   raw px → tokens where a token matches exactly. Measure before and after and record the sub-pixel
   deltas (16 → 16.2px, 12 → 12.96px). If any delta is larger than that, stop and report instead.
4. `ScriptAttributeManagerModal` — out of scope (Finding E). Record it as a stale spec row.

## Task 7 — close-out

1. `pnpm -w exec tsc -b`.
2. `eslint --fix` and `stylelint --fix` over every touched file.
3. `vp test run` and `vp test run -c vitest.browser.config.ts` in `packages/ui` and `packages/app-routes`.
   Known pre-existing reds, to be reported and not fixed: browser
   `ScriptExportRoute.browser.test.tsx > export character filter > renders exact-kind character catalog
   rows only`; node `prepareExampleScriptDocument.test.ts > prepares the example source as a two-act
   musical with linked-ready characters`; and `useScriptEditorSettingsDraft.browser.test.tsx > retains
   toggle and formatting changes after failure and retries them together`, which fails only on
   full-directory runs, identically at HEAD.
4. Orphan-class grep over every touched module. Remember `styles[...]` dynamic lookups and import
   aliases produce false positives — verify each hit before calling it dead.
5. Append a step 5 close-out table and a residue list to the audit doc.
6. **Prepare** the commit message. Do not commit.
