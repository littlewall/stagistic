# Music Pill Editor Regressions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix five music-pill regressions in stage directions, including a native Popover API pilot.

**Architecture:** Keep the stored ProseMirror document unchanged. Limit UI changes to the music start node view, transform only copied slices, derive sidebar assignment from the live document, and centralize semantic block-emptiness detection.

**Tech Stack:** React 19, TypeScript 5.9, Tiptap 3/ProseMirror, CSS Anchor Positioning, native Popover API, Vite Plus browser tests.

## Global Constraints

- `musicStart` copies as bold visible number plus title; `musicOut` copies as nothing.
- Character-tag marks remain structural and unchanged.
- The Popover API pilot applies only to the `musicStart` action menu.
- No database or stored `ScriptDocument` schema changes.
- Do not bump `SCRIPT_DOCUMENT_SCHEMA_VERSION`.
- Do not commit; leave changes for user review.
- Write and observe each failing regression test before production changes.

---

### Task 1: Native music menu and selection

**Files:**
- Create: `packages/editor/src/editor/tiptap/nodes/MusicPillMenuPopover.tsx`
- Create: `packages/editor/src/editor/tiptap/nodes/musicPillInteraction.browser.test.tsx`
- Modify: `packages/editor/src/editor/tiptap/nodes/MusicPill.tsx`
- Modify: `packages/editor/src/editor/tiptap/nodes/MusicPill.module.css`

**Interfaces:**
- Produces: `MusicPillMenuPopover({anchorName, isOpen, onOpenChange, children})`.
- Consumes: native `showPopover()`, `:popover-open`, `toggle`, and CSS `position-anchor`.

- [ ] **Step 1: Write failing browser tests**

Cover:

```tsx
it('anchors a wrapped native popover to the visual music pill', async () => {
    // Render constrained-width stage-direction prose ending with musicStart.
    // Assert pill is on a lower line than the preceding prose.
    // Activate the pill and assert menu.matches(':popover-open').
    // Assert menuRect.bottom <= pillRect.top.
});

it('closes the native popover through Escape and clears active state', async () => {
    // Open, press Escape, then assert !menu.matches(':popover-open')
    // and data-music-active is absent.
});

it('allows the complete visible pill to participate in text selection', async () => {
    // Select the stage-direction contents and assert the DOM selection contains
    // both [data-music-number] and [data-music-title-input].
    // Assert computed userSelect for the visual body is "text".
});
```

- [ ] **Step 2: Run the tests and observe the expected failures**

Run:

```bash
pnpm --filter @stagistic/editor test:browser -- src/editor/tiptap/nodes/musicPillInteraction.browser.test.tsx
```

Expected: FAIL because the menu is not a native popover, is anchored to the outer wrapper, and the number inherits `user-select: none`.

- [ ] **Step 3: Add the focused native popover component**

Implement the focused state bridge:

```tsx
interface MusicPillMenuPopoverProps {
    anchorName: string,
    isOpen: boolean,
    onOpenChange: (isOpen: boolean) => void,
    children: ReactNode,
}

export const MusicPillMenuPopover = ({
    anchorName,
    isOpen,
    onOpenChange,
    children,
}: MusicPillMenuPopoverProps) => {
    const ref = useRef<HTMLSpanElement>(null);

    useEffect(() => {
        const element = ref.current;
        if (!element) return;
        if (isOpen && !element.matches(':popover-open')) element.showPopover();
        if (!isOpen && element.matches(':popover-open')) element.hidePopover();
    }, [isOpen]);

    return (
        <span
            ref={ref}
            popover="auto"
            className={styles.menu}
            style={{positionAnchor: anchorName}}
            onToggle={event => onOpenChange(event.currentTarget.matches(':popover-open'))}
            data-music-menu="start"
        >
            {children}
        </span>
    );
};
```

Use a sanitized `useId()` value for a unique dashed-ident anchor. Apply
`anchorName` to `.tagBody`, `positionAnchor` to the popover, and expose
`data-music-active` on the node-view root.

- [ ] **Step 4: Anchor and select the visual body**

Use top-layer-safe CSS:

```css
.menu {
    position: fixed;
    inset: auto;
    bottom: anchor(top);
    left: anchor(center);
    margin: 0;
    transform: translate(-50%, calc(var(--space-sm) * -1));
}

.tagBody {
    user-select: text;
}
```

