import '@stagistic/ui/styles/base.css';

import {COMMENT_ANCHOR_MARK_NAME, type ScriptDocument, type ScriptNode} from '@stagistic/script';
import {TextSelection} from '@tiptap/pm/state';
import type {Editor} from '@tiptap/react';
import {useEffect} from 'react';
import {createRoot, type Root} from 'react-dom/client';
import {afterEach, describe, expect, it, vi} from 'vite-plus/test';
import {page} from 'vite-plus/test/browser';

import {useEditorInstance} from '../context';
import type {EditorProps} from '../contracts';
import ScriptEditor from '../Editor';
import {type EditorCommentThreadRef, getCommentsState} from '../tiptap/extensions/comments';
import {findScriptBlockByIdFromState} from '../tiptap/scriptCore';
import {resolveMusicRailLeft} from './musicRange/musicRailDom';

type CommentTestWindow = Window & {__commentTestEditor?: Editor | null};

const dialogue = (id: string, text: string, threadIds: readonly string[] = []): ScriptNode => ({
    type: 'dialogue',
    attrs: {id},
    content: [
        {
            type: 'text',
            text,
            ...(threadIds.length > 0 ? {marks: threadIds.map(threadId => ({type: COMMENT_ANCHOR_MARK_NAME, attrs: {threadId}}))} : {}),
        },
    ],
});

const createDocument = (blocks: ScriptNode[] = [dialogue('b1', 'Hello world'), dialogue('b2', 'Second line')]): ScriptDocument => ({
    type: 'doc',
    content: blocks,
});

const openRange = (id: string): EditorCommentThreadRef => ({id, status: 'open', anchorKind: 'range', anchorBlockId: null});

const EditorProbe = () => {
    const editor = useEditorInstance();

    useEffect(() => {
        (window as CommentTestWindow).__commentTestEditor = editor;

        return () => {
            delete (window as CommentTestWindow).__commentTestEditor;
        };
    }, [editor]);

    return null;
};

const mountedRoots: Root[] = [];

interface MountOptions {
    content?: ScriptDocument;
    commentThreads?: readonly EditorCommentThreadRef[];
    callbacks?: EditorProps['callbacks'];
}

const renderScriptEditor = (root: Root, options: MountOptions) => {
    root.render(
        <ScriptEditor
            document={{initialValue: options.content ?? createDocument(), commentThreads: options.commentThreads}}
            callbacks={options.callbacks}
            layout={{autoFocus: true}}
            editorZoom={1}
        >
            <ScriptEditor.LeftSidebar>
                <EditorProbe />
            </ScriptEditor.LeftSidebar>
        </ScriptEditor>,
    );
};

const poll = async <T,>(get: () => T | null | undefined, label: string): Promise<T> => {
    const deadline = Date.now() + 2000;

    while (Date.now() < deadline) {
        const value = get();

        if (value) {
            return value;
        }

        await new Promise(resolve => window.setTimeout(resolve, 10));
    }

    throw new Error(`Timed out waiting for ${label}`);
};

const mountEditor = async (options: MountOptions = {}) => {
    const host = document.createElement('div');

    host.style.width = '1024px';
    host.style.height = '720px';
    document.body.appendChild(host);

    const root = createRoot(host);

    mountedRoots.push(root);
    renderScriptEditor(root, options);

    const editor = await poll(() => (window as CommentTestWindow).__commentTestEditor ?? null, 'editor instance');

    return {
        editor,
        rerender: (next: MountOptions) => renderScriptEditor(root, {...options, ...next}),
    };
};

const placeCaret = (editor: Editor, blockId: string) => {
    const block = findScriptBlockByIdFromState(editor.state, blockId);

    if (!block) {
        throw new Error(`Block "${blockId}" not found`);
    }

    editor.view.dispatch(editor.state.tr.setSelection(TextSelection.create(editor.state.doc, block.from)));
    editor.commands.focus();
};

const findMenuItem = (label: string) =>
    Array.from(document.querySelectorAll<HTMLElement>('[role="menuitem"]')).find(item => {
        const accessibleLabel = item.getAttribute('aria-label') ?? item.textContent?.trim();

        return accessibleLabel === label || accessibleLabel?.startsWith(label);
    }) ?? null;

