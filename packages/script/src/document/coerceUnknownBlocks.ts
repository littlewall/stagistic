import {
    isScriptBlockNodeType,
    resolveScriptBlockNodeType,
} from '../fountain';
import {
    DEFAULT_SCRIPT_BLOCK_NODE_TYPE,
    FOUNTAIN_BLOCK_NODE_NAME,
    type FountainJSONContent,
    type ScriptDocument,
} from './scriptDocument';

export type ScriptDocumentCoerceResult = {
    value: ScriptDocument,
    changed: boolean,
};

const coerceNode = (node: FountainJSONContent): {node: FountainJSONContent, changed: boolean} => {
    if (node.type === FOUNTAIN_BLOCK_NODE_NAME) {
        const blockType = node.attrs?.blockType;
        const resolved = resolveScriptBlockNodeType(blockType);

        if (!resolved) {
            return {
                node: {
                    ...node,
                    attrs: {
                        ...node.attrs,
                        blockType: DEFAULT_SCRIPT_BLOCK_NODE_TYPE,
                    },
                },
                changed: true,
            };
        }

        return {node, changed: false};
    }

    if (typeof node.type === 'string' && node.type !== 'doc' && node.type !== 'text'
        && !node.type.startsWith('fountainColumn')
        && !isScriptBlockNodeType(node.type)
    ) {
        return {
            node: {
                ...node,
                type: DEFAULT_SCRIPT_BLOCK_NODE_TYPE,
            },
            changed: true,
        };
    }

    return {node, changed: false};
};

export const coerceUnknownBlocksToStageDirections = (
    value: ScriptDocument,
): ScriptDocumentCoerceResult => {
    if (!value || value.type !== 'doc' || !Array.isArray(value.content)) {
        return {value, changed: false};
    }

    let changed = false;
    const nextContent = value.content.map(node => {
        const result = coerceNode(node);

        if (result.changed) {
            changed = true;
        }

        return result.node;
    });

    if (!changed) {
        return {value, changed: false};
    }

    return {
        value: {
            ...value,
            content: nextContent,
        },
        changed: true,
    };
};
