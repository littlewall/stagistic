import {
    Fragment,
    type Node as ProseMirrorNode,
    Slice,
} from '@tiptap/pm/model';
import type {EditorState} from '@tiptap/pm/state';

/*
 * Q23: a block never starts with whitespace. Typing and paste strip it; the projection trims
 * block text on save (packages/db/src/blocks/extract.ts).
 */

export const stripLeadingWhitespace = (text: string) => text.replace(/^\s+/, '');

export const isAtBlockStart = (state: EditorState, position: number) => state.doc.resolve(position).parentOffset === 0;

const stripFragmentStart = (fragment: Fragment): Fragment => {
    const first = fragment.firstChild;

    if (!first) {
        return fragment;
    }

    if (first.isText) {
        const text = stripLeadingWhitespace(first.text ?? '');

        if (text.length === 0) {
            return stripFragmentStart(fragment.cut(first.nodeSize));
        }

        return fragment.replaceChild(0, first.type.schema.text(text, first.marks));
    }

    if (first.isLeaf) {
        return fragment;
    }

    return fragment.replaceChild(0, first.copy(stripFragmentStart(first.content)));
};

const stripNodeStart = (node: ProseMirrorNode) => (node.isText || node.isLeaf ? node : node.copy(stripFragmentStart(node.content)));

/**
 * Drops leading whitespace of every block a paste creates, and of its first line when the
 * caret sits at a block start (otherwise that line continues existing text).
 */
export const stripPastedLeadingWhitespace = (slice: Slice, state: EditorState) => {
    const startsBlock = slice.openStart === 0 || isAtBlockStart(state, state.selection.from);
    const isInlineSlice = slice.content.firstChild?.isInline ?? false;

    if (isInlineSlice) {
        return startsBlock ? new Slice(stripFragmentStart(slice.content), slice.openStart, slice.openEnd) : slice;
    }

    const blocks: ProseMirrorNode[] = [];

    slice.content.forEach((node, _offset, index) => {
        blocks.push(index === 0 && !startsBlock ? node : stripNodeStart(node));
    });

    return new Slice(Fragment.fromArray(blocks), slice.openStart, slice.openEnd);
};