afterEach(() => {
    mountedRoots.forEach(root => root.unmount());
    mountedRoots.length = 0;
    document.body.innerHTML = '';
});

describe('comment host contract', () => {
    it('offers "Add comment" in the block gutter menu and starts a block draft', async () => {
        const onRequestRevealComments = vi.fn();
        const {editor} = await mountEditor({callbacks: {onRequestRevealComments}});

        placeCaret(editor, 'b1');

        const trigger = await poll(() => document.querySelector<HTMLButtonElement>('[data-block-action-trigger="true"][data-block-id="b1"]'), 'action trigger');

        await page.elementLocator(trigger).click();
        await page.elementLocator(await poll(() => findMenuItem('Add comment'), 'Add comment item')).click();

        expect(getCommentsState(editor.state).draft).toMatchObject({kind: 'block', blockId: 'b1'});
        expect(onRequestRevealComments).toHaveBeenCalledTimes(1);
    });

    it('pushes host thread refs into the editor', async () => {
        const {editor, rerender} = await mountEditor({commentThreads: []});

        rerender({commentThreads: [{id: 't1', status: 'open', anchorKind: 'block', anchorBlockId: 'b1'}]});

        await poll(() => getCommentsState(editor.state).anchors.get('t1'), 'block anchor');
        expect(getCommentsState(editor.state).anchors.get('t1')?.blockId).toBe('b1');
    });

    it('reports underline clicks to the host', async () => {
        const onCommentAnchorClick = vi.fn();
        const {editor} = await mountEditor({
            content: createDocument([dialogue('b1', 'Hello', ['t1'])]),
            commentThreads: [openRange('t1')],
            callbacks: {onCommentAnchorClick},
        });

        await poll(() => getCommentsState(editor.state).threads.get('t1'), 'thread refs');
        editor.view.someProp('handleClick', handler => handler(editor.view, 3, new MouseEvent('click')));

        expect(onCommentAnchorClick).toHaveBeenCalledWith(['t1']);
    });
});

const selectionToolbar = () => document.querySelector<HTMLElement>('[role="toolbar"][aria-label="Selection actions"]');

const toolbarButton = (label: string) =>
    Array.from(selectionToolbar()?.querySelectorAll<HTMLButtonElement>('button') ?? []).find(button => button.textContent?.trim() === label) ?? null;

const selectRange = (editor: Editor, from: number, to: number) => {
    editor.commands.focus();
    editor.view.dispatch(editor.state.tr.setSelection(TextSelection.create(editor.state.doc, from, to)));
};

describe('selection toolbar', () => {
    it('shows for a text selection and starts a range draft from Comment', async () => {
        const onRequestRevealComments = vi.fn();
        const {editor} = await mountEditor({callbacks: {onRequestRevealComments}});

        selectRange(editor, 2, 6);
        await page.elementLocator(await poll(() => toolbarButton('Comment'), 'Comment button')).click();

        expect(getCommentsState(editor.state).draft).toMatchObject({kind: 'range', blockId: 'b1'});
        expect(onRequestRevealComments).toHaveBeenCalledTimes(1);
        await poll(() => (selectionToolbar() ? null : true), 'toolbar hidden during draft');
    });

    it('copies the selected text without collapsing the selection', async () => {
        const {editor} = await mountEditor();
        const writeText = vi.spyOn(navigator.clipboard, 'writeText').mockResolvedValue();

        selectRange(editor, 2, 6);
        await page.elementLocator(await poll(() => toolbarButton('Copy'), 'Copy button')).click();

        expect(writeText).toHaveBeenCalledWith(editor.state.doc.textBetween(2, 6, '\n'));
        expect(editor.state.selection.empty).toBe(false);
    });

    it('is absent for an empty selection', async () => {
        const {editor} = await mountEditor();

        selectRange(editor, 3, 3);
        await new Promise(resolve => window.setTimeout(resolve, 50));

        expect(selectionToolbar()).toBeNull();
    });
});

