import '@stagistic/ui/styles/base.css';

import {COMMENT_ANCHOR_MARK_NAME, type ScriptDocument} from '@stagistic/script';
import {createNodeId} from '@stagistic/script';
import {Editor, Extension, type Extensions} from '@tiptap/core';
import History from '@tiptap/extension-history';
import Text from '@tiptap/extension-text';
import UniqueID from '@tiptap/extension-unique-id';
import {Plugin} from '@tiptap/pm/state';
import {afterEach, describe, expect, it, vi} from 'vite-plus/test';

import {CommentAnchorMark} from '../../marks';
import {SCRIPT_BLOCK_NODE_NAMES, ScriptBlockNodes} from '../../nodes';
import {DocumentWithSettings} from '../DocumentExtension';
import {CommentsExtension, getCommentsState} from './CommentsExtension';
import type {CommentsExtensionCallbacks} from './types';

const editors: Editor[] = [];

const anchoredDoc = (): ScriptDocument => ({
    type: 'doc',
    content: [
        {
            type: 'dialogue',
            attrs: {id: 'b1'},
            content: [
                {type: 'text', text: 'Hello '},
                {type: 'text', text: 'world', marks: [{type: COMMENT_ANCHOR_MARK_NAME, attrs: {threadId: 't1'}}]},
            ],
        },
    ],
});

const createCommentsTestEditor = (content: ScriptDocument = anchoredDoc(), extraExtensions: Extensions = []) => {
    const element = document.createElement('div');

    document.body.appendChild(element);

    const editor = new Editor({
        element,
        extensions: [
            DocumentWithSettings,
            Text,
            History,
            CommentAnchorMark,
            ...ScriptBlockNodes,
            UniqueID.configure({types: [...SCRIPT_BLOCK_NODE_NAMES], attributeName: 'id', generateID: () => createNodeId()}),
            ...extraExtensions,
        ],
        content,
    });

    editors.push(editor);

    return editor;
};

afterEach(() => {
    editors.forEach(editor => editor.destroy());
    editors.length = 0;
    document.body.innerHTML = '';
});

const collectThreadIds = (editor: Editor) => {
    const ids = new Set<string>();

    editor.state.doc.descendants(node => {
        node.marks.filter(mark => mark.type.name === COMMENT_ANCHOR_MARK_NAME).forEach(mark => ids.add(String(mark.attrs.threadId)));
    });

    return [...ids].sort();
};

describe('CommentAnchorMark', () => {
    it('round-trips a commentAnchor mark through getJSON and renders a thread id span', () => {
        const editor = createCommentsTestEditor();
        const json = editor.getJSON() as ScriptDocument;

        expect(json.content[0].content?.[1].marks).toEqual([{type: COMMENT_ANCHOR_MARK_NAME, attrs: {threadId: 't1'}}]);
        expect(editor.view.dom.querySelector('[data-comment-thread-id="t1"]')?.textContent).toBe('world');
    });

    it('does not extend the anchor when typing at its end', () => {
        const editor = createCommentsTestEditor();
        const end = editor.state.doc.content.size - 1;

        editor.chain().setTextSelection(end).insertContent('!').run();

        expect(editor.view.dom.querySelector('[data-comment-thread-id="t1"]')?.textContent).toBe('world');
    });

    it('keeps two overlapping anchors', () => {
        const editor = createCommentsTestEditor();

        editor.chain().setTextSelection({from: 2, to: 10}).setMark(COMMENT_ANCHOR_MARK_NAME, {threadId: 't2'}).run();

        expect(collectThreadIds(editor)).toEqual(['t1', 't2']);
    });

    it('strips anchors from pasted content', () => {
        const editor = createCommentsTestEditor();
        let pasted = editor.state.doc.slice(1, editor.state.doc.content.size - 1);

        // ProseMirror chains every plugin's transformPasted; someProp stops at the first truthy result.
        editor.view.someProp('transformPasted', transform => {
            pasted = transform(pasted, editor.view, false);
        });
        let hasAnchor = false;

        pasted.content.descendants(node => {
            hasAnchor ||= node.marks.some(mark => mark.type.name === COMMENT_ANCHOR_MARK_NAME);
        });

        expect(hasAnchor).toBe(false);
    });
});

