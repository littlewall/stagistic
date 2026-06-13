import {createNodeId} from '@stagistic/shared';

import {
    type ColumnElement,
    type ColumnGroupElement,
    ELEMENT_COLUMN,
    ELEMENT_COLUMN_GROUP,
    ELEMENT_SCENE_HEADING,
    ELEMENT_STAGE_DIRECTIONS,
    type FountainDocument as FountainAst,
    type FountainElement,
    type FountainText,
    isScriptBlockNodeType,
    resolveLegacyFountainBlockType,
    resolveScriptBlockNodeType,
} from '../fountain';
import {
    type EditorSettingsOverride,
    normalizeEditorSettingsBlockType,
} from '../settings';
import {
    createEmptyScriptBlockNode,
    DEFAULT_SCRIPT_BLOCK_NODE_TYPE,
    DEFAULT_SCRIPT_DOCUMENT_NODE_MODE,
    FOUNTAIN_BLOCK_NODE_NAME,
    FOUNTAIN_COLUMN_GROUP_NODE_NAME,
    FOUNTAIN_COLUMN_NODE_NAME,
    type FountainJSONContent,
    getNodeAttrs,
    hasNodeChildren,
    type ScriptDocument,
    type ScriptDocumentNodeMode,
} from './scriptDocument';

type TipTapMark = {
    type: string,
    attrs?: Record<string, unknown>,
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
    const rawType = typeof block.type === 'string' ? block.type : ELEMENT_STAGE_DIRECTIONS;
    const blockType = normalizeEditorSettingsBlockType(rawType) ?? ELEMENT_STAGE_DIRECTIONS;
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
        content: content.length > 0 ? content : [createEmptyScriptBlockNode(ELEMENT_STAGE_DIRECTIONS, undefined, nodeMode)],
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
                    content: [createEmptyScriptBlockNode(ELEMENT_STAGE_DIRECTIONS, undefined, nodeMode)],
                }, {
                    type: FOUNTAIN_COLUMN_NODE_NAME,
                    content: [createEmptyScriptBlockNode(ELEMENT_STAGE_DIRECTIONS, undefined, nodeMode)],
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
        blockType: resolveLegacyFountainBlockType(node.type) ?? ELEMENT_STAGE_DIRECTIONS,
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

