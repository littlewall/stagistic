import {
    ELEMENT_ACT,
    ELEMENT_SCENE_HEADING,
    ELEMENT_STAGE_DIRECTIONS,
    extractCharacterKeys,
    type IndexedScriptBlock,
    type IndexedScriptCharacterRef,
    resolveLegacyFountainBlockType,
    type ScriptBlockIndexSnapshot,
} from '@stagistic/script';
import type {Node as ProseMirrorNode} from '@tiptap/pm/model';

import {
    isCharacterBlockType,
    readNormalizedRefsFromAttrs,
} from '../characters/characterRefUtils';
import {
    FOUNTAIN_COLUMN_GROUP_NODE_NAME,
    FOUNTAIN_COLUMN_NODE_NAME,
    isFountainBlockNodeName,
    normalizeFountainBlockType,
} from '../tiptap/fountainCore';

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
    attrs: Record<string, unknown> | null | undefined,
): IndexedScriptCharacterRef[] | null => {
    if (!isCharacterBlockType(blockType)) {
        return null;
    }

    const refsByKey = readNormalizedRefsFromAttrs(attrs);
    const normalizedText = textContent.trim();
    const seenKeys = new Set<string>();
    const refRows: IndexedScriptCharacterRef[] = [];

    extractCharacterKeys(normalizedText).forEach(key => {
        if (seenKeys.has(key)) {
            return;
        }

        seenKeys.add(key);
        refRows.push({
            key,
            characterId: refsByKey[key] ?? null,
        });
    });

    if (!normalizedText && Object.keys(refsByKey).length === 0) {
        return null;
    }

    Object.entries(refsByKey)
        .sort((left, right) => left[0].localeCompare(right[0]))
        .forEach(([key, characterId]) => {
            if (seenKeys.has(key)) {
                return;
            }

            seenKeys.add(key);
            refRows.push({
                key,
                characterId,
            });
        });

    return refRows.length > 0 ? refRows : null;
};

const resolveBlockType = (node: ProseMirrorNode) => {
    const attrs = node.attrs as Record<string, unknown>;
    const resolvedBlockType = resolveLegacyFountainBlockType(node.type.name)
        ?? attrs.blockType
        ?? ELEMENT_STAGE_DIRECTIONS;

    return normalizeFountainBlockType(resolvedBlockType);
};

export const buildIndexSnapshotFromPmDoc = (doc: ProseMirrorNode): ScriptBlockIndexSnapshot => {
    const blocks: IndexedScriptBlock[] = [];
    let orderNo = 0;
    let columnGroupOrderCursor = 0;
    let currentActBlockId: string | null = null;
    let currentSceneBlockId: string | null = null;

    const visitNode = (
        node: ProseMirrorNode,
        context: WalkerContext,
    ) => {
        if (node.type.name === FOUNTAIN_COLUMN_GROUP_NODE_NAME) {
            const nextGroupOrder = columnGroupOrderCursor;
            let columnOrder = 0;

            columnGroupOrderCursor += 1;

            node.forEach(columnNode => {
                if (columnNode.type.name !== FOUNTAIN_COLUMN_NODE_NAME) {
                    return;
                }

                visitNode(columnNode, {
                    columnGroupOrder: nextGroupOrder,
                    columnOrder,
                });
                columnOrder += 1;
            });

            return;
        }

        if (node.type.name === FOUNTAIN_COLUMN_NODE_NAME) {
            node.forEach(childNode => {
                visitNode(childNode, context);
            });

            return;
        }

        if (!isFountainBlockNodeName(node.type.name)) {
            if (node.childCount > 0) {
                node.forEach(childNode => {
                    visitNode(childNode, context);
                });
            }

            return;
        }

        const blockType = resolveBlockType(node);
        const blockId = typeof node.attrs.id === 'string' && node.attrs.id.trim().length > 0
            ? node.attrs.id.trim()
            : `missing-block-${orderNo + 1}`;
        const textContent = node.textContent.trim();

        if (blockType === ELEMENT_ACT) {
            currentActBlockId = blockId;
        }

        if (blockType === ELEMENT_SCENE_HEADING) {
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
            characterRefs: toCharacterRefs(
                blockType,
                textContent,
                node.attrs as Record<string, unknown>,
            ),
        });

        orderNo += 1;
    };

    try {
        doc.forEach(node => {
            visitNode(node, EMPTY_CONTEXT);
        });
    } catch {
        return {
            blocks: [],
        };
    }

    return {
        blocks,
    };
};
