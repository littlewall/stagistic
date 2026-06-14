import {
    getCharacterRefByKey,
    getNodeTextContent,
    isCharacterBlockType,
} from '../characters/documentHelpers';
import {
    COLUMN_GROUP_NODE_NAME,
    COLUMN_NODE_NAME,
    getScriptBlockId,
    getScriptBlockNodeType,
    isScriptBlockNode,
    type ScriptDocument,
    type ScriptNode,
} from '../document';
import {
    extractCharacterKeys,
} from '../syntax';

export const SCRIPT_BLOCK_INDEX_SCHEMA_VERSION = 1;

export interface IndexedScriptCharacterRef {
    key: string,
    characterId: string | null,
}

export interface IndexedScriptBlock {
    blockId: string,
    orderNo: number,
    blockType: string,
    textContent: string,
    actBlockId: string | null,
    sceneBlockId: string | null,
    columnGroupOrder: number | null,
    columnOrder: number | null,
    characterRefs: IndexedScriptCharacterRef[] | null,
}

export interface ScriptBlockIndexSnapshot {
    blocks: IndexedScriptBlock[],
}

export interface BuildScriptBlockIndexResult {
    snapshot: ScriptBlockIndexSnapshot,
    blockCount: number,
}

interface WalkerContext {
    columnGroupOrder: number | null,
    columnOrder: number | null,
}

const EMPTY_CONTEXT: WalkerContext = {
    columnGroupOrder: null,
    columnOrder: null,
};

const toCharacterRefs = (
    blockType: string,
    textContent: string,
    attrs: Record<string, unknown> | undefined,
): IndexedScriptCharacterRef[] | null => {
    if (!isCharacterBlockType(blockType)) {
        return null;
    }

    const characterRefByKey = getCharacterRefByKey(attrs);
    const seenKeys = new Set<string>();
    const refs: IndexedScriptCharacterRef[] = [];

    extractCharacterKeys(textContent).forEach(key => {
        if (seenKeys.has(key)) {
            return;
        }

        seenKeys.add(key);
        refs.push({
            key,
            characterId: characterRefByKey[key] ?? null,
        });
    });

    Object.entries(characterRefByKey)
        .sort((a, b) => a[0].localeCompare(b[0]))
        .forEach(([key, characterId]) => {
            if (seenKeys.has(key)) {
                return;
            }

            seenKeys.add(key);
            refs.push({
                key,
                characterId,
            });
        });

    return refs.length > 0 ? refs : null;
};

export const buildScriptBlockIndex = (
    value: ScriptDocument | null | undefined,
): BuildScriptBlockIndexResult => {
    if (!value || !Array.isArray(value.content) || value.content.length === 0) {
        return {
            snapshot: {
                blocks: [],
            },
            blockCount: 0,
        };
    }

    const blocks: IndexedScriptBlock[] = [];
    let orderNo = 0;
    let columnGroupOrderCursor = 0;
    let currentActBlockId: string | null = null;
    let currentSceneBlockId: string | null = null;

    const walkNodes = (
        nodes: ScriptNode[] | undefined,
        context: WalkerContext,
    ) => {
        if (!Array.isArray(nodes) || nodes.length === 0) {
            return;
        }

        nodes.forEach(node => {
            if (!node || typeof node !== 'object') {
                return;
            }

            if (node.type === COLUMN_GROUP_NODE_NAME) {
                const nextGroupOrder = columnGroupOrderCursor;

                columnGroupOrderCursor += 1;

                const columns = Array.isArray(node.content) ? node.content : [];

                columns.forEach((columnNode, columnOrder) => {
                    if (!columnNode || typeof columnNode !== 'object') {
                        return;
                    }

                    if (columnNode.type !== COLUMN_NODE_NAME) {
                        return;
                    }

                    walkNodes(columnNode.content, {
                        columnGroupOrder: nextGroupOrder,
                        columnOrder,
                    });
                });

                return;
            }

            if (node.type === COLUMN_NODE_NAME) {
                walkNodes(node.content, context);

                return;
            }

            if (!isScriptBlockNode(node)) {
                walkNodes(node.content, context);

                return;
            }

            const attrs = node.attrs && typeof node.attrs === 'object'
                ? node.attrs
                : undefined;
            const blockType = getScriptBlockNodeType(node, 'stageDirection');
            const blockId = getScriptBlockId(node) ?? `missing-block-${orderNo + 1}`;
            const textContent = getNodeTextContent(node).trim();

            if (blockType === 'act') {
                currentActBlockId = blockId;
            }

            if (blockType === 'scene') {
                currentSceneBlockId = blockId;
            }

            blocks.push({
                blockId,
                orderNo,
                blockType,
                textContent,
                actBlockId: currentActBlockId,
                sceneBlockId: currentSceneBlockId,
                columnGroupOrder: context.columnGroupOrder,
                columnOrder: context.columnOrder,
                characterRefs: toCharacterRefs(blockType, textContent, attrs),
            });

            orderNo += 1;
        });
    };

    walkNodes(value.content, EMPTY_CONTEXT);

    return {
        snapshot: {
            blocks,
        },
        blockCount: blocks.length,
    };
};