Keep the outer wrapper's collapsible spaces out of selection and anchor
geometry.

- [ ] **Step 5: Run the browser test**

Run the Task 1 command again. Expected: all Task 1 tests PASS.

---

### Task 2: Clipboard-safe music representation

**Files:**
- Create: `packages/editor/src/editor/tiptap/scriptBlock/clipboard.ts`
- Create: `packages/editor/src/editor/tiptap/scriptBlock/clipboard.browser.test.tsx`
- Modify: `packages/editor/src/editor/tiptap/extensions/ScriptBehaviorExtension.ts`
- Modify: `packages/editor/src/editor/tiptap/extensions/musicNumbering/plugin.ts`

**Interfaces:**
- Produces: `transformCopiedScriptSlice(slice: Slice, state: EditorState): Slice`.
- Produces: `getMusicNumberLabelsById(state: EditorState): ReadonlyMap<string, string>`.
- Consumes: `musicStart` attrs, music-numbering decorations, schema `bold` mark.

- [ ] **Step 1: Write the failing clipboard regression test**

Create a document containing normal text, a character-tag mark, `musicStart`,
`musicOut`, and trailing text. Select it, invoke the registered
`transformCopied` prop, and assert:

```ts
expect(copiedJSON).not.toContain('"musicStart"');
expect(copiedJSON).not.toContain('"musicOut"');
expect(copiedJSON).toContain('"type":"bold"');
expect(copiedText).toContain('1.A) Overture');
expect(copiedCharacterText.marks).toContainEqual(expect.objectContaining({
    type: 'characterTag',
}));
```

- [ ] **Step 2: Run and observe failure**

```bash
pnpm --filter @stagistic/editor test:browser -- src/editor/tiptap/scriptBlock/clipboard.browser.test.tsx
```

Expected: FAIL because no `transformCopied` prop is registered.

- [ ] **Step 3: Expose current music-number labels**

Read numbering decorations and map their start nodes:

```ts
export const getMusicNumberLabelsById = (
    state: EditorState,
): ReadonlyMap<string, string> => {
    const labels = new Map<string, string>();
    const decorations = musicNumberingPluginKey.getState(state)?.decorations.find() ?? [];

    decorations.forEach(decoration => {
        const node = state.doc.nodeAt(decoration.from);
        const musicId = node?.attrs[MUSIC_ID_ATTR];
        const label = (decoration.spec as {musicNumber?: unknown}).musicNumber;

        if (typeof musicId === 'string' && typeof label === 'string') {
            labels.set(musicId, label);
        }
    });

    return labels;
};
```

- [ ] **Step 4: Transform copied fragments recursively**

Implement a recursive `Fragment` transform:

```ts
if (node.type.name === MUSIC_OUT_NODE_NAME) return;

if (node.type.name === MUSIC_START_NODE_NAME) {
    const number = labels.get(String(node.attrs[MUSIC_ID_ATTR] ?? '')) ?? '';
    const title = String(node.attrs[MUSIC_TITLE_ATTR] ?? '').trim();
    const label = [number, title].filter(Boolean).join(' ');
    const bold = state.schema.marks.bold?.create();

    if (label) nodes.push(state.schema.text(` ${label} `, bold ? [bold] : []));
    return;
}
```

Copy all other leaf nodes, text marks, and recursively transformed child
fragments unchanged. Preserve `Slice.openStart` and `Slice.openEnd`.

- [ ] **Step 5: Register `transformCopied`**

Add to `ScriptBehaviorExtension`:

```ts
transformCopied: (slice, view) => transformCopiedScriptSlice(slice, view.state),
```

- [ ] **Step 6: Run the clipboard test**

Run the Task 2 command again. Expected: PASS.

---

### Task 3: Immediate live sidebar assignment

**Files:**
- Modify: `packages/app-routes/src/routes/script/editor/music/ScriptMusicSidebar.browser.test.tsx`
- Modify: `packages/app-routes/src/routes/script/editor/music/ScriptMusicSidebar.tsx`

**Interfaces:**
- Consumes: `useEditorLiveMusic()` metadata.
- Produces: displayed rows whose assignment is true when the live document contains their `musicId`.

- [ ] **Step 1: Write the failing sidebar test**

Render an unassigned catalog row whose ID already appears in the editor document:

