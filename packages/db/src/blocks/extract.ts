import type {ScriptDocument, ScriptNode} from '@stagistic/script';
import {
    collectCueAtoms,
    type CueBlockInput,
    deriveCues,
    getScriptBlockTypeFromNodeType,
    isScriptBlockNodeType,
} from '@stagistic/script';
import {isObjectRecord} from '@stagistic/shared';

import {
    getNodeTextContent,
    sanitizeInlineContentNode,
    toCharacterRefByKeyWithTags,
    toExtractedImportMetadata,
} from './extractHelpers';
import type {
    ExtractedActRow,
    ExtractedBlockRow,
    ExtractedCueRow,
    ExtractedSceneRow,
    ExtractScriptBlocksResult,
} from './types';
import {
    makeActId,
    makeSceneId,
} from './types';

export {sanitizeInlineContentNode} from './extractHelpers';

const shouldPersistInlineContentJson = (content: ScriptNode[]): boolean => {
    if (content.length === 0) {
        return false;
    }

    for (const node of content) {
        if (node.type !== 'text') {
            return true;
        }

        if (Array.isArray(node.marks) && node.marks.length > 0) {
            return true;
        }

        if (node.attrs && Object.keys(node.attrs).length > 0) {
            return true;
        }
    }

    return false;
};

const toContentJsonForStorage = (node: ScriptNode): string | null => {
    const content = Array.isArray(node.content)
        ? node.content
            .map(sanitizeInlineContentNode)
            .filter((item): item is ScriptNode => Boolean(item))
        : [];

    if (!shouldPersistInlineContentJson(content)) {
        return null;
    }

    return JSON.stringify(content);
};

const resolveUniqueBlockId = (
    scriptId: string,
    rawId: unknown,
    orderNo: number,
    usedBlockIds: Set<string>,
    warnings: string[],
): string => {
    const trimmedRaw = typeof rawId === 'string'
        ? rawId.trim()
        : '';
    const baseId = trimmedRaw.length > 0
        ? trimmedRaw
        : `rw-block:${scriptId}:${orderNo + 1}`;

    if (!usedBlockIds.has(baseId)) {
        usedBlockIds.add(baseId);

        if (trimmedRaw.length === 0) {
            warnings.push(`Script ${scriptId}: block #${orderNo + 1} had no id, generated ${baseId}.`);
        }

        return baseId;
    }

    let suffix = 1;
    let candidate = `${baseId}:${suffix}`;

    while (usedBlockIds.has(candidate)) {
        suffix += 1;
        candidate = `${baseId}:${suffix}`;
    }

    usedBlockIds.add(candidate);
    warnings.push(`Script ${scriptId}: duplicate block id ${baseId}, rewritten as ${candidate}.`);

    return candidate;
};

export const extractScriptBlocks = (
    scriptId: string,
    sourceDocument: ScriptDocument,
): ExtractScriptBlocksResult => {
    const warnings: string[] = [];
    const importMetadata = toExtractedImportMetadata(scriptId, sourceDocument);

    warnings.push(...importMetadata.warnings);

    if (!Array.isArray(sourceDocument.content)) {
        warnings.push(`Script ${scriptId}: source document has no content array.`);

        return {
            blocks: [],
            acts: [],
            scenes: [],
            cues: [],
            importMetadata,
            warnings,
        };
    }

    const blocks: ExtractedBlockRow[] = [];
    const acts: ExtractedActRow[] = [];
    const scenes: ExtractedSceneRow[] = [];
    const cueBlockInputs: CueBlockInput[] = [];
    const usedBlockIds = new Set<string>();
    const actByHeadingBlockId = new Map<string, ExtractedActRow>();
    const sceneByHeadingBlockId = new Map<string, ExtractedSceneRow>();

    let orderNo = 0;
    let currentActHeadingBlockId: string | null = null;
    let currentSceneHeadingBlockId: string | null = null;

    const walk = (nodes: ScriptNode[] | undefined) => {
        if (!Array.isArray(nodes) || nodes.length === 0) {
            return;
        }

        nodes.forEach((node: ScriptNode) => {
            if (!node || typeof node !== 'object') {
                return;
            }

            if (!isScriptBlockNodeType(node.type)) {
                walk(node.content);

                return;
            }

            const attrs = isObjectRecord(node.attrs)
                ? node.attrs
                : undefined;
            const blockType = getScriptBlockTypeFromNodeType(node.type);
            const blockId = resolveUniqueBlockId(scriptId, attrs?.id, orderNo, usedBlockIds, warnings);
            const textContent = getNodeTextContent(node).trim();
            const contentJson = toContentJsonForStorage(node);
            const characterRefByKey = toCharacterRefByKeyWithTags(node);

            if (blockType === 'act') {
                currentActHeadingBlockId = blockId;

                if (!actByHeadingBlockId.has(blockId)) {
                    const actRow: ExtractedActRow = {
                        id: makeActId(scriptId, blockId),
                        headingBlockId: blockId,
                        name: textContent.length > 0
                            ? textContent
                            : `ACT ${acts.length + 1}`,
                    };

                    actByHeadingBlockId.set(blockId, actRow);
                    acts.push(actRow);
                }
            }

            if (blockType === 'scene') {
                currentSceneHeadingBlockId = blockId;

                if (!sceneByHeadingBlockId.has(blockId)) {
                    const sceneRow: ExtractedSceneRow = {
                        id: makeSceneId(scriptId, blockId),
                        headingBlockId: blockId,
                    };

                    sceneByHeadingBlockId.set(blockId, sceneRow);
                    scenes.push(sceneRow);
                }
            }

            blocks.push({
                blockId,
                blockType,
                orderNo,
                textContent,
                contentJson,
                sceneHeadingBlockId: currentSceneHeadingBlockId,
                actHeadingBlockId: currentActHeadingBlockId,
                characterRefByKey,
            });

            cueBlockInputs.push({
                blockId,
                blockType,
                cueAtoms: collectCueAtoms(node),
            });

            orderNo += 1;
        });
    };

    walk(sourceDocument.content);

    const cues: ExtractedCueRow[] = deriveCues(cueBlockInputs).map(cue => ({
        id: cue.cueId,
        cueNumber: cue.number,
        mode: cue.mode,
        title: cue.title,
        kind: cue.kind,
        startBlockId: cue.startBlockId,
        endBlockId: cue.endBlockId,
    }));

    return {
        blocks,
        acts,
        scenes,
        cues,
        importMetadata,
        warnings,
    };
};
