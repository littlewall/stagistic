import {
    collectStructureBlocks,
    createNodeId,
    ELEMENT_ACT,
    ELEMENT_SCENE_HEADING,
    FOUNTAIN_BLOCK_NODE_NAME,
    type FountainJSONContent,
    getDefaultActName,
    getScriptBlockId,
    getScriptBlockLegacyType,
    isScriptBlockNode,
    normalizeScriptStructure,
    resolveScriptBlockNodeType,
    type ScriptDocument,
} from '@stagistic/script';

const cloneDocumentWithContent = (
    value: ScriptDocument,
    content: FountainJSONContent[],
): ScriptDocument => {
    return {
        ...value,
        content,
        attrs: {
            ...value.attrs,
            structure: normalizeScriptStructure(value.attrs?.structure, {content}),
        },
    };
};

const setPlainTextContent = (
    nodes: FountainJSONContent[] | undefined,
    blockId: string,
    nextName: string,
): [FountainJSONContent[] | undefined, boolean] => {
    if (!Array.isArray(nodes) || nodes.length === 0) {
        return [nodes, false];
    }

    let didChange = false;
    const nextNodes = nodes.map(node => {
        if (!node || typeof node !== 'object') {
            return node;
        }

        if (
            isScriptBlockNode(node)
            && getScriptBlockId(node) === blockId
            && getScriptBlockLegacyType(node) === ELEMENT_ACT
        ) {
            const currentText = (node.content ?? [])
                .map(child => {
                    return typeof child.text === 'string' ? child.text : '';
                })
                .join('');
            const normalizedName = nextName.trim().toLocaleUpperCase();

            if (currentText.trim() === normalizedName) {
                return node;
            }

            didChange = true;

            return {
                ...node,
                content: normalizedName.length > 0 ? [
                    {
                        type: 'text',
                        text: normalizedName,
                    },
                ] : [],
            };
        }

        const [nextContent, childChanged] = setPlainTextContent(node.content, blockId, nextName);

        if (!childChanged) {
            return node;
        }

        didChange = true;

        return {
            ...node,
            content: nextContent,
        };
    });

    return [didChange ? nextNodes : nodes, didChange];
};

const removeActBlockById = (
    nodes: FountainJSONContent[] | undefined,
    blockId: string,
): [FountainJSONContent[] | undefined, boolean] => {
    if (!Array.isArray(nodes) || nodes.length === 0) {
        return [nodes, false];
    }

    let didChange = false;
    const nextNodes: FountainJSONContent[] = [];

    nodes.forEach(node => {
        if (!node || typeof node !== 'object') {
            nextNodes.push(node);

            return;
        }

        if (
            isScriptBlockNode(node)
            && getScriptBlockId(node) === blockId
            && getScriptBlockLegacyType(node) === ELEMENT_ACT
        ) {
            didChange = true;

            return;
        }

        const [nextContent, childChanged] = removeActBlockById(node.content, blockId);

        if (!childChanged) {
            nextNodes.push(node);

            return;
        }

        didChange = true;
        nextNodes.push({
            ...node,
            content: nextContent,
        });
    });

    return [didChange ? nextNodes : nodes, didChange];
};

const insertActBlockBeforeId = (
    nodes: FountainJSONContent[] | undefined,
    beforeBlockId: string,
    actNode: FountainJSONContent,
): [FountainJSONContent[] | undefined, boolean] => {
    if (!Array.isArray(nodes) || nodes.length === 0) {
        return [nodes, false];
    }

    let didInsert = false;
    const nextNodes: FountainJSONContent[] = [];

    nodes.forEach(node => {
        if (!node || typeof node !== 'object') {
            nextNodes.push(node);

            return;
        }

        if (
            !didInsert
            && isScriptBlockNode(node)
            && getScriptBlockId(node) === beforeBlockId
        ) {
            nextNodes.push(actNode, node);
            didInsert = true;

            return;
        }

        if (!didInsert && Array.isArray(node.content)) {
            const [nextContent, childInserted] = insertActBlockBeforeId(
                node.content,
                beforeBlockId,
                actNode,
            );

            if (childInserted) {
                nextNodes.push({
                    ...node,
                    content: nextContent,
                });
                didInsert = true;

                return;
            }
        }

        nextNodes.push(node);
    });

    return [didInsert ? nextNodes : nodes, didInsert];
};

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

