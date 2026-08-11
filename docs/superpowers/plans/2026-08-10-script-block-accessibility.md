# Script Block Accessibility Implementation Plan

> **For agentic workers:** Execute inline with test-first steps. Do not commit: project rules reserve commits for the user.

**Goal:** Expose every script block's canonical type to assistive technology while preserving paragraph DOM and pagination behavior.

**Architecture:** `createScriptNode` derives an ARIA role description from the canonical `BLOCK_ITEMS` list and writes it into both its stable node view and serialized HTML. The existing `blocktype` attribute remains unchanged. The real mini-editor fixture verifies the live DOM contract and the serializer verifies exported HTML.

**Tech Stack:** TypeScript, Tiptap/ProseMirror, React browser tests, vite-plus.

## Global Constraints

- Keep the rendered element as `<p>`; do not change the stored `ScriptDocument` or its schema version.
- Preserve the existing `blocktype` attribute and all pagination behavior.
- Use `aria-roledescription`, not `aria-label`, so the block's text stays available to assistive technology.
- No commits.

---

### Task 1: Render canonical block role descriptions

**Files:**
- Modify: `packages/editor/src/editor/tiptap/nodes/createScriptNode.ts`
- Modify: `packages/editor/src/editor/mini/MiniScriptEditor.browser.test.tsx`
- Modify: `TODO.md`

**Interfaces:**
- Consumes: `BLOCK_ITEMS` entries with `nodeType` and `label` from `@stagistic/script`.
- Produces: `p[blocktype]` elements with an `aria-roledescription` equal to their canonical block label.

- [ ] **Step 1: Write failing browser test**

```ts
expect(Array.from(editor.querySelectorAll<HTMLElement>('p[blocktype]'))).toEqual([
    expect.objectContaining({tagName: 'P'}),
]);
expect(editor.querySelector('p[blocktype="scene"]')?.getAttribute('aria-roledescription'))
    .toBe('Scene');
```

Add literal assertions for all eight block types. The test must fail if the
node view omits a description or uses the wrong label.

- [ ] **Step 2: Verify the failing test**

Run: `pnpm --filter @stagistic/editor test:browser MiniScriptEditor.browser.test.tsx`

Expected: FAIL because every `aria-roledescription` is `null`.

- [ ] **Step 3: Implement the minimal renderer change**

```ts
const BLOCK_ROLE_DESCRIPTION_BY_TYPE = Object.fromEntries(
    BLOCK_ITEMS.map(item => [item.nodeType, item.label]),
) as Record<ScriptBlockNodeType, string>;
```

Use the normalized block type to include `aria-roledescription` in the
attributes merged into the stable node view and in `renderHTML`.

- [ ] **Step 4: Verify live DOM and serialized HTML**

Run: `pnpm --filter @stagistic/editor test:browser MiniScriptEditor.browser.test.tsx`

Expected: PASS.

Add and run a focused unit assertion against `editor.getHTML()` that proves
serialized HTML includes the same role description.

- [ ] **Step 5: Mark the resolved finding**

Change B7 in `TODO.md` to complete and record the concrete ARIA contract.

- [ ] **Step 6: Run final checks**

Run:

```sh
pnpm --filter @stagistic/editor typecheck
pnpm --filter @stagistic/editor test
pnpm --filter @stagistic/editor test:browser
git diff --check
```

Expected: commands exit 0, aside from the documented pre-existing browser
failure if it remains unrelated to this change.
