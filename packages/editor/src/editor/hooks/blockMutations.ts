import {
    collectStructureBlocks,
    createNodeId,
    ELEMENT_ACT,
    type FountainJSONContent,
    getDefaultActName,
    getScriptBlockId,
    getScriptBlockLegacyType,
    isScriptBlockNode,
    resolveScriptBlockNodeType,
    type ScriptDocument,
} from '@stagistic/script';

import {FOUNTAIN_BLOCK_NODE_NAME} from '../tiptap/fountainCore';

export const setPlainTextContent = (
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

export const removeActBlockById = (
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

export const insertActBlockBeforeId = (
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

export const buildInsertActContent = (
    currentValue: ScriptDocument,
    beforeBlockId: string | null,
): {nextContent: FountainJSONContent[], didChange: boolean} => {
    const actCount = collectStructureBlocks(currentValue.content)
        .filter(block => block.blockType === ELEMENT_ACT)
        .length;
    const nextActName = getDefaultActName(actCount + 1);
    const prefersLegacyNodeType = currentValue.content.some(
        node => isScriptBlockNode(node) && node.type === FOUNTAIN_BLOCK_NODE_NAME,
    );
    const nextActNodeType = prefersLegacyNodeType
        ? FOUNTAIN_BLOCK_NODE_NAME
        : resolveScriptBlockNodeType(ELEMENT_ACT) ?? FOUNTAIN_BLOCK_NODE_NAME;
    const nextActBlock: FountainJSONContent = {
        type: nextActNodeType,
        attrs: {id: createNodeId(), blockType: ELEMENT_ACT},
        content: [{type: 'text', text: nextActName}],
    };

    let nextContent = [...currentValue.content, nextActBlock];
    let didChange = true;
    let resolvedBeforeBlockId = beforeBlockId;

    if (actCount === 0) {
        const firstBlock = currentValue.content.find(node => isScriptBlockNode(node));
        const firstBlockId = firstBlock ? getScriptBlockId(firstBlock) : null;

        if (firstBlockId) {
            resolvedBeforeBlockId = firstBlockId;
        }
    }

    if (typeof resolvedBeforeBlockId === 'string' && resolvedBeforeBlockId.length > 0) {
        const [insertedContent, didInsert] = insertActBlockBeforeId(
            currentValue.content,
            resolvedBeforeBlockId,
            nextActBlock,
        );

        if (didInsert && Array.isArray(insertedContent)) {
            nextContent = insertedContent;
        }

        if (!didInsert) {
            didChange = false;
        }
    }

    return {nextContent, didChange};
};
