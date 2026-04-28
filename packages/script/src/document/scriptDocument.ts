import {
    type ColumnElement,
    type ColumnGroupElement,
    ELEMENT_ACT,
    ELEMENT_ACTION,
    ELEMENT_COLUMN,
    ELEMENT_COLUMN_GROUP,
    ELEMENT_SCENE_HEADING,
    type FountainDocument as FountainAst,
    type FountainElement,
    type FountainElementType,
    type FountainText,
    isScriptBlockNodeType,
    resolveLegacyFountainBlockType,
    resolveScriptBlockNodeType,
    type ScriptBlockNodeType,
} from '../fountain';
import {createNodeId} from '../nodeId';
import {
    type EditorSettingsOverride,
    normalizeEditorSettingsBlockType,
} from '../settings/editorSettings';
import type {ScriptStructure} from '../structure';

/**
 * @deprecated Legacy monolithic block node. Prefer explicit node-per-type names.
 */
export const FOUNTAIN_BLOCK_NODE_NAME = 'fountainBlock';
export const FOUNTAIN_COLUMN_GROUP_NODE_NAME = 'fountainColumnGroup';
export const FOUNTAIN_COLUMN_NODE_NAME = 'fountainColumn';

const DEFAULT_SCRIPT_BLOCK_NODE_TYPE: ScriptBlockNodeType = 'action';
const DEFAULT_SCRIPT_DOCUMENT_NODE_MODE = 'default';

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
        structure?: ScriptStructure,
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

type TipTapMark = {
    type: string,
    attrs?: Record<string, unknown>,
};

const getNodeAttrs = (node: FountainJSONContent): Record<string, unknown> | undefined => {
    return node.attrs && typeof node.attrs === 'object'
        ? node.attrs
        : undefined;
};

