import {
    type ColumnElement,
    type ColumnGroupElement,
    ELEMENT_ACTION,
    ELEMENT_COLUMN,
    ELEMENT_COLUMN_GROUP,
    ELEMENT_SCENE_HEADING,
    type FountainDocument as FountainAst,
    type FountainElement,
    type FountainText,
} from '../fountain';
import {createNodeId} from '../nodeId';
import {
    type EditorSettingsOverride,
    normalizeEditorSettingsBlockType,
} from '../settings/editorSettings';

export const FOUNTAIN_BLOCK_NODE_NAME = 'fountainBlock';
export const FOUNTAIN_COLUMN_GROUP_NODE_NAME = 'fountainColumnGroup';
export const FOUNTAIN_COLUMN_NODE_NAME = 'fountainColumn';

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
    },
    content: FountainJSONContent[],
};

type TipTapMark = {
    type: string,
    attrs?: Record<string, unknown>,
};

const createEmptyFountainBlock = (
    blockType: string = ELEMENT_ACTION,
    id?: string,
): FountainJSONContent => ({
    type: FOUNTAIN_BLOCK_NODE_NAME,
    attrs: {
        blockType,
        id: id ?? createNodeId(),
    },
    content: [],
});

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

const toFountainBlockNode = (block: FountainElement): FountainJSONContent => {
    const rawType = typeof block.type === 'string' ? block.type : ELEMENT_ACTION;
    const blockType = normalizeEditorSettingsBlockType(rawType) ?? rawType;

    return {
        type: FOUNTAIN_BLOCK_NODE_NAME,
        attrs: {
            blockType,
            id: createNodeId(),
        },
        content: fountainTextToInlineContent(block.children),
    };
};

const toFountainColumnNode = (column: ColumnElement): FountainJSONContent => {
    const children = Array.isArray(column.children) ? column.children : [];
    const content = children.map(child => toFountainBlockNode(child));
    const width = typeof column.width === 'string' ? column.width : undefined;

    return {
        type: FOUNTAIN_COLUMN_NODE_NAME,
        attrs: {
            width,
        },
        content: content.length > 0 ? content : [createEmptyFountainBlock()],
    };
};

const toFountainColumnGroupNode = (group: ColumnGroupElement): FountainJSONContent => {
    const children = Array.isArray(group.children) ? group.children : [];
    const content = children.map(child => toFountainColumnNode(child));

    return {
        type: FOUNTAIN_COLUMN_GROUP_NODE_NAME,
        content: content.length > 0
            ? content
            : [
                {
                    type: FOUNTAIN_COLUMN_NODE_NAME,
                    content: [createEmptyFountainBlock()],
                }, {
                    type: FOUNTAIN_COLUMN_NODE_NAME,
                    content: [createEmptyFountainBlock()],
                },
            ],
    };
};

const toFountainDocNode = (node: FountainAst[number]): FountainJSONContent | null => {
    if (!node || typeof node !== 'object') {
        return null;
    }

    if (node.type === ELEMENT_COLUMN_GROUP) {
        return toFountainColumnGroupNode(node);
    }

    if (node.type === ELEMENT_COLUMN) {
        return null;
    }

    return toFountainBlockNode(node);
};

export const scriptDocumentFromFountainAst = (
    value: FountainAst,
    options?: {settings?: EditorSettingsOverride},
): ScriptDocument => {
    const content = Array.isArray(value)
        ? value
            .map(node => toFountainDocNode(node))
            .filter((node): node is FountainJSONContent => Boolean(node))
        : [];

    if (content.length === 0) {
        return {
            type: 'doc',
            attrs: options?.settings ? {settings: options.settings} : undefined,
            content: [createEmptyFountainBlock(ELEMENT_SCENE_HEADING)],
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
): ScriptDocument => ({
    type: 'doc',
    attrs: settings ? {settings} : undefined,
    content: [createEmptyFountainBlock(ELEMENT_SCENE_HEADING, blockId)],
});
