import {
    ELEMENT_ACT,
    ELEMENT_SCENE_HEADING,
    type FountainJSONContent,
    getScriptBlockId,
    getScriptBlockLegacyType,
    isScriptBlockNode,
} from '@stagistic/script';

type MoveResult = [FountainJSONContent[] | undefined, boolean];

const isFountainBlock = (node: FountainJSONContent) => isScriptBlockNode(node);

const getBlockId = (node: FountainJSONContent): string | null => {
    if (!isFountainBlock(node)) {
        return null;
    }

    return getScriptBlockId(node);
};

const getBlockType = (node: FountainJSONContent): unknown => {
    if (!isFountainBlock(node)) {
        return null;
    }

    return getScriptBlockLegacyType(node);
};

const isSameOrder = (previous: FountainJSONContent[], next: FountainJSONContent[]) => {
    return previous.length === next.length && previous.every((node, index) => node === next[index]);
};

const resolveInsertionIndex = (
    nodes: FountainJSONContent[],
    beforeBlockId: string | null,
): number | null => {
    if (!beforeBlockId) {
        return nodes.length;
    }

    const index = nodes.findIndex(node => getBlockId(node) === beforeBlockId);

    return index >= 0 ? index : null;
};

const recurseIntoChildren = (
    nodes: FountainJSONContent[],
    moveFn: (children: FountainJSONContent[] | undefined) => MoveResult,
): MoveResult => {
    let didChange = false;
    const nextNodes = nodes.map(node => {
        if (!Array.isArray(node.content) || node.content.length === 0) {
            return node;
        }

        const [nextContent, childChanged] = moveFn(node.content);

        if (!childChanged) {
            return node;
        }

        didChange = true;

        return {
            ...node,
            content: nextContent,
        };
    });

    return didChange ? [nextNodes, true] : [nodes, false];
};

const moveActMarkerInNodeList = (
    nodes: FountainJSONContent[] | undefined,
    sourceActBlockId: string,
    beforeBlockId: string | null,
): MoveResult => {
    if (!Array.isArray(nodes) || nodes.length === 0) {
        return [nodes, false];
    }

    const sourceIndex = nodes.findIndex(node => {
        return getBlockType(node) === ELEMENT_ACT && getBlockId(node) === sourceActBlockId;
    });

    if (sourceIndex >= 0) {
        const movedNode = nodes[sourceIndex];
        const withoutSource = nodes.slice(0, sourceIndex).concat(nodes.slice(sourceIndex + 1));
        const insertionIndex = resolveInsertionIndex(withoutSource, beforeBlockId);

        if (insertionIndex === null) {
            return [nodes, false];
        }

        const nextNodes = withoutSource
            .slice(0, insertionIndex)
            .concat(movedNode, withoutSource.slice(insertionIndex));

        return isSameOrder(nodes, nextNodes)
            ? [nodes, false]
            : [nextNodes, true];
    }

    return recurseIntoChildren(nodes, children => moveActMarkerInNodeList(children, sourceActBlockId, beforeBlockId));
};

type SceneRange = {
    start: number,
    end: number,
};

const findSceneRangeByBlockId = (
    nodes: FountainJSONContent[],
    sceneBlockId: string,
): SceneRange | null => {
    const start = nodes.findIndex(node => {
        return getBlockType(node) === ELEMENT_SCENE_HEADING && getBlockId(node) === sceneBlockId;
    });

    if (start < 0) {
        return null;
    }

    let end = nodes.length;

    for (let index = start + 1; index < nodes.length; index += 1) {
        const blockType = getBlockType(nodes[index]);

        if (blockType === ELEMENT_SCENE_HEADING || blockType === ELEMENT_ACT) {
            end = index;
            break;
        }
    }

    return {
        start,
        end,
    };
};

const moveSceneSegmentInNodeList = (
    nodes: FountainJSONContent[] | undefined,
    sourceSceneBlockId: string,
    beforeBlockId: string | null,
): MoveResult => {
    if (!Array.isArray(nodes) || nodes.length === 0) {
        return [nodes, false];
    }

    const sourceRange = findSceneRangeByBlockId(nodes, sourceSceneBlockId);

    if (sourceRange) {
        const movedNodes = nodes.slice(sourceRange.start, sourceRange.end);
        const withoutSource = nodes.slice(0, sourceRange.start).concat(nodes.slice(sourceRange.end));
        const insertionIndex = resolveInsertionIndex(withoutSource, beforeBlockId);

        if (insertionIndex === null) {
            return [nodes, false];
        }

        const nextNodes = withoutSource
            .slice(0, insertionIndex)
            .concat(movedNodes, withoutSource.slice(insertionIndex));

        return isSameOrder(nodes, nextNodes)
            ? [nodes, false]
            : [nextNodes, true];
    }

    return recurseIntoChildren(nodes, children => moveSceneSegmentInNodeList(children, sourceSceneBlockId, beforeBlockId));
};

export const moveActMarker = (
    content: FountainJSONContent[] | undefined,
    sourceActBlockId: string,
    beforeBlockId: string | null,
): MoveResult => {
    return moveActMarkerInNodeList(content, sourceActBlockId, beforeBlockId);
};

export const moveSceneSegment = (
    content: FountainJSONContent[] | undefined,
    sourceSceneBlockId: string,
    beforeBlockId: string | null,
): MoveResult => {
    return moveSceneSegmentInNodeList(content, sourceSceneBlockId, beforeBlockId);
};

const isStructureBlockType = (blockType: unknown) => {
    return blockType === ELEMENT_ACT || blockType === ELEMENT_SCENE_HEADING;
};

export const moveTopLevelNonStructuralBlock = (
    content: FountainJSONContent[] | undefined,
    sourceBlockId: string,
    beforeBlockId: string | null,
): MoveResult => {
    if (!Array.isArray(content) || content.length === 0) {
        return [content, false];
    }

    const sourceIndex = content.findIndex(node => getBlockId(node) === sourceBlockId);

    if (sourceIndex < 0) {
        return [content, false];
    }

    const sourceNode = content[sourceIndex];
    const sourceBlockType = getBlockType(sourceNode);

    if (isStructureBlockType(sourceBlockType)) {
        return [content, false];
    }

    const withoutSource = content.slice(0, sourceIndex).concat(content.slice(sourceIndex + 1));
    const insertionIndex = resolveInsertionIndex(withoutSource, beforeBlockId);

    if (insertionIndex === null) {
        return [content, false];
    }

    const nextNodes = withoutSource
        .slice(0, insertionIndex)
        .concat(sourceNode, withoutSource.slice(insertionIndex));

    return isSameOrder(content, nextNodes)
        ? [content, false]
        : [nextNodes, true];
};
