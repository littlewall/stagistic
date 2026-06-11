import {
    ELEMENT_ACT,
    ELEMENT_SCENE_HEADING,
    resolveLegacyFountainBlockType,
} from '@stagistic/script';
import {Fragment, type Node as ProseMirrorNode} from '@tiptap/pm/model';
import type {Transaction} from '@tiptap/pm/state';
import type {Editor as TiptapEditor} from '@tiptap/react';

import {isFountainBlockNodeName} from '../tiptap/fountainCore';

interface TopLevelBlockInfo {
    pos: number,
    nodeSize: number,
    blockId: string | null,
    isBoundary: boolean,
}

const getBlockTypeFromPmNode = (node: ProseMirrorNode): string | null => {
    if (typeof node.attrs?.blockType === 'string' && node.attrs.blockType.length > 0) {
        return node.attrs.blockType;
    }

    return resolveLegacyFountainBlockType(node.type.name) ?? null;
};

const collectTopLevelBlocks = (doc: ProseMirrorNode): TopLevelBlockInfo[] | null => {
    const blocks: TopLevelBlockInfo[] = [];
    let hasUnexpected = false;

    doc.forEach((node, offset) => {
        if (!isFountainBlockNodeName(node.type.name)) {
            hasUnexpected = true;

            return;
        }

        const blockType = getBlockTypeFromPmNode(node);

        blocks.push({
            pos: offset,
            nodeSize: node.nodeSize,
            blockId: typeof node.attrs?.id === 'string' ? node.attrs.id : null,
            isBoundary: blockType === ELEMENT_SCENE_HEADING || blockType === ELEMENT_ACT,
        });
    });

    return hasUnexpected ? null : blocks;
};

export const buildSceneReorderTransaction = (
    editor: TiptapEditor,
    sourceSceneBlockId: string,
    beforeBlockId: string | null,
): Transaction | null => {
    const {state} = editor;
    const {doc} = state;
    const blocks = collectTopLevelBlocks(doc);

    if (!blocks) {
        return null;
    }

    // --- source range -------------------------------------------------------
    const sourceIndex = blocks.findIndex(b => b.blockId === sourceSceneBlockId);

    if (sourceIndex === -1) {
        return null;
    }

    const sourceStart = blocks[sourceIndex].pos;
    let sourceEnd = doc.content.size;

    for (let i = sourceIndex + 1; i < blocks.length; i++) {
        if (blocks[i].isBoundary) {
            sourceEnd = blocks[i].pos;
            break;
        }
    }

    // --- target position ----------------------------------------------------
    let targetPos: number;

    if (beforeBlockId === null) {
        targetPos = doc.content.size;
    } else {
        const targetBlock = blocks.find(b => b.blockId === beforeBlockId);

        if (!targetBlock) {
            return null;
        }

        targetPos = targetBlock.pos;
    }

    if (targetPos > sourceStart && targetPos <= sourceEnd) {
        return null;
    }

    // --- collect moved nodes ------------------------------------------------
    const movedNodes: ProseMirrorNode[] = [];
    let pos = sourceStart;

    while (pos < sourceEnd) {
        const node = doc.nodeAt(pos);

        if (!node) {
            return null;
        }

        movedNodes.push(node);
        pos += node.nodeSize;
    }

    const movedFragment = Fragment.from(movedNodes);
    const movedSize = sourceEnd - sourceStart;

    // --- build transaction --------------------------------------------------
    const tr = state.tr;

    if (targetPos > sourceEnd) {
        tr.delete(sourceStart, sourceEnd);
        tr.insert(targetPos - movedSize, movedFragment);
    } else {
        tr.insert(targetPos, movedFragment);
        tr.delete(sourceStart + movedSize, sourceEnd + movedSize);
    }

    return tr;
};