const withComments = (content?: ScriptDocument, extraExtensions: Extensions = []) => {
    const callbacks = {
        onRequestReveal: vi.fn<NonNullable<CommentsExtensionCallbacks['onRequestReveal']>>(),
        onAnchorClick: vi.fn<NonNullable<CommentsExtensionCallbacks['onAnchorClick']>>(),
        onBlocksMerged: vi.fn<NonNullable<CommentsExtensionCallbacks['onBlocksMerged']>>(),
    };
    const editor = createCommentsTestEditor(content, [CommentsExtension.configure({getCallbacks: () => callbacks}), ...extraExtensions]);

    editor.commands.setCommentThreads([{id: 't1', status: 'open', anchorKind: 'range', anchorBlockId: null}]);

    return {editor, callbacks};
};

const twoBlocks = (): ScriptDocument => ({
    type: 'doc',
    content: [
        {type: 'dialogue', attrs: {id: 'b1'}, content: [{type: 'text', text: 'One'}]},
        {type: 'dialogue', attrs: {id: 'b2'}, content: [{type: 'text', text: 'Two'}]},
    ],
});

describe('CommentsExtension', () => {
    it('decorates open anchors and hides resolved ones', () => {
        const {editor} = withComments();

        expect(editor.view.dom.querySelector('[data-comment-anchor="t1"]')).not.toBeNull();
        editor.commands.setCommentThreads([{id: 't1', status: 'resolved', anchorKind: 'range', anchorBlockId: null}]);
        expect(editor.view.dom.querySelector('[data-comment-anchor="t1"]')).toBeNull();
    });

    it('does not decorate anchors of unknown threads', () => {
        const {editor} = withComments();

        editor.commands.setCommentThreads([]);
        expect(editor.view.dom.querySelector('[data-comment-anchor]')).toBeNull();
    });

    it('starts a range draft from a selection, reveals, and commits a mark outside history', () => {
        const {editor, callbacks} = withComments();

        editor.chain().setTextSelection({from: 1, to: 6}).startCommentDraft().run();
        expect(getCommentsState(editor.state).draft).toMatchObject({kind: 'range', blockId: 'b1', quotedText: 'Hello'});
        expect(callbacks.onRequestReveal).toHaveBeenCalledTimes(1);

        editor.commands.commitCommentDraft('t9');
        expect(getCommentsState(editor.state).draft).toBeNull();
        expect(getCommentsState(editor.state).anchors.get('t9')).toMatchObject({kind: 'range', from: 1, to: 6});
        expect(getCommentsState(editor.state).activeThreadId).toBe('t9');

        editor.commands.undo();
        expect(getCommentsState(editor.state).anchors.has('t9')).toBe(true);
    });

    it('starts a block draft from a caret', () => {
        const {editor} = withComments();

        editor.chain().setTextSelection(3).startCommentDraft().run();
        expect(getCommentsState(editor.state).draft).toMatchObject({kind: 'block', blockId: 'b1', quotedText: 'Hello world'});

        editor.commands.commitCommentDraft('tb');
        expect(getCommentsState(editor.state).activeThreadId).toBe('tb');
        expect(collectThreadIds(editor)).toEqual(['t1']);
    });

    it('opens a draft with Mod-Alt-m and does not insert the Option character', () => {
        const {editor} = withComments();

        editor.chain().focus().setTextSelection(3).run();
        const isMac = /Mac|iPhone|iPad/.test(navigator.platform);

        editor.view.dom.dispatchEvent(
            new KeyboardEvent('keydown', {
                key: 'µ',
                code: 'KeyM',
                keyCode: 77,
                altKey: true,
                metaKey: isMac,
                ctrlKey: !isMac,
                bubbles: true,
                cancelable: true,
            }),
        );

        expect(getCommentsState(editor.state).draft).not.toBeNull();
        expect(editor.getText()).not.toContain('µ');
    });

    it('cancels a draft without touching the document', () => {
        const {editor} = withComments();
        const before = JSON.stringify(editor.getJSON());

        editor.chain().setTextSelection({from: 1, to: 6}).startCommentDraft().cancelCommentDraft().run();
        expect(getCommentsState(editor.state).draft).toBeNull();
        expect(JSON.stringify(editor.getJSON())).toBe(before);
    });

    it('undo restores a deleted range anchor', () => {
        const {editor} = withComments();

        editor.chain().setTextSelection({from: 7, to: 12}).deleteSelection().run();
        expect(getCommentsState(editor.state).anchors.has('t1')).toBe(false);

        editor.commands.undo();
        expect(getCommentsState(editor.state).anchors.has('t1')).toBe(true);
    });

    it('tombstone range maps through later edits and restores', () => {
        const {editor} = withComments();

        editor.commands.removeCommentAnchor('t1');
        expect(getCommentsState(editor.state).anchors.has('t1')).toBe(false);

        editor.chain().setTextSelection(1).insertContent('Oh, ').run();
        editor.commands.restoreCommentAnchor('t1');

        const anchor = getCommentsState(editor.state).anchors.get('t1');

        expect(anchor && editor.state.doc.textBetween(anchor.from, anchor.to)).toBe('world');
    });

    it('reports an underline click without swallowing caret placement', () => {
        const {editor, callbacks} = withComments();
        const handled = editor.view.someProp('handleClick', handler => handler(editor.view, 9, new MouseEvent('click')));

        expect(handled).toBeFalsy();
        expect(callbacks.onAnchorClick).toHaveBeenCalledWith(['t1']);
    });

    it('tints the whole block while its block comment is active or drafted', () => {
        const {editor} = withComments();
        const tinted = () => Array.from(editor.view.dom.querySelectorAll<HTMLElement>('[data-comment-block-active]')).map(element => element.textContent);

        editor.commands.setCommentThreads([
            {id: 't1', status: 'open', anchorKind: 'range', anchorBlockId: null},
            {id: 'tb', status: 'open', anchorKind: 'block', anchorBlockId: 'b1'},
        ]);
        expect(tinted()).toEqual([]);

        editor.commands.setActiveCommentThread('tb');
        expect(tinted()).toEqual(['Hello world']);

        // Hovering the block's marker tints lighter, and never over the active tint.
        const hoveredBlocks = () => editor.view.dom.querySelectorAll('[data-comment-block-hovered]').length;

        editor.commands.setHoveredCommentBlock('b1');
        expect(hoveredBlocks()).toBe(0);
        editor.chain().setActiveCommentThread(null).run();
        expect(tinted()).toEqual([]);
        expect(hoveredBlocks()).toBe(1);
        editor.chain().setHoveredCommentBlock(null).setActiveCommentThread('tb').run();

        // A range comment tints only its text, never the block.
        editor.commands.setActiveCommentThread('t1');
        expect(tinted()).toEqual([]);

        editor.chain().setActiveCommentThread(null).setTextSelection(3).startCommentDraft().run();
        expect(tinted()).toHaveLength(1);
    });

    it('keeps a block anchor on the first half when splitting mid-block', () => {
        const {editor} = withComments();

        editor.commands.setCommentThreads([{id: 'tb', status: 'open', anchorKind: 'block', anchorBlockId: 'b1'}]);
        editor.chain().setTextSelection(4).splitBlock().run();

        const anchor = getCommentsState(editor.state).anchors.get('tb');

        expect(anchor?.blockIndex).toBe(0);
        expect(editor.state.doc.textBetween(anchor!.from, anchor!.to)).toBe('Hel');
    });

    it('reports block merges on Backspace-join but not on undo', () => {
        const {editor, callbacks} = withComments(twoBlocks());

        editor.chain().setTextSelection(6).joinBackward().run();
        expect(callbacks.onBlocksMerged).toHaveBeenCalledWith([{fromBlockId: 'b2', toBlockId: 'b1'}]);

        callbacks.onBlocksMerged.mockClear();
        editor.commands.undo();
        expect(callbacks.onBlocksMerged).not.toHaveBeenCalled();
    });

    it('groups open threads by block in document order', () => {
        const {editor} = withComments();

        editor.commands.setCommentThreads([
            {id: 't1', status: 'open', anchorKind: 'range', anchorBlockId: null},
            {id: 'tb', status: 'open', anchorKind: 'block', anchorBlockId: 'b1'},
            {id: 'tr', status: 'resolved', anchorKind: 'block', anchorBlockId: 'b1'},
        ]);

        expect(getCommentsState(editor.state).openThreadIdsByBlockId.get('b1')).toEqual(['tb', 't1']);
    });

    it('still reports a merge when another plugin appends a doc change to the same step', () => {
        // Mimics CharacterRefSyncExtension: after any doc change it rewrites a block attr.
        const AppendAttrAfterChange = Extension.create({
            name: 'appendAttrAfterChange',
            addProseMirrorPlugins() {
                return [
                    new Plugin({
                        appendTransaction: (transactions, _oldState, newState) => {
                            if (!transactions.some(tr => tr.docChanged) || transactions.some(tr => tr.getMeta('appendAttr'))) {
                                return null;
                            }

                            return newState.tr.setNodeAttribute(0, 'characterRefs', {X: 'x'}).setMeta('appendAttr', true);
                        },
                    }),
                ];
            },
        });
        const {editor, callbacks} = withComments(twoBlocks(), [AppendAttrAfterChange]);

        editor.chain().setTextSelection(6).joinBackward().run();

        expect(callbacks.onBlocksMerged).toHaveBeenCalledWith([{fromBlockId: 'b2', toBlockId: 'b1'}]);
    });
});
