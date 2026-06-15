import {
    createNodeId,
    resolveScriptBlockNodeType,
    SCRIPT_BLOCK_NODE_TYPES,
} from '@stagistic/script';
import type {Node as ProseMirrorNode, ResolvedPos} from '@tiptap/pm/model';
import type {EditorState} from '@tiptap/pm/state';
import type {Editor as TiptapEditor} from '@tiptap/react';

import {
    type BlockNodeType,
    normalizeBlockNodeType,
} from '../blocks/script';

/**
 * The set of per-type block node names. Used as the default `nodeName`
 * argument to the lookup helpers below, meaning "match any block node".
 */
export const SCRIPT_BLOCK_NODE_NAMES: readonly string[] = SCRIPT_BLOCK_NODE_TYPES;

export const SCRIPT_BLOCK_GROUP_NAME = 'scriptBlock';
export const SCRIPT_BLOCK_DOM_ID_ATTRIBUTE = 'data-id';
export const SCRIPT_BLOCK_DOM_TYPE_ATTRIBUTE = 'blocktype';
export const SCRIPT_BLOCK_DOM_SELECTOR = `p[${SCRIPT_BLOCK_DOM_ID_ATTRIBUTE}][${SCRIPT_BLOCK_DOM_TYPE_ATTRIBUTE}]`;

const SCRIPT_BLOCK_NODE_NAME_SET: ReadonlySet<string> = new Set(SCRIPT_BLOCK_NODE_TYPES);

const isNodeNameInputArray = (
    value: string | readonly string[],
): value is readonly string[] => {
    return Array.isArray(value);
};

const resolveNodeNameMatcher = (nodeName: string | readonly string[]) => {
    if (nodeName === SCRIPT_BLOCK_NODE_NAMES) {
        return isScriptBlockNodeName;
    }

    if (!isNodeNameInputArray(nodeName)) {
        return (name: string) => name === nodeName;
    }

    const nodeNameSet = new Set(nodeName);

    return (name: string) => nodeNameSet.has(name);
};

export {
    BLOCK_NODE_TYPES,
    type BlockNodeType,
    getBlockClassName,
    isBlockNodeType,
    normalizeBlockNodeType,
} from '../blocks/script';

export type ActiveScriptBlock = {
    pos: number,
    from: number,
    to: number,
    node: ProseMirrorNode,
    blockType: BlockNodeType,
    id: string,
};

export const ensureScriptBlockId = (value: unknown) => {
    return typeof value === 'string' && value.length > 0 ? value : createNodeId();
};

export const isScriptBlockNodeName = (value: unknown): value is string => {
    return typeof value === 'string' && SCRIPT_BLOCK_NODE_NAME_SET.has(value);
};

const resolveBlockTypeFromNode = (node: ProseMirrorNode): BlockNodeType => {
    const resolvedFromNodeName = resolveScriptBlockNodeType(node.type.name);

    if (resolvedFromNodeName) {
        return normalizeBlockNodeType(resolvedFromNodeName);
    }

    return normalizeBlockNodeType(node.attrs.blockType);
};

const getScriptBlockAtResolvedPosition = (
    $position: ResolvedPos,
    nodeName: string | readonly string[],
): ActiveScriptBlock | null => {
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
            id: ensureScriptBlockId(node.attrs.id),
        };
    }

    return null;
};

export const getActiveScriptBlockFromState = (
    state: EditorState,
    nodeName: string | readonly string[] = SCRIPT_BLOCK_NODE_NAMES,
) => getScriptBlockAtResolvedPosition(state.selection.$from, nodeName);

export const findScriptBlockByIdFromState = (
    state: EditorState,
    blockId: string,
    nodeName: string | readonly string[] = SCRIPT_BLOCK_NODE_NAMES,
): ActiveScriptBlock | null => {
    let resolvedBlock: ActiveScriptBlock | null = null;
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
            id: ensureScriptBlockId(node.attrs.id),
        };

        return false;
    });

    return resolvedBlock;
};

export const findScriptBlockSelectionPosFromState = (
    state: EditorState,
    blockId: string,
    nodeName: string | readonly string[] = SCRIPT_BLOCK_NODE_NAMES,
) => {
    const block = findScriptBlockByIdFromState(state, blockId, nodeName);

    return block ? block.from : null;
};

export const getSelectionBlockEntries = (
    state: EditorState,
    nodeName: string | readonly string[] = SCRIPT_BLOCK_NODE_NAMES,
) => ({
    anchor: getScriptBlockAtResolvedPosition(state.selection.$anchor, nodeName),
    head: getScriptBlockAtResolvedPosition(state.selection.$head, nodeName),
});

export const isSelectionAcrossBlocks = (
    state: EditorState,
    nodeName: string | readonly string[] = SCRIPT_BLOCK_NODE_NAMES,
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

export const getActiveScriptBlock = (
    editor: TiptapEditor,
    nodeName: string | readonly string[] = SCRIPT_BLOCK_NODE_NAMES,
) => getActiveScriptBlockFromState(editor.state, nodeName);
