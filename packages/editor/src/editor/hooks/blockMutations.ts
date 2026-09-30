import {
    getScriptBlockId, getScriptBlockNodeType, isScriptBlockNode, resolveScriptBlockNodeType, type ScriptDocument, type ScriptNode,
} from '@stagistic/script';

export const setPlainTextContent = (nodes: ScriptNode[] | undefined, blockId: string, nextName: string): [ScriptNode[] | undefined, boolean] => {
    if (!Array.isArray(nodes) || nodes.length === 0) {
        return [nodes, false];
    }

    let didChange = false;
    const nextNodes = nodes.map(node => {
        if (!node || typeof node !== 'object') {
            return node;
        }

        if (isScriptBlockNode(node) && getScriptBlockId(node) === blockId && getScriptBlockNodeType(node) === 'act') {
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
                content:
                    normalizedName.length > 0
                        ? [
                            {
                                type: 'text',
                                text: normalizedName,
                            },
                        ]
                        : [],
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

export const removeSceneBlockById = (nodes: ScriptNode[] | undefined, blockId: string): [ScriptNode[] | undefined, boolean] => {
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

        if (isScriptBlockNode(node) && getScriptBlockId(node) === blockId && getScriptBlockNodeType(node) === 'scene') {
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

export const buildDeleteSceneHeadingContent = (currentValue: ScriptDocument, blockId: string): ScriptDocument | null => {
    const [nextContent, didChange] = removeSceneBlockById(currentValue.content, blockId);

    if (!didChange || !Array.isArray(nextContent)) {
        return null;
    }

    return {
        ...currentValue,
        content: nextContent,
    };
};

const convertSceneBlockById = (nodes: ScriptNode[] | undefined, blockId: string, nextNodeType: string): [ScriptNode[] | undefined, boolean] => {
    if (!Array.isArray(nodes) || nodes.length === 0) {
        return [nodes, false];
    }

    let didChange = false;
    const nextNodes = nodes.map(node => {
        if (!node || typeof node !== 'object') {
            return node;
        }

        if (isScriptBlockNode(node) && getScriptBlockId(node) === blockId && getScriptBlockNodeType(node) === 'scene') {
            didChange = true;

            return {
                ...node,
                type: nextNodeType,
            };
        }

        const [nextContent, childChanged] = convertSceneBlockById(node.content, blockId, nextNodeType);

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

/**
 * Convert a scene heading block into another block type in place, keeping the
 * block's id and its heading text as the new block's content. The scene's
 * projection-owned metadata (synopsis, color, place assignments) is pruned by
 * the projection once the block leaves the scene set — mirroring the data loss
 * of {@link buildDeleteSceneHeadingContent}. Returns null when the target isn't
 * a scene, the target type is `scene` (a no-op), or the id can't be resolved.
 */
export const buildConvertSceneHeadingContent = (currentValue: ScriptDocument, blockId: string, targetBlockType: string): ScriptDocument | null => {
    const nextNodeType = resolveScriptBlockNodeType(targetBlockType);

    if (!nextNodeType || nextNodeType === 'scene') {
        return null;
    }

    const [nextContent, didChange] = convertSceneBlockById(currentValue.content, blockId, nextNodeType);

    if (!didChange || !Array.isArray(nextContent)) {
        return null;
    }

    return {
        ...currentValue,
        content: nextContent,
    };
};