```tsx
mountSidebar({
    music: [{
        id: 'music-1',
        title: 'Overture',
        kind: 'instrumental',
        assignmentLabel: null,
    }],
});

expect(document.querySelector('[data-music-navigation="true"]')).not.toBeNull();
expect(document.querySelector('#music-unassigned')).toBeNull();
```

- [ ] **Step 2: Run and observe failure**

```bash
pnpm --filter @stagistic/app-routes test:browser -- src/routes/script/editor/music/ScriptMusicSidebar.browser.test.tsx
```

Expected: FAIL because classification uses only catalog `assignmentLabel`.

- [ ] **Step 3: Merge live assignment into displayed rows**

When live metadata exists, preserve its title and synthesize the existing
assignment sentinel:

```ts
const liveMusic = musicMetadataById.get(music.id);
if (!liveMusic) return music;

return {
    ...music,
    title: liveMusic.title.trim() || music.title,
    assignmentLabel: music.assignmentLabel ?? 'Assigned',
};
```

Keep existing order sorting and row rendering.

- [ ] **Step 4: Run the sidebar test**

Run the Task 3 command again. Expected: PASS.

---

### Task 4: Semantic empty-block Enter handling

**Files:**
- Modify: `packages/editor/src/editor/tiptap/scriptCore.ts`
- Modify: `packages/editor/src/editor/tiptap/scriptBlock/context.ts`
- Modify: `packages/editor/src/editor/tiptap/scriptBlock/handlers/enter.ts`
- Modify: `packages/editor/src/editor/tiptap/extensions/emptyEnterChooserState.ts`
- Modify: `packages/editor/src/editor/tiptap/nodes/musicNode.browser.test.tsx`

**Interfaces:**
- Produces: `isScriptBlockContentEmpty(node: ProseMirrorNode): boolean`.
- Consumes: block `textContent` and descendant node kinds.

- [ ] **Step 1: Change the existing regression test to one Enter**

Update the music-only stage-direction test:

```ts
await userEvent.keyboard('{Enter}');

expect(content?.length).toBe(2);
expect(musicOwnerBlockId(editor)).toBe('sd-1');
expect(getEmptyEnterChooserFromState(editor.state).isOpen).toBe(false);
```

- [ ] **Step 2: Run and observe failure**

```bash
pnpm --filter @stagistic/editor test:browser -- src/editor/tiptap/nodes/musicNode.browser.test.tsx
```

Expected: FAIL because the first Enter opens the empty-block chooser.

- [ ] **Step 3: Add semantic emptiness**

```ts
export const isScriptBlockContentEmpty = (node: ProseMirrorNode) => {
    if (node.textContent.trim().length > 0) return false;

    let hasNonTextContent = false;
    node.descendants(descendant => {
        if (descendant.isText) return true;
        hasNonTextContent = true;
        return false;
    });

    return !hasNonTextContent;
};
```

Use it in `handleEnter`, `isEmptyDialogueLikeBlock`, and the chooser plugin's
open-state validation. Whitespace-only text must remain empty.

- [ ] **Step 4: Run the Enter regression**

Run the Task 4 command again. Expected: PASS.

---

### Task 5: Integrated verification and graph update

**Files:**
- Update: `graphify-out/*` through `graphify update .`

- [ ] **Step 1: Run focused browser suites**

```bash
pnpm --filter @stagistic/editor test:browser -- \
  src/editor/tiptap/nodes/musicPillInteraction.browser.test.tsx \
  src/editor/tiptap/scriptBlock/clipboard.browser.test.tsx \
  src/editor/tiptap/nodes/musicNode.browser.test.tsx
pnpm --filter @stagistic/app-routes test:browser -- \
  src/routes/script/editor/music/ScriptMusicSidebar.browser.test.tsx
```

- [ ] **Step 2: Run package typechecks**

```bash
pnpm --filter @stagistic/editor typecheck
pnpm --filter @stagistic/app-routes typecheck
```

- [ ] **Step 3: Run lint on touched packages**

```bash
pnpm --filter @stagistic/editor lint
pnpm --filter @stagistic/app-routes lint
```

- [ ] **Step 4: Update the knowledge graph**

```bash
graphify update .
```

- [ ] **Step 5: Review without committing**

```bash
git diff --check
git status --short
git diff --stat
```

Report exact passing commands, any pre-existing failures, changed files, and a
suggested commit message. Leave all changes uncommitted.
