import type {FountainElementType} from '@stagistic/script';
import {
    createNodeId,
    FOUNTAIN_BLOCK_NODE_NAME,
    FOUNTAIN_COLUMN_GROUP_NODE_NAME,
    FOUNTAIN_COLUMN_NODE_NAME,
    resolveLegacyFountainBlockType,
    SCRIPT_BLOCK_NODE_TYPES,
} from '@stagistic/script';
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

export const FOUNTAIN_BLOCK_GROUP_NAME = 'fountainBlock';
export const FOUNTAIN_BLOCK_DOM_ID_ATTRIBUTE = 'data-id';
export const FOUNTAIN_BLOCK_DOM_TYPE_ATTRIBUTE = 'blocktype';
export const FOUNTAIN_BLOCK_DOM_SELECTOR = `p[${FOUNTAIN_BLOCK_DOM_ID_ATTRIBUTE}][${FOUNTAIN_BLOCK_DOM_TYPE_ATTRIBUTE}]`;

const FOUNTAIN_BLOCK_NODE_NAME_SET: ReadonlySet<string> = new Set([FOUNTAIN_BLOCK_NODE_NAME, ...SCRIPT_BLOCK_NODE_TYPES]);

const isFountainNodeNameInputArray = (
    value: string | readonly string[],
): value is readonly string[] => {
    return Array.isArray(value);
};

const resolveNodeNameMatcher = (nodeName: string | readonly string[]) => {
    if (nodeName === FOUNTAIN_BLOCK_NODE_NAME) {
        return isFountainBlockNodeName;
    }

    if (!isFountainNodeNameInputArray(nodeName)) {
        return (name: string) => name === nodeName;
    }

    const nodeNameSet = new Set(nodeName);

    return (name: string) => nodeNameSet.has(name);
};

export {
    FOUNTAIN_BLOCK_TYPES,
    type FountainBlockType,
    getFountainBlockClassName,
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

export const isFountainBlockNodeName = (value: unknown): value is string => {
    return typeof value === 'string' && FOUNTAIN_BLOCK_NODE_NAME_SET.has(value);
};

const resolveBlockTypeFromNode = (node: ProseMirrorNode): FountainBlockType => {
    const resolvedFromNodeName = resolveLegacyFountainBlockType(node.type.name);

    if (resolvedFromNodeName) {
        return normalizeFountainBlockType(resolvedFromNodeName);
    }

    return normalizeFountainBlockType(node.attrs.blockType);
};

const getFountainBlockAtResolvedPosition = (
    $position: ResolvedPos,
    nodeName: string | readonly string[],
): ActiveFountainBlock | null => {
    const isMatchingNodeName = resolveNodeNameMatcher(nodeName);

    for (let depth = $position.depth; depth > 0; depth -= 1) {
        const node = $position.node(depth);

        if (!isMatchingNodeName(node.type.name)) {
            continue;
        }

        const pos = $position.before(depth);

        return {
            pos,
            from: pos + 1,
            to: pos + node.nodeSize - 1,
            node,
            blockType: resolveBlockTypeFromNode(node),
            id: ensureFountainBlockId(node.attrs.id),
        };
    }

    return null;
};

export const getActiveFountainBlockFromState = (
    state: EditorState,
    nodeName: string | readonly string[] = FOUNTAIN_BLOCK_NODE_NAME,
) => getFountainBlockAtResolvedPosition(state.selection.$from, nodeName);

export const findFountainBlockByIdFromState = (
    state: EditorState,
    blockId: string,
    nodeName: string | readonly string[] = FOUNTAIN_BLOCK_NODE_NAME,
): ActiveFountainBlock | null => {
    let resolvedBlock: ActiveFountainBlock | null = null;
    const isMatchingNodeName = resolveNodeNameMatcher(nodeName);

    state.doc.descendants((node, pos) => {
        if (resolvedBlock) {
            return false;
        }

        if (!isMatchingNodeName(node.type.name)) {
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
            blockType: resolveBlockTypeFromNode(node),
            id: ensureFountainBlockId(node.attrs.id),
        };

        return false;
    });

    return resolvedBlock;
};

export const findFountainBlockSelectionPosFromState = (
    state: EditorState,
    blockId: string,
    nodeName: string | readonly string[] = FOUNTAIN_BLOCK_NODE_NAME,
) => {
    const block = findFountainBlockByIdFromState(state, blockId, nodeName);

    return block ? block.from : null;
};

export const getSelectionBlockEntries = (
    state: EditorState,
    nodeName: string | readonly string[] = FOUNTAIN_BLOCK_NODE_NAME,
) => ({
    anchor: getFountainBlockAtResolvedPosition(state.selection.$anchor, nodeName),
    head: getFountainBlockAtResolvedPosition(state.selection.$head, nodeName),
});

export const isSelectionAcrossBlocks = (
    state: EditorState,
    nodeName: string | readonly string[] = FOUNTAIN_BLOCK_NODE_NAME,
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
    nodeName: string | readonly string[] = FOUNTAIN_BLOCK_NODE_NAME,
) => getActiveFountainBlockFromState(editor.state, nodeName);

export const isFountainElementType = (value: unknown): value is FountainElementType => isFountainBlockType(value);