const marker = (blockId: string) => document.querySelector<HTMLButtonElement>(`[data-comment-marker-block-id="${blockId}"]`);

describe('comment margin markers', () => {
    it('renders one marker per block with open comments, with a count above one', async () => {
        await mountEditor({
            content: createDocument([dialogue('b1', 'Hello', ['t1', 't2']), dialogue('b2', 'Other', ['t3'])]),
            commentThreads: [openRange('t1'), openRange('t2'), {...openRange('t3'), status: 'resolved'}],
        });

        const b1 = await poll(() => marker('b1'), 'b1 marker');

        expect(b1.textContent).toBe('2');
        expect(b1.getAttribute('aria-label')).toBe('2 comments');
        expect(marker('b2')).toBeNull();
    });

    it('marks block-anchored threads too, without a count for one', async () => {
        await mountEditor({commentThreads: [{id: 'tb', status: 'open', anchorKind: 'block', anchorBlockId: 'b2'}]});

        const b2 = await poll(() => marker('b2'), 'b2 marker');

        expect(b2.textContent).toBe('');
        expect(b2.getAttribute('aria-label')).toBe('1 comment');
    });

    it('clicking a marker activates the first thread and requests reveal', async () => {
        const onRequestRevealComments = vi.fn();
        const {editor} = await mountEditor({
            content: createDocument([dialogue('b1', 'Hello', ['t1'])]),
            commentThreads: [openRange('t1')],
            callbacks: {onRequestRevealComments},
        });

        await page.elementLocator(await poll(() => marker('b1'), 'b1 marker')).click();

        expect(getCommentsState(editor.state).activeThreadId).toBe('t1');
        expect(onRequestRevealComments).toHaveBeenCalledTimes(1);
    });

    it('clicking an underline reports the click but never requests reveal', async () => {
        const onRequestRevealComments = vi.fn();
        const onCommentAnchorClick = vi.fn();

        await mountEditor({
            content: createDocument([dialogue('b1', 'Hello', ['t1'])]),
            commentThreads: [openRange('t1')],
            callbacks: {onRequestRevealComments, onCommentAnchorClick},
        });

        await page.elementLocator(await poll(() => document.querySelector<HTMLElement>('[data-comment-anchor="t1"]'), 'underline')).click();

        expect(onCommentAnchorClick).toHaveBeenCalledWith(['t1']);
        expect(onRequestRevealComments).not.toHaveBeenCalled();
    });
});

describe('comment indicators', () => {
    it('never draws a block-edge line; the active block comment lights its marker instead', async () => {
        const {editor} = await mountEditor({commentThreads: [{id: 'tb', status: 'open', anchorKind: 'block', anchorBlockId: 'b1'}]});

        await poll(() => marker('b1'), 'b1 marker');
        editor.commands.setActiveCommentThread('tb');

        await poll(() => marker('b1')?.dataset.active === 'true', 'active marker');
        expect(document.querySelector('[data-comment-block-highlight]')).toBeNull();
        expect(getComputedStyle(editor.view.nodeDOM(0) as HTMLElement).boxShadow).toBe('none');
    });

    it('shows an active marker on the block of an unsaved block draft', async () => {
        const {editor} = await mountEditor();

        editor.chain().setTextSelection(3).startCommentDraft().run();

        const draftMarker = await poll(() => marker('b1'), 'draft marker');

        expect(draftMarker.dataset.active).toBe('true');
    });

    it('keeps the marker clear of the music rail', async () => {
        await mountEditor({commentThreads: [{id: 'tb', status: 'open', anchorKind: 'block', anchorBlockId: 'b1'}]});

        const rect = (await poll(() => marker('b1'), 'b1 marker')).getBoundingClientRect();
        const canvas = document.querySelector<HTMLElement>('[data-editor-scroll-container="true"]')!;
        const railX = canvas.getBoundingClientRect().left + resolveMusicRailLeft(canvas) - canvas.scrollLeft;

        expect(rect.left - railX).toBeGreaterThanOrEqual(4);
        expect(rect.width).toBeLessThanOrEqual(8);
    });
});
