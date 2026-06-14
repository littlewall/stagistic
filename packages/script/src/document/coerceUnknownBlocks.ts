import {isScriptBlockNodeType} from '../syntax';
import {
    DEFAULT_SCRIPT_BLOCK_NODE_TYPE,
    type ScriptDocument,
    type ScriptNode,
} from './scriptDocument';

export type ScriptDocumentCoerceResult = {
    value: ScriptDocument,
    changed: boolean,
};

const coerceNode = (node: ScriptNode): {node: ScriptNode, changed: boolean} => {
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
