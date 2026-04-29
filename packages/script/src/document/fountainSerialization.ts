import {
    ELEMENT_ACTION,
    type FountainElement,
    fountainSerializer,
    type FountainText,
} from '../fountain';
import {
    DEFAULT_EDITOR_SETTINGS,
    normalizeEditorSettingsBlockType,
    type StructureSettings,
} from '../settings';
import {
    FOUNTAIN_COLUMN_GROUP_NODE_NAME,
    FOUNTAIN_COLUMN_NODE_NAME,
    type FountainJSONContent,
    getScriptBlockLegacyType,
    isScriptBlockNode,
    type ScriptDocument,
} from './scriptDocument';

const hasMark = (node: FountainJSONContent, markType: 'bold' | 'italic' | 'underline') => {
    if (!Array.isArray(node.marks)) {
        return false;
    }

    return node.marks.some(mark => mark?.type === markType);
};

const inlineNodesToLeaves = (nodes: FountainJSONContent[] | undefined): FountainText[] => {
    const leaves: FountainText[] = [];

    const walk = (nodeList: FountainJSONContent[] | undefined) => {
        if (!Array.isArray(nodeList)) {
            return;
        }

        nodeList.forEach(node => {
            if (!node || typeof node !== 'object') {
                return;
            }

            if (typeof node.text === 'string') {
                leaves.push({
                    text: node.text,
                    bold: hasMark(node, 'bold') || undefined,
                    italic: hasMark(node, 'italic') || undefined,
                    underline: hasMark(node, 'underline') || undefined,
                });

                return;
            }

            walk(node.content);
        });
    };

    walk(nodes);

    if (leaves.length === 0) {
        return [{text: ''}];
    }

    return leaves;
};

const toFountainElement = (node: FountainJSONContent): FountainElement => {
    const rawBlockType = getScriptBlockLegacyType(node, ELEMENT_ACTION);
    const blockType = normalizeEditorSettingsBlockType(rawBlockType) ?? ELEMENT_ACTION;

    return {
        type: blockType,
        children: inlineNodesToLeaves(node.content),
    };
};

const collectFountainElements = (nodes: FountainJSONContent[] | undefined): FountainElement[] => {
    const elements: FountainElement[] = [];

    const walk = (nodeList: FountainJSONContent[] | undefined) => {
        if (!Array.isArray(nodeList)) {
            return;
        }

        nodeList.forEach(node => {
            if (!node || typeof node !== 'object') {
                return;
            }

            if (node.type === FOUNTAIN_COLUMN_GROUP_NODE_NAME) {
                const columns = Array.isArray(node.content) ? node.content : [];

                if (columns[0]?.type === FOUNTAIN_COLUMN_NODE_NAME) {
                    walk(columns[0].content);
                }

                if (columns[1]?.type === FOUNTAIN_COLUMN_NODE_NAME) {
                    walk(columns[1].content);
                }

                return;
            }

            if (node.type === FOUNTAIN_COLUMN_NODE_NAME) {
                walk(node.content);

                return;
            }

            if (isScriptBlockNode(node)) {
                elements.push(toFountainElement(node));

                return;
            }

            walk(node.content);
        });
    };

    walk(nodes);

    return elements;
};

export type ScriptDocumentFountainSerializationOptions = {
    structureSettings?: Partial<StructureSettings>,
    includeStructureSections?: boolean,
};

export const serializeScriptDocumentToFountain = (
    value: ScriptDocument,
    options?: ScriptDocumentFountainSerializationOptions,
): string => {
    const nodes = collectFountainElements(value.content);

    if (nodes.length === 0) {
        return '';
    }

    return fountainSerializer(nodes, {
        actPrefix: options?.structureSettings?.actPrefix ?? DEFAULT_EDITOR_SETTINGS.structure.actPrefix,
    });
};
