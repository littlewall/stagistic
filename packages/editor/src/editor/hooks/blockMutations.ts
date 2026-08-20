import {
    collectStructureBlocks,
    createNodeId,
    getDefaultActName,
    getScriptBlockId,
    getScriptBlockNodeType,
    isScriptBlockNode,
    resolveScriptBlockNodeType,
    type ScriptDocument,
    type ScriptNode,
} from '@stagistic/script';

export const setPlainTextContent = (
    nodes: ScriptNode[] | undefined,
    blockId: string,
    nextName: string,
): [ScriptNode[] | undefined, boolean] => {
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
            && getScriptBlockNodeType(node) === 'act'
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
    nodes: ScriptNode[] | undefined,
    blockId: string,
): [ScriptNode[] | undefined, boolean] => {
    if (!Array.isArray(nodes) || nodes.length === 0) {
        return [nodes, false];
    }

    let didChange = false;
    const nextNodes: ScriptNode[] = [];

    nodes.forEach(node => {
        if (!node || typeof node !== 'object') {
            nextNodes.push(node);

            return;
        }

        if (
            isScriptBlockNode(node)
            && getScriptBlockId(node) === blockId
            && getScriptBlockNodeType(node) === 'act'
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

export const buildDeleteActContent = (
    currentValue: ScriptDocument,
    blockId: string,
): {nextContent: ScriptNode[] | undefined, didChange: boolean} => {
    const [nextContent, didChange] = removeActBlockById(currentValue.content, blockId);

    return {nextContent, didChange};
};

export const removeSceneBlockById = (
    nodes: ScriptNode[] | undefined,
    blockId: string,
): [ScriptNode[] | undefined, boolean] => {
    if (!Array.isArray(nodes) || nodes.length === 0) {
        return [nodes, false];
    }

    let didChange = false;
    const nextNodes: ScriptNode[] = [];

    nodes.forEach(node => {
        if (!node || typeof node !== 'object') {
            nextNodes.push(node);

            return;
        }

        if (
            isScriptBlockNode(node)
            && getScriptBlockId(node) === blockId
            && getScriptBlockNodeType(node) === 'scene'
        ) {
            didChange = true;

            return;
        }

        const [nextContent, childChanged] = removeSceneBlockById(node.content, blockId);

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

export const buildDeleteSceneHeadingContent = (
    currentValue: ScriptDocument,
    blockId: string,
): ScriptDocument | null => {
    const [nextContent, didChange] = removeSceneBlockById(currentValue.content, blockId);

    if (!didChange || !Array.isArray(nextContent)) {
        return null;
    }

    return {
        ...currentValue,
        content: nextContent,
    };
};

export const insertActBlockBeforeId = (
    nodes: ScriptNode[] | undefined,
    beforeBlockId: string,
    actNode: ScriptNode,
): [ScriptNode[] | undefined, boolean] => {
    if (!Array.isArray(nodes) || nodes.length === 0) {
        return [nodes, false];
    }

    let didInsert = false;
    const nextNodes: ScriptNode[] = [];

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
): {nextContent: ScriptNode[], didChange: boolean} => {
    const actCount = collectStructureBlocks(currentValue.content)
        .filter(block => block.blockType === 'act')
        .length;
    const nextActName = getDefaultActName(actCount + 1);
    const nextActNodeType = resolveScriptBlockNodeType('act') ?? 'act';
    const nextActBlock: ScriptNode = {
        type: nextActNodeType,
        attrs: {id: createNodeId(), blockType: 'act'},
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
