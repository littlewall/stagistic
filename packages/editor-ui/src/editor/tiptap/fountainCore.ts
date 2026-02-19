import type {FountainElementType} from '@stagistic/script-core';
import {
    createNodeId,
    FOUNTAIN_BLOCK_NODE_NAME,
    FOUNTAIN_COLUMN_GROUP_NODE_NAME,
    FOUNTAIN_COLUMN_NODE_NAME,
} from '@stagistic/script-core';
import type {Node as ProseMirrorNode, ResolvedPos} from '@tiptap/pm/model';
import type {EditorState} from '@tiptap/pm/state';
import type {Editor as TiptapEditor} from '@tiptap/react';

import {
    type FountainBlockType,
    isFountainBlockType,
    normalizeFountainBlockType,
} from '../blocks/fountain';

export {
    FOUNTAIN_BLOCK_NODE_NAME,
    FOUNTAIN_COLUMN_GROUP_NODE_NAME,
    FOUNTAIN_COLUMN_NODE_NAME,
};

export {
    FOUNTAIN_BLOCK_TYPES,
    type FountainBlockType,
    getFountainBlockClassName,
    getNextTypeOnEnter,
    isFountainBlockType,
    normalizeFountainBlockType,
} from '../blocks/fountain';

export type ActiveFountainBlock = {
    pos: number,
    from: number,
    to: number,
    node: ProseMirrorNode,
    blockType: FountainBlockType,
    id: string,
};

export const ensureFountainBlockId = (value: unknown) => {
    return typeof value === 'string' && value.length > 0 ? value : createNodeId();
};

const getFountainBlockAtResolvedPosition = (
    $position: ResolvedPos,
    nodeName: string,
): ActiveFountainBlock | null => {
    for (let depth = $position.depth; depth > 0; depth -= 1) {
        const node = $position.node(depth);

        if (node.type.name !== nodeName) {
            continue;
        }

        const pos = $position.before(depth);

        return {
            pos,
            from: pos + 1,
            to: pos + node.nodeSize - 1,
            node,
            blockType: normalizeFountainBlockType(node.attrs.blockType),
            id: ensureFountainBlockId(node.attrs.id),
        };
    }

    return null;
};

export const getActiveFountainBlockFromState = (
    state: EditorState,
    nodeName = FOUNTAIN_BLOCK_NODE_NAME,
) => getFountainBlockAtResolvedPosition(state.selection.$from, nodeName);

export const findFountainBlockByIdFromState = (
    state: EditorState,
    blockId: string,
    nodeName = FOUNTAIN_BLOCK_NODE_NAME,
): ActiveFountainBlock | null => {
    let resolvedBlock: ActiveFountainBlock | null = null;

    state.doc.descendants((node, pos) => {
        if (resolvedBlock) {
            return false;
        }

        if (node.type.name !== nodeName) {
            return true;
        }

        if (node.attrs?.id !== blockId) {
            return false;
        }

        resolvedBlock = {
            pos,
            from: pos + 1,
            to: pos + node.nodeSize - 1,
            node,
            blockType: normalizeFountainBlockType(node.attrs.blockType),
            id: ensureFountainBlockId(node.attrs.id),
        };

        return false;
    });

    return resolvedBlock;
};

export const findFountainBlockSelectionPosFromState = (
    state: EditorState,
    blockId: string,
    nodeName = FOUNTAIN_BLOCK_NODE_NAME,
) => {
    const block = findFountainBlockByIdFromState(state, blockId, nodeName);

    return block ? block.from : null;
};

export const getSelectionBlockEntries = (
    state: EditorState,
    nodeName = FOUNTAIN_BLOCK_NODE_NAME,
) => ({
    anchor: getFountainBlockAtResolvedPosition(state.selection.$anchor, nodeName),
    head: getFountainBlockAtResolvedPosition(state.selection.$head, nodeName),
});

export const isSelectionAcrossBlocks = (
    state: EditorState,
    nodeName = FOUNTAIN_BLOCK_NODE_NAME,
) => {
    if (state.selection.empty) {
        return false;
    }

    const {anchor, head} = getSelectionBlockEntries(state, nodeName);

    if (!anchor || !head) {
        return false;
    }

    return anchor.pos !== head.pos;
};

export const getActiveFountainBlock = (
    editor: TiptapEditor,
    nodeName = FOUNTAIN_BLOCK_NODE_NAME,
) => getActiveFountainBlockFromState(editor.state, nodeName);

export const isFountainElementType = (value: unknown): value is FountainElementType => isFountainBlockType(value);
