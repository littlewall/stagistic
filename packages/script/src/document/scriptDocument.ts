import {createNodeId} from '@stagistic/shared';

import type {EditorSettingsOverride} from '../settings';
import {
    isScriptBlockNodeType,
    resolveScriptBlockNodeType,
    type ScriptBlockNodeType,
} from '../syntax';

export const DEFAULT_SCRIPT_BLOCK_NODE_TYPE: ScriptBlockNodeType = 'stageDirection';
export const SCRIPT_DOCUMENT_SCHEMA_VERSION = 2;

export type ScriptNode = {
    type?: string,
    attrs?: Record<string, unknown>,
    content?: ScriptNode[],
    marks?: Array<{
        type: string,
        attrs?: Record<string, unknown>,
    }>,
    text?: string,
};

export type ScriptDocument = {
    type: 'doc',
    attrs?: {
        /*
         * Keep user/domain metadata out of the script body when possible.
         * Settings/import metadata are transitional document attributes; persisted
         * saves strip editor settings before writing the content projection.
         */
        settings?: EditorSettingsOverride,
        importMeta?: ScriptImportMetadata,
    },
    content: ScriptNode[],
};

export interface ScriptImportedTitlePageField {
    fieldKey: string,
    value: string,
    orderNo: number,
}

export interface ScriptImportedSceneSynopsis {
    headingBlockId: string,
    synopsis: string,
}

export interface ScriptImportMetadata {
    titlePageFields?: ScriptImportedTitlePageField[],
    sceneSynopses?: ScriptImportedSceneSynopsis[],
}

export const getNodeAttrs = (node: ScriptNode): Record<string, unknown> | undefined => {
    return node.attrs && typeof node.attrs === 'object'
        ? node.attrs
        : undefined;
};

export const hasNodeChildren = (node: ScriptNode): node is ScriptNode & {content: ScriptNode[]} => {
    return Array.isArray(node.content);
};

const getScriptBlockNodeTypeFromNode = (node: ScriptNode): ScriptBlockNodeType | null => {
    if (isScriptBlockNodeType(node.type)) {
        return node.type;
    }

    return null;
};

export const isScriptBlockNode = (node: ScriptNode): boolean => {
    return getScriptBlockNodeTypeFromNode(node) !== null;
};

export const getScriptBlockNodeType = (
    node: ScriptNode,
    fallback: ScriptBlockNodeType = DEFAULT_SCRIPT_BLOCK_NODE_TYPE,
): ScriptBlockNodeType => {
    return getScriptBlockNodeTypeFromNode(node) ?? fallback;
};

export const getScriptBlockId = (node: ScriptNode): string | null => {
    if (!isScriptBlockNode(node)) {
        return null;
    }

    const attrs = getNodeAttrs(node);
    const rawId = typeof attrs?.id === 'string'
        ? attrs.id.trim()
        : '';

    return rawId.length > 0 ? rawId : null;
};

export const createScriptBlockNode = (
    rawBlockType: unknown = DEFAULT_SCRIPT_BLOCK_NODE_TYPE,
    id?: string,
): ScriptNode => {
    const nodeType = resolveScriptBlockNodeType(rawBlockType) ?? DEFAULT_SCRIPT_BLOCK_NODE_TYPE;

    return {
        type: nodeType,
        attrs: {
            id: id ?? createNodeId(),
        },
        content: [],
    };
};

export const createEmptyScriptDocument = (
    blockId?: string,
    settings?: EditorSettingsOverride,
): ScriptDocument => {
    const actBlock = createScriptBlockNode('act', createNodeId());

    return {
        type: 'doc',
        attrs: settings ? {settings} : undefined,
        content: [
            {
                ...actBlock,
                content: [{type: 'text', text: 'ACT ONE'}],
            }, createScriptBlockNode('scene', blockId),
        ],
    };
};

export const createActlessScriptDocument = (
    blockId?: string,
    settings?: EditorSettingsOverride,
): ScriptDocument => ({
    type: 'doc',
    attrs: settings ? {settings} : undefined,
    content: [createScriptBlockNode('scene', blockId)],
});

export const createDefaultScriptDocument = (
    blockId?: string,
    settings?: EditorSettingsOverride,
): ScriptDocument => {
    return createEmptyScriptDocument(blockId, settings);
};
