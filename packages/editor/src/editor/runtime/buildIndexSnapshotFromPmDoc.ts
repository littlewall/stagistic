import {
    canBlockTypeHaveCharacterTags,
    collectCharacterTags,
    collectCueAtoms,
    type CueBlockInput,
    deriveCues,
    extractCharacterKeys,
    type IndexedScriptBlock,
    type IndexedScriptCharacterRef,
    resolveScriptBlockNodeType,
    type ScriptBlockIndexSnapshot,
    type ScriptNode,
} from '@stagistic/script';
import type {Node as ProseMirrorNode} from '@tiptap/pm/model';

import {
    isCharacterBlockType,
    readNormalizedRefsFromAttrs,
} from '../characters/characterRefUtils';
import {
    isScriptBlockNodeName,
    normalizeBlockNodeType,
} from '../tiptap/scriptCore';

const toTagCharacterRefs = (node: ProseMirrorNode): IndexedScriptCharacterRef[] | null => {
    const idByKey = new Map<string, string | null>();
    const tags = collectCharacterTags(node.toJSON() as ScriptNode);

    tags.forEach(tag => {
        const existing = idByKey.get(tag.key);

        if (existing === undefined || (existing === null && tag.characterId)) {
            idByKey.set(tag.key, tag.characterId);
        }
    });

    if (idByKey.size === 0) {
        return null;
    }

    return Array.from(idByKey.entries())
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([key, characterId]) => ({key, characterId}));
};

const toCharacterRefs = (
    node: ProseMirrorNode,
    blockType: string,
    textContent: string,
    attrs: Record<string, unknown> | null | undefined,
): IndexedScriptCharacterRef[] | null => {
    if (!isCharacterBlockType(blockType)) {
        return canBlockTypeHaveCharacterTags(blockType) ? toTagCharacterRefs(node) : null;
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
    const resolvedBlockType = resolveScriptBlockNodeType(node.type.name)
        ?? attrs.blockType
        ?? 'stageDirection';

    return normalizeBlockNodeType(resolvedBlockType);
};

export const buildIndexSnapshotFromPmDoc = (doc: ProseMirrorNode): ScriptBlockIndexSnapshot => {
    const blocks: IndexedScriptBlock[] = [];
    const cueBlockInputs: CueBlockInput[] = [];
    let orderNo = 0;
    let currentActBlockId: string | null = null;
    let currentSceneBlockId: string | null = null;

    const visitNode = (node: ProseMirrorNode) => {
        if (!isScriptBlockNodeName(node.type.name)) {
            if (node.childCount > 0) {
                node.forEach(childNode => {
                    visitNode(childNode);
                });
            }

            return;
        }

        const blockType = resolveBlockType(node);
        const blockId = typeof node.attrs.id === 'string' && node.attrs.id.trim().length > 0
            ? node.attrs.id.trim()
            : `missing-block-${orderNo + 1}`;
        const textContent = node.textContent.trim();

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
            characterRefs: toCharacterRefs(
                node,
                blockType,
                textContent,
                node.attrs as Record<string, unknown>,
            ),
        });

        cueBlockInputs.push({
            blockId,
            blockType,
            cueAtoms: collectCueAtoms(node.toJSON() as ScriptNode),
        });

        orderNo += 1;
    };

    try {
        doc.forEach(node => {
            visitNode(node);
        });
    } catch {
        return {
            blocks: [],
            cues: [],
        };
    }

    return {
        blocks,
        cues: deriveCues(cueBlockInputs),
    };
};