const moveActMarkerInNodeList = (
    nodes: FountainJSONContent[] | undefined,
    sourceActBlockId: string,
    beforeBlockId: string | null,
): [FountainJSONContent[] | undefined, boolean] => {
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

    let didChange = false;
    const nextNodes = nodes.map(node => {
        if (!Array.isArray(node.content) || node.content.length === 0) {
            return node;
        }

        const [nextContent, childChanged] = moveActMarkerInNodeList(
            node.content,
            sourceActBlockId,
            beforeBlockId,
        );

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
): [FountainJSONContent[] | undefined, boolean] => {
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

    let didChange = false;
    const nextNodes = nodes.map(node => {
        if (!Array.isArray(node.content) || node.content.length === 0) {
            return node;
        }

        const [nextContent, childChanged] = moveSceneSegmentInNodeList(
            node.content,
            sourceSceneBlockId,
            beforeBlockId,
        );

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

const createActNode = (value: ScriptDocument): FountainJSONContent => {
    const actCount = collectStructureBlocks(value.content)
        .filter(block => block.blockType === ELEMENT_ACT)
        .length;
    const nextActName = getDefaultActName(actCount + 1);
    const prefersLegacyNodeType = value.content.some(node => isScriptBlockNode(node) && node.type === FOUNTAIN_BLOCK_NODE_NAME);
    const nextActNodeType = prefersLegacyNodeType
        ? FOUNTAIN_BLOCK_NODE_NAME
        : resolveScriptBlockNodeType(ELEMENT_ACT) ?? FOUNTAIN_BLOCK_NODE_NAME;
    const attrs = prefersLegacyNodeType
        ? {
            id: createNodeId(),
            blockType: ELEMENT_ACT,
        }
        : {
            id: createNodeId(),
        };

    return {
        type: nextActNodeType,
        attrs,
        content: [
            {
                type: 'text',
                text: nextActName,
            },
        ],
    };
};

export const renameActInDocument = (
    value: ScriptDocument,
    blockId: string,
    nextName: string,
): ScriptDocument | null => {
    const [nextContent, didChange] = setPlainTextContent(value.content, blockId, nextName);

    if (!didChange || !Array.isArray(nextContent)) {
        return null;
    }

    return cloneDocumentWithContent(value, nextContent);
};

export const deleteActInDocument = (
    value: ScriptDocument,
    blockId: string,
): ScriptDocument | null => {
    const [nextContent, didChange] = removeActBlockById(value.content, blockId);

    if (!didChange || !Array.isArray(nextContent)) {
        return null;
    }

    return cloneDocumentWithContent(value, nextContent);
};

export const insertActInDocument = (
    value: ScriptDocument,
    beforeBlockId: string | null,
): ScriptDocument | null => {
    const nextActBlock = createActNode(value);
    let nextContent = [...value.content, nextActBlock];
    let didChange = true;

    if (beforeBlockId) {
        const [insertedContent, didInsert] = insertActBlockBeforeId(
            value.content,
            beforeBlockId,
            nextActBlock,
        );

        if (didInsert && Array.isArray(insertedContent)) {
            nextContent = insertedContent;
        }

        if (!didInsert) {
            didChange = false;
        }
    }

    if (!didChange) {
        return null;
    }

    return cloneDocumentWithContent(value, nextContent);
};

export const moveSceneInDocument = (
    value: ScriptDocument,
    sourceSceneBlockId: string,
    beforeBlockId: string | null,
): ScriptDocument | null => {
    const [nextContent, didChange] = moveSceneSegmentInNodeList(
        value.content,
        sourceSceneBlockId,
        beforeBlockId,
    );

    if (!didChange || !Array.isArray(nextContent)) {
        return null;
    }

    return cloneDocumentWithContent(value, nextContent);
};

export const moveActInDocument = (
    value: ScriptDocument,
    sourceActBlockId: string,
    beforeBlockId: string | null,
): ScriptDocument | null => {
    const [nextContent, didChange] = moveActMarkerInNodeList(
        value.content,
        sourceActBlockId,
        beforeBlockId,
    );

    if (!didChange || !Array.isArray(nextContent)) {
        return null;
    }

    return cloneDocumentWithContent(value, nextContent);
};