const hasNodeChildren = (node: FountainJSONContent): node is FountainJSONContent & {content: FountainJSONContent[]} => {
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

const createLegacyScriptBlockNode = (
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

const createDefaultScriptBlockNode = (
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

const createEmptyScriptBlockNode = (
    rawBlockType: unknown = ELEMENT_ACTION,
    id?: string,
    nodeMode: ScriptDocumentNodeMode = DEFAULT_SCRIPT_DOCUMENT_NODE_MODE,
): FountainJSONContent => {
    if (nodeMode === 'default') {
        return createDefaultScriptBlockNode(rawBlockType, id);
    }

    return createLegacyScriptBlockNode(rawBlockType, id);
};

const marksToTipTap = (leaf: FountainText): TipTapMark[] | undefined => {
    const marks: TipTapMark[] = [];

    if (leaf.bold) {
        marks.push({type: 'bold'});
    }

    if (leaf.italic) {
        marks.push({type: 'italic'});
    }

    if (leaf.underline) {
        marks.push({type: 'underline'});
    }

    return marks.length > 0 ? marks : undefined;
};

const fountainTextToInlineContent = (children?: FountainText[]): FountainJSONContent[] => {
    if (!Array.isArray(children) || children.length === 0) {
        return [];
    }

    const content: FountainJSONContent[] = [];

    for (const child of children) {
        if (!child || typeof child !== 'object') {
            continue;
        }

        const text = typeof child.text === 'string' ? child.text : '';

        if (text.length === 0) {
            continue;
        }

        const marks = marksToTipTap(child);
        const node: FountainJSONContent = {type: 'text', text};

        if (marks) {
            node.marks = marks;
        }

        content.push(node);
    }

    return content;
};

const toScriptBlockNode = (
    block: FountainElement,
    nodeMode: ScriptDocumentNodeMode = DEFAULT_SCRIPT_DOCUMENT_NODE_MODE,
): FountainJSONContent => {
    const rawType = typeof block.type === 'string' ? block.type : ELEMENT_ACTION;
    const blockType = normalizeEditorSettingsBlockType(rawType) ?? ELEMENT_ACTION;
    const blockNode = createEmptyScriptBlockNode(blockType, createNodeId(), nodeMode);

    return {
        ...blockNode,
        content: fountainTextToInlineContent(block.children),
    };
};

const toFountainColumnNode = (
    column: ColumnElement,
    nodeMode: ScriptDocumentNodeMode = DEFAULT_SCRIPT_DOCUMENT_NODE_MODE,
): FountainJSONContent => {
    const children = Array.isArray(column.children) ? column.children : [];
    const content = children.map(child => toScriptBlockNode(child, nodeMode));
    const width = typeof column.width === 'string' ? column.width : undefined;

    return {
        type: FOUNTAIN_COLUMN_NODE_NAME,
        attrs: {
            width,
        },
        content: content.length > 0 ? content : [createEmptyScriptBlockNode(ELEMENT_ACTION, undefined, nodeMode)],
    };
};

const toFountainColumnGroupNode = (
    group: ColumnGroupElement,
    nodeMode: ScriptDocumentNodeMode = DEFAULT_SCRIPT_DOCUMENT_NODE_MODE,
): FountainJSONContent => {
    const children = Array.isArray(group.children) ? group.children : [];
    const content = children.map(child => toFountainColumnNode(child, nodeMode));

    return {
        type: FOUNTAIN_COLUMN_GROUP_NODE_NAME,
        content: content.length > 0
            ? content
            : [
                {
                    type: FOUNTAIN_COLUMN_NODE_NAME,
                    content: [createEmptyScriptBlockNode(ELEMENT_ACTION, undefined, nodeMode)],
                }, {
                    type: FOUNTAIN_COLUMN_NODE_NAME,
                    content: [createEmptyScriptBlockNode(ELEMENT_ACTION, undefined, nodeMode)],
                },
            ],
    };
};

const toFountainDocNode = (
    node: FountainAst[number],
    nodeMode: ScriptDocumentNodeMode = DEFAULT_SCRIPT_DOCUMENT_NODE_MODE,
): FountainJSONContent | null => {
    if (!node || typeof node !== 'object') {
        return null;
    }

    if (node.type === ELEMENT_COLUMN_GROUP) {
        return toFountainColumnGroupNode(node, nodeMode);
    }

    if (node.type === ELEMENT_COLUMN) {
        return null;
    }

    return toScriptBlockNode(node, nodeMode);
};

const convertNodeContent = (
    node: FountainJSONContent,
    converter: (child: FountainJSONContent) => FountainJSONContent,
): FountainJSONContent => {
    if (!hasNodeChildren(node)) {
        return node;
    }

    return {
        ...node,
        content: node.content.map(converter),
    };
};

const convertLegacyNodeToDefault = (node: FountainJSONContent): FountainJSONContent => {
    if (node.type !== FOUNTAIN_BLOCK_NODE_NAME) {
        return convertNodeContent(node, convertLegacyNodeToDefault);
    }

    const attrs = {
        ...getNodeAttrs(node) ?? {},
    };
    const nodeType = resolveScriptBlockNodeType(attrs.blockType) ?? DEFAULT_SCRIPT_BLOCK_NODE_TYPE;

    delete attrs.blockType;

    return {
        ...convertNodeContent(node, convertLegacyNodeToDefault),
        type: nodeType,
        attrs: Object.keys(attrs).length > 0 ? attrs : undefined,
    };
};

const convertDefaultNodeToLegacy = (node: FountainJSONContent): FountainJSONContent => {
    if (!isScriptBlockNodeType(node.type)) {
        return convertNodeContent(node, convertDefaultNodeToLegacy);
    }

    const attrs = {
        ...getNodeAttrs(node) ?? {},
        blockType: resolveLegacyFountainBlockType(node.type) ?? ELEMENT_ACTION,
    };

    return {
        ...convertNodeContent(node, convertDefaultNodeToLegacy),
        type: FOUNTAIN_BLOCK_NODE_NAME,
        attrs,
    };
};

export const convertLegacyScriptDocumentToDefault = (value: ScriptDocument): ScriptDocument => {
    if (!value || value.type !== 'doc' || !Array.isArray(value.content)) {
        return value;
    }

    return {
        ...value,
        content: value.content.map(convertLegacyNodeToDefault),
    };
};

export const convertDefaultScriptDocumentToLegacy = (value: ScriptDocument): ScriptDocument => {
    if (!value || value.type !== 'doc' || !Array.isArray(value.content)) {
        return value;
    }

    return {
        ...value,
        content: value.content.map(convertDefaultNodeToLegacy),
    };
};

export const normalizeScriptDocumentNodeMode = (
    value: ScriptDocument,
    nodeMode: ScriptDocumentNodeMode,
): ScriptDocument => {
    if (nodeMode === 'default') {
        return convertLegacyScriptDocumentToDefault(value);
    }

    return convertDefaultScriptDocumentToLegacy(value);
};

type ScriptDocumentFromFountainAstOptions = {
    settings?: EditorSettingsOverride,
    nodeMode?: ScriptDocumentNodeMode,
};

export const scriptDocumentFromFountainAst = (
    value: FountainAst,
    options?: ScriptDocumentFromFountainAstOptions,
): ScriptDocument => {
    const nodeMode = options?.nodeMode ?? DEFAULT_SCRIPT_DOCUMENT_NODE_MODE;
    const content = Array.isArray(value)
        ? value
            .map(node => toFountainDocNode(node, nodeMode))
            .filter((node): node is FountainJSONContent => Boolean(node))
        : [];

    if (content.length === 0) {
        return {
            type: 'doc',
            attrs: options?.settings ? {settings: options.settings} : undefined,
            content: [createEmptyScriptBlockNode(ELEMENT_SCENE_HEADING, undefined, nodeMode)],
        };
    }

    return {
        type: 'doc',
        attrs: options?.settings ? {settings: options.settings} : undefined,
        content,
    };
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
                content: [
                    {
                        type: 'text',
                        text: 'ONE',
                    },
                ],
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
