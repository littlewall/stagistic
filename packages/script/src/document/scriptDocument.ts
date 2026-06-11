import {createNodeId} from '@stagistic/shared';

import {
    ELEMENT_ACT,
    ELEMENT_ACTION,
    ELEMENT_SCENE_HEADING,
    type FountainElementType,
    isScriptBlockNodeType,
    resolveLegacyFountainBlockType,
    resolveScriptBlockNodeType,
    type ScriptBlockNodeType,
} from '../fountain';
import type {EditorSettingsOverride} from '../settings';

/**
 * @deprecated Legacy monolithic block node. Prefer explicit node-per-type names.
 */
export const FOUNTAIN_BLOCK_NODE_NAME = 'fountainBlock';
export const FOUNTAIN_COLUMN_GROUP_NODE_NAME = 'fountainColumnGroup';
export const FOUNTAIN_COLUMN_NODE_NAME = 'fountainColumn';

export const DEFAULT_SCRIPT_BLOCK_NODE_TYPE: ScriptBlockNodeType = 'action';
export const DEFAULT_SCRIPT_DOCUMENT_NODE_MODE = 'default';

export type ScriptDocumentNodeMode = 'legacy' | 'default';

export type FountainJSONContent = {
    type?: string,
    attrs?: Record<string, unknown>,
    content?: FountainJSONContent[],
    marks?: Array<{
        type: string,
        attrs?: Record<string, unknown>,
    }>,
    text?: string,
};

export type ScriptDocument = {
    type: 'doc',
    attrs?: {
        settings?: EditorSettingsOverride,
        importMeta?: ScriptImportMetadata,
    },
    content: FountainJSONContent[],
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

export const getNodeAttrs = (node: FountainJSONContent): Record<string, unknown> | undefined => {
    return node.attrs && typeof node.attrs === 'object'
        ? node.attrs
        : undefined;
};

export const hasNodeChildren = (node: FountainJSONContent): node is FountainJSONContent & {content: FountainJSONContent[]} => {
    return Array.isArray(node.content);
};

const getScriptBlockNodeTypeFromNode = (node: FountainJSONContent): ScriptBlockNodeType | null => {
    if (isScriptBlockNodeType(node.type)) {
        return node.type;
    }

    if (node.type !== FOUNTAIN_BLOCK_NODE_NAME) {
        return null;
    }

    const attrs = getNodeAttrs(node);

    return resolveScriptBlockNodeType(attrs?.blockType);
};

export const isScriptBlockNode = (node: FountainJSONContent): boolean => {
    return getScriptBlockNodeTypeFromNode(node) !== null;
};

export const getScriptBlockNodeType = (
    node: FountainJSONContent,
    fallback: ScriptBlockNodeType = DEFAULT_SCRIPT_BLOCK_NODE_TYPE,
): ScriptBlockNodeType => {
    return getScriptBlockNodeTypeFromNode(node) ?? fallback;
};

export const getScriptBlockLegacyType = (
    node: FountainJSONContent,
    fallback: FountainElementType = ELEMENT_ACTION,
): FountainElementType => {
    const nodeType = getScriptBlockNodeTypeFromNode(node);

    if (!nodeType) {
        return fallback;
    }

    return resolveLegacyFountainBlockType(nodeType) ?? fallback;
};

export const getScriptBlockId = (node: FountainJSONContent): string | null => {
    if (!isScriptBlockNode(node)) {
        return null;
    }

    const attrs = getNodeAttrs(node);
    const rawId = typeof attrs?.id === 'string'
        ? attrs.id.trim()
        : '';

    return rawId.length > 0 ? rawId : null;
};

export const createLegacyScriptBlockNode = (
    rawBlockType: unknown = ELEMENT_ACTION,
    id?: string,
): FountainJSONContent => {
    const blockType = resolveLegacyFountainBlockType(rawBlockType) ?? ELEMENT_ACTION;

    return {
        type: FOUNTAIN_BLOCK_NODE_NAME,
        attrs: {
            blockType,
            id: id ?? createNodeId(),
        },
        content: [],
    };
};

export const createDefaultScriptBlockNode = (
    rawBlockType: unknown = ELEMENT_ACTION,
    id?: string,
): FountainJSONContent => {
    const nodeType = resolveScriptBlockNodeType(rawBlockType) ?? DEFAULT_SCRIPT_BLOCK_NODE_TYPE;

    return {
        type: nodeType,
        attrs: {
            id: id ?? createNodeId(),
        },
        content: [],
    };
};

export const createEmptyScriptBlockNode = (
    rawBlockType: unknown = ELEMENT_ACTION,
    id?: string,
    nodeMode: ScriptDocumentNodeMode = DEFAULT_SCRIPT_DOCUMENT_NODE_MODE,
): FountainJSONContent => {
    if (nodeMode === 'default') {
        return createDefaultScriptBlockNode(rawBlockType, id);
    }

    return createLegacyScriptBlockNode(rawBlockType, id);
};

export const createEmptyScriptDocument = (
    blockId?: string,
    settings?: EditorSettingsOverride,
    options?: {nodeMode?: ScriptDocumentNodeMode},
): ScriptDocument => {
    const nodeMode = options?.nodeMode ?? DEFAULT_SCRIPT_DOCUMENT_NODE_MODE;
    const actBlock = createEmptyScriptBlockNode(ELEMENT_ACT, createNodeId(), nodeMode);

    return {
        type: 'doc',
        attrs: settings ? {settings} : undefined,
        content: [
            {
                ...actBlock,
                content: [{type: 'text', text: 'ONE'}],
            }, createEmptyScriptBlockNode(ELEMENT_SCENE_HEADING, blockId, nodeMode),
        ],
    };
};

export const createDefaultScriptDocument = (
    blockId?: string,
    settings?: EditorSettingsOverride,
): ScriptDocument => {
    return createEmptyScriptDocument(blockId, settings, {nodeMode: 'default'});
};
