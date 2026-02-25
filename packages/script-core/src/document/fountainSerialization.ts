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
    buildMusicEndSectionLine,
    buildMusicStartSectionLine,
    collectStructureBlocks,
    normalizeScriptStructure,
} from '../structure';
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

type StructureSectionLines = {
    endLinesByIndex: Map<number, string[]>,
    startLinesByIndex: Map<number, string[]>,
    eofEndLines: string[],
};

const buildStructureSectionLines = (
    value: ScriptDocument,
    settings?: Partial<StructureSettings>,
): StructureSectionLines => {
    const normalizedStructure = normalizeScriptStructure(value.attrs?.structure, {
        content: value.content,
    });
    const blocks = collectStructureBlocks(value.content);
    const blockIndexById = new Map(blocks.filter(block => block.id).map(block => [block.id, block.index]));
    const endLinesByIndex = new Map<number, string[]>();
    const startLinesByIndex = new Map<number, string[]>();
    const eofEndLines: string[] = [];
    const pushLine = (lineMap: Map<number, string[]>, blockId: string, line: string) => {
        const blockIndex = blockIndexById.get(blockId);

        if (blockIndex === undefined) {
            return;
        }

        const lines = lineMap.get(blockIndex) ?? [];

        lines.push(line);
        lineMap.set(blockIndex, lines);
    };

    normalizedStructure.musicSegments.forEach(segment => {
        pushLine(
            startLinesByIndex,
            segment.startBlockId,
            buildMusicStartSectionLine(segment.musicType, segment.name, settings),
        );

        const endLine = buildMusicEndSectionLine(segment.musicType, segment.name, settings);

        if (segment.end.anchor === 'eof') {
            eofEndLines.push(endLine);

            return;
        }

        if (!segment.end.blockId) {
            return;
        }

        pushLine(endLinesByIndex, segment.end.blockId, endLine);
    });

    return {
        endLinesByIndex,
        startLinesByIndex,
        eofEndLines,
    };
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

    const includeStructureSections = options?.includeStructureSections ?? true;

    if (!includeStructureSections) {
        return fountainSerializer(nodes, {
            actPrefix: options?.structureSettings?.actPrefix ?? DEFAULT_EDITOR_SETTINGS.structure.actPrefix,
        });
    }

    const sectionLines = buildStructureSectionLines(value, options?.structureSettings);
    const serialized = fountainSerializer(nodes, {
        actPrefix: options?.structureSettings?.actPrefix ?? DEFAULT_EDITOR_SETTINGS.structure.actPrefix,
        beforeNodeLines: ({index}) => {
            const lines = (sectionLines.endLinesByIndex.get(index) ?? [])
                .concat(sectionLines.startLinesByIndex.get(index) ?? []);

            return lines.length > 0 ? lines : null;
        },
    });

    if (sectionLines.eofEndLines.length === 0) {
        return serialized;
    }

    if (!serialized) {
        return sectionLines.eofEndLines.join('\n');
    }

    return `${serialized}\n${sectionLines.eofEndLines.join('\n')}`;
};
