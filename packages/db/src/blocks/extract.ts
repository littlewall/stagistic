import type {FountainJSONContent, ScriptDocument} from '@stagistic/script';
import {isObjectRecord} from '@stagistic/shared';

import {
    getNodeTextContent,
    sanitizeInlineContentNode,
    toCharacterRefByKey,
    toExtractedImportMetadata,
} from './extractHelpers';
import type {
    ExtractedActRow,
    ExtractedBlockRow,
    ExtractedSceneRow,
    ExtractScriptBlocksResult,
} from './types';
import {
    ELEMENT_ACT,
    ELEMENT_ACTION,
    ELEMENT_SCENE_HEADING,
    FOUNTAIN_BLOCK_NODE_NAME,
    FOUNTAIN_COLUMN_GROUP_NODE_NAME,
    FOUNTAIN_COLUMN_NODE_NAME,
    makeActId,
    makeColumnGroupId,
    makeSceneId,
} from './types';

export {sanitizeInlineContentNode} from './extractHelpers';

const shouldPersistInlineContentJson = (content: FountainJSONContent[]): boolean => {
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

const toContentJsonForStorage = (node: FountainJSONContent): string | null => {
    const content = Array.isArray(node.content)
        ? node.content
            .map(sanitizeInlineContentNode)
            .filter((item): item is FountainJSONContent => Boolean(item))
        : [];

    if (!shouldPersistInlineContentJson(content)) {
        return null;
    }

    return JSON.stringify(content);
};

const normalizeBlockType = (attrs: Record<string, unknown> | undefined): string => {
    if (!attrs) {
        return ELEMENT_ACTION;
    }

    if (typeof attrs.blockType === 'string' && attrs.blockType.trim().length > 0) {
        return attrs.blockType;
    }

    return ELEMENT_ACTION;
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
            importMetadata,
            warnings,
        };
    }

    const blocks: ExtractedBlockRow[] = [];
    const acts: ExtractedActRow[] = [];
    const scenes: ExtractedSceneRow[] = [];
    const usedBlockIds = new Set<string>();
    const actByHeadingBlockId = new Map<string, ExtractedActRow>();
    const sceneByHeadingBlockId = new Map<string, ExtractedSceneRow>();

    let orderNo = 0;
    let columnGroupOrder = 0;
    let currentActHeadingBlockId: string | null = null;
    let currentSceneHeadingBlockId: string | null = null;

    const walk = (nodes: FountainJSONContent[] | undefined, context: {columnGroupId: string | null, columnIndex: number | null}) => {
        if (!Array.isArray(nodes) || nodes.length === 0) {
            return;
        }

        nodes.forEach(node => {
            if (!node || typeof node !== 'object') {
                return;
            }

            if (node.type === FOUNTAIN_COLUMN_GROUP_NODE_NAME) {
                const groupId = makeColumnGroupId(scriptId, columnGroupOrder);

                columnGroupOrder += 1;

                const columns = Array.isArray(node.content)
                    ? node.content
                    : [];

                columns.forEach((columnNode, columnIndex) => {
                    if (!columnNode || typeof columnNode !== 'object') {
                        return;
                    }

                    if (columnNode.type !== FOUNTAIN_COLUMN_NODE_NAME) {
                        return;
                    }

                    walk(columnNode.content, {
                        columnGroupId: groupId,
                        columnIndex,
                    });
                });

                return;
            }

            if (node.type === FOUNTAIN_COLUMN_NODE_NAME) {
                walk(node.content, context);

                return;
            }

            if (node.type !== FOUNTAIN_BLOCK_NODE_NAME) {
                walk(node.content, context);

                return;
            }

            const attrs = isObjectRecord(node.attrs)
                ? node.attrs
                : undefined;
            const blockType = normalizeBlockType(attrs);
            const blockId = resolveUniqueBlockId(scriptId, attrs?.id, orderNo, usedBlockIds, warnings);
            const textContent = getNodeTextContent(node).trim();
            const contentJson = toContentJsonForStorage(node);
            const characterRefByKey = toCharacterRefByKey(attrs);

            if (blockType === ELEMENT_ACT) {
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

            if (blockType === ELEMENT_SCENE_HEADING) {
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
                columnGroupId: context.columnGroupId,
                columnIndex: context.columnIndex,
                characterRefByKey,
            });

            orderNo += 1;
        });
    };

    walk(sourceDocument.content, {
        columnGroupId: null,
        columnIndex: null,
    });

    return {
        blocks,
        acts,
        scenes,
        importMetadata,
        warnings,
    };
};
