import {
    MUSIC_OUT_NODE_NAME,
    MUSIC_START_NODE_NAME,
    type ScriptDocument,
    type ScriptNode,
} from '@stagistic/script';

const PRINTABLE_ATOM_TYPES = new Set([MUSIC_START_NODE_NAME, MUSIC_OUT_NODE_NAME]);

const hasPrintableNode = (node: ScriptNode): boolean => {
    if (typeof node.text === 'string' && node.text.trim().length > 0) {
        return true;
    }

    if (node.type && PRINTABLE_ATOM_TYPES.has(node.type)) {
        return true;
    }

    return node.content?.some(hasPrintableNode) ?? false;
};

export const hasExportableScriptContent = (document: ScriptDocument) => {
    return document.content.some(node => node.type !== 'act' && hasPrintableNode(node));
};
