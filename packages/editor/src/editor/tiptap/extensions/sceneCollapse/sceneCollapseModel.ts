import type {Node as ProseMirrorNode} from '@tiptap/pm/model';

import {
    isScriptBlockNodeName,
    normalizeBlockNodeType,
} from '../../scriptCore';

export interface SceneCollapseBlockRange {
    blockId: string,
    from: number,
    to: number,
}

export interface SceneCollapseRange {
    sceneBlockId: string,
    headingFrom: number,
    headingTo: number,
    bodyBlocks: readonly SceneCollapseBlockRange[],
    nextBoundary: SceneCollapseBlockRange | null,
}

interface MutableSceneCollapseRange {
    sceneBlockId: string,
    headingFrom: number,
    headingTo: number,
    bodyBlocks: SceneCollapseBlockRange[],
    nextBoundary: SceneCollapseBlockRange | null,
}

const getBlockId = (node: ProseMirrorNode) => {
    return typeof node.attrs.id === 'string' ? node.attrs.id : '';
};

const getBlockRange = (
    node: ProseMirrorNode,
    from: number,
): SceneCollapseBlockRange => ({
    blockId: getBlockId(node),
    from,
    to: from + node.nodeSize,
});

export const buildSceneCollapseRanges = (
    doc: ProseMirrorNode,
): readonly SceneCollapseRange[] => {
    const ranges: MutableSceneCollapseRange[] = [];
    let currentScene: MutableSceneCollapseRange | null = null;

    doc.forEach((node, offset) => {
        if (!isScriptBlockNodeName(node.type.name)) {
            return;
        }

        const blockType = normalizeBlockNodeType(node.attrs.blockType);
        const blockRange = getBlockRange(node, offset);
        const isBoundary = blockType === 'act' || blockType === 'scene';

        if (isBoundary && currentScene) {
            currentScene.nextBoundary = blockRange;
            currentScene = null;
        }

        if (blockType === 'scene' && blockRange.blockId) {
            currentScene = {
                sceneBlockId: blockRange.blockId,
                headingFrom: blockRange.from,
                headingTo: blockRange.to,
                bodyBlocks: [],
                nextBoundary: null,
            };
            ranges.push(currentScene);

            return;
        }

        if (currentScene && !isBoundary && blockRange.blockId) {
            currentScene.bodyBlocks.push(blockRange);
        }
    });

    return ranges;
};

export const reconcileCollapsedSceneIds = (
    ranges: readonly SceneCollapseRange[],
    requestedIds: Iterable<string>,
): readonly string[] => {
    const requested = new Set(requestedIds);

    return ranges
        .filter(range => requested.has(range.sceneBlockId))
        .map(range => range.sceneBlockId);
};

export const findCollapsedSceneContainingPosition = (
    ranges: readonly SceneCollapseRange[],
    collapsedIds: ReadonlySet<string>,
    position: number,
): SceneCollapseRange | null => {
    return ranges.find(range => {
        if (!collapsedIds.has(range.sceneBlockId)) {
            return false;
        }

        return range.bodyBlocks.some(block => position > block.from && position < block.to);
    }) ?? null;
};

export const findPreviousCollapsedScene = (
    ranges: readonly SceneCollapseRange[],
    collapsedIds: ReadonlySet<string>,
    boundaryFrom: number,
): SceneCollapseRange | null => {
    return ranges.find(range => {
        return collapsedIds.has(range.sceneBlockId)
            && range.nextBoundary?.from === boundaryFrom;
    }) ?? null;
};
