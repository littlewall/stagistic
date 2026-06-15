import {
    getCharacterRefByKey,
    getNodeTextContent,
    isCharacterBlockType,
} from '../characters/documentHelpers';
import {
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
    characterRefs: IndexedScriptCharacterRef[] | null,
}

export interface ScriptBlockIndexSnapshot {
    blocks: IndexedScriptBlock[],
}

export interface BuildScriptBlockIndexResult {
    snapshot: ScriptBlockIndexSnapshot,
    blockCount: number,
}

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
    let currentActBlockId: string | null = null;
    let currentSceneBlockId: string | null = null;

    const walkNodes = (nodes: ScriptNode[] | undefined) => {
        if (!Array.isArray(nodes) || nodes.length === 0) {
            return;
        }

        nodes.forEach(node => {
            if (!node || typeof node !== 'object') {
                return;
            }

            if (!isScriptBlockNode(node)) {
                walkNodes(node.content);

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
                characterRefs: toCharacterRefs(blockType, textContent, attrs),
            });

            orderNo += 1;
        });
    };

    walkNodes(value.content);

    return {
        snapshot: {
            blocks,
        },
        blockCount: blocks.length,
    };
};
