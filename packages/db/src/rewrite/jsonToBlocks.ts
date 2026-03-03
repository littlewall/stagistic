import {eq} from 'drizzle-orm';

import type {DbClient} from '../queries';
import {
    bulkUpsertScriptBlocks,
    listScriptCharacters,
    replaceScriptBlockCharacterRefs,
    replaceScriptTitlePageFields,
    upsertScriptAct,
    upsertScriptScene,
} from '../queries';
import {
    scriptActs,
    scriptBlocks,
    scriptScenes,
} from '../schema';

type FountainJSONMark = {
    type: string,
    attrs?: Record<string, unknown>,
};

type FountainJSONContent = {
    type?: string,
    attrs?: Record<string, unknown>,
    content?: FountainJSONContent[],
    marks?: FountainJSONMark[],
    text?: string,
};

type ScriptDocument = {
    type: 'doc',
    attrs?: Record<string, unknown>,
    content: FountainJSONContent[],
};

const ELEMENT_SCENE_HEADING = 'fountain_scene_heading';
const ELEMENT_ACT = 'fountain_act';
const ELEMENT_ACTION = 'fountain_action';

const FOUNTAIN_BLOCK_NODE_NAME = 'fountainBlock';
const FOUNTAIN_COLUMN_GROUP_NODE_NAME = 'fountainColumnGroup';
const FOUNTAIN_COLUMN_NODE_NAME = 'fountainColumn';

export type RewriteMigrationStatus = 'success' | 'partial' | 'failed';

export interface RewriteBlocksMigrationAudit {
    scriptId: string,
    trigger: string,
    status: RewriteMigrationStatus,
    migratedAt: number,
    legacyBlockCount: number,
    storedBlockCount: number,
    storedCharacterRefCount: number,
    warnings: string[],
    error: string | null,
}

export interface RewriteStoredBlockRow {
    id: string,
    blockType: string,
    orderNo: number,
    textContent: string,
    contentJson: string | null,
    columnGroupId: string | null,
    columnIndex: number | null,
}

export interface RewriteStoredBlockCharacterRefRow {
    blockId: string,
    characterKey: string,
    characterId: string,
}

export interface MigrateLegacyJsonToBlocksForScriptOptions {
    sourceDocument: ScriptDocument,
    force?: boolean,
    trigger?: string,
}

interface ExtractedActRow {
    id: string,
    headingBlockId: string,
    name: string,
}

interface ExtractedSceneRow {
    id: string,
    headingBlockId: string,
}

interface ExtractedBlockRow {
    blockId: string,
    blockType: string,
    orderNo: number,
    textContent: string,
    contentJson: string | null,
    sceneHeadingBlockId: string | null,
    actHeadingBlockId: string | null,
    columnGroupId: string | null,
    columnIndex: number | null,
    characterRefByKey: Record<string, string>,
}

interface ExtractedImportTitlePageField {
    fieldKey: string,
    fieldValue: string,
    orderNo: number,
}

interface ExtractedImportMetadata {
    titlePageFields: ExtractedImportTitlePageField[] | null,
    sceneSynopsisByHeadingBlockId: Map<string, string>,
    warnings: string[],
}

interface ExtractScriptBlocksResult {
    blocks: ExtractedBlockRow[],
    acts: ExtractedActRow[],
    scenes: ExtractedSceneRow[],
    importMetadata: ExtractedImportMetadata,
    warnings: string[],
}

interface PersistExtractedBlocksResult {
    storedBlockCount: number,
    storedCharacterRefCount: number,
    warnings: string[],
}

const COLUMN_GROUP_ID_PREFIX = 'rw-column-group';
const ACT_ID_PREFIX = 'rw-act';
const SCENE_ID_PREFIX = 'rw-scene';
const TITLE_PAGE_FIELD_ID_PREFIX = 'rw-title-page-field';

const makeColumnGroupId = (scriptId: string, orderNo: number) => {
    return `${COLUMN_GROUP_ID_PREFIX}:${scriptId}:${orderNo}`;
};

const makeActId = (scriptId: string, headingBlockId: string) => {
    return `${ACT_ID_PREFIX}:${scriptId}:${headingBlockId}`;
};

const makeSceneId = (scriptId: string, headingBlockId: string) => {
    return `${SCENE_ID_PREFIX}:${scriptId}:${headingBlockId}`;
};

const makeTitlePageFieldId = (scriptId: string, orderNo: number) => {
    return `${TITLE_PAGE_FIELD_ID_PREFIX}:${scriptId}:${orderNo + 1}`;
};

const isObjectRecord = (value: unknown): value is Record<string, unknown> => {
    return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
};

const collapseWhitespace = (value: string): string => {
    return value.trim().replace(/\s+/g, ' ');
};

const normalizeCharacterKey = (rawValue: string): string => {
    const collapsed = collapseWhitespace(rawValue);

    if (collapsed.length === 0) {
        return '';
    }

    let base = collapsed;
    let next = base.replace(/\s*\([^()]*\)\s*$/, '').trimEnd();

    while (next !== base) {
        base = next;
        next = base.replace(/\s*\([^()]*\)\s*$/, '').trimEnd();
    }

    return collapseWhitespace(base).toUpperCase();
};

const getNodeTextContent = (node: FountainJSONContent): string => {
    if (typeof node.text === 'string') {
        return node.text;
    }

    if (!Array.isArray(node.content)) {
        return '';
    }

    return node.content.map(getNodeTextContent).join('');
};

const toCharacterRefByKey = (attrs: Record<string, unknown> | undefined): Record<string, string> => {
    if (!attrs || !isObjectRecord(attrs.characterRefs)) {
        return {};
    }

    const characterRefByKey: Record<string, string> = {};

    Object.entries(attrs.characterRefs).forEach(([rawKey, rawCharacterId]) => {
        if (typeof rawCharacterId !== 'string' || rawCharacterId.length === 0) {
            return;
        }

        const key = normalizeCharacterKey(rawKey);

        if (key.length === 0) {
            return;
        }

        characterRefByKey[key] = rawCharacterId;
    });

    return characterRefByKey;
};

const toExtractedImportMetadata = (
    scriptId: string,
    sourceDocument: ScriptDocument,
): ExtractedImportMetadata => {
    const warnings: string[] = [];
    const attrs = isObjectRecord(sourceDocument.attrs)
        ? sourceDocument.attrs
        : {};
    const importMeta = isObjectRecord(attrs.importMeta)
        ? attrs.importMeta
        : null;

    if (!importMeta) {
        return {
            titlePageFields: null,
            sceneSynopsisByHeadingBlockId: new Map(),
            warnings,
        };
    }

    const titlePageFieldsRaw = importMeta.titlePageFields;
    const titlePageFields = Array.isArray(titlePageFieldsRaw)
        ? titlePageFieldsRaw
            .map((field, index) => {
                if (!isObjectRecord(field)) {
                    warnings.push(`Script ${scriptId}: invalid title page field at index ${index}.`);

                    return null;
                }

                const fieldKey = typeof field.fieldKey === 'string'
                    ? field.fieldKey.trim()
                    : '';
                const fieldValue = typeof field.value === 'string'
                    ? field.value.trim()
                    : '';
                const orderNo = typeof field.orderNo === 'number' && Number.isFinite(field.orderNo)
                    ? Math.max(0, Math.floor(field.orderNo))
                    : index;

                if (fieldKey.length === 0) {
                    warnings.push(`Script ${scriptId}: skipped title page field with empty key at index ${index}.`);

                    return null;
                }

                return {
                    fieldKey,
                    fieldValue,
                    orderNo,
                };
            })
            .filter((field): field is ExtractedImportTitlePageField => Boolean(field))
            .sort((a, b) => a.orderNo - b.orderNo)
            .map((field, index) => ({
                ...field,
                orderNo: index,
            }))
        : null;
    const sceneSynopsisByHeadingBlockId = new Map<string, string>();

    if (Array.isArray(importMeta.sceneSynopses)) {
        importMeta.sceneSynopses.forEach((entry, index) => {
            if (!isObjectRecord(entry)) {
                warnings.push(`Script ${scriptId}: invalid scene synopsis at index ${index}.`);

                return;
            }

            const headingBlockId = typeof entry.headingBlockId === 'string'
                ? entry.headingBlockId.trim()
                : '';
            const synopsis = typeof entry.synopsis === 'string'
                ? entry.synopsis.trim()
                : '';

            if (headingBlockId.length === 0 || synopsis.length === 0) {
                return;
            }

            const currentSynopsis = sceneSynopsisByHeadingBlockId.get(headingBlockId);

            if (!currentSynopsis) {
                sceneSynopsisByHeadingBlockId.set(headingBlockId, synopsis);

                return;
            }

            sceneSynopsisByHeadingBlockId.set(headingBlockId, `${currentSynopsis}\n${synopsis}`);
        });
    }

    return {
        titlePageFields,
        sceneSynopsisByHeadingBlockId,
        warnings,
    };
};

const sanitizeInlineContentNode = (node: unknown): FountainJSONContent | null => {
    if (!isObjectRecord(node)) {
        return null;
    }

    const result: FountainJSONContent = {};

    if (typeof node.type === 'string') {
        result.type = node.type;
    }

    if (typeof node.text === 'string') {
        result.text = node.text;
    }

    if (isObjectRecord(node.attrs)) {
        result.attrs = node.attrs;
    }

    if (Array.isArray(node.content)) {
        const sanitizedChildren = node.content
            .map(sanitizeInlineContentNode)
            .filter((item): item is FountainJSONContent => Boolean(item));

        result.content = sanitizedChildren;
    }

    if (Array.isArray(node.marks)) {
        const marks = node.marks
            .filter((mark): mark is {type: string, attrs?: Record<string, unknown>} => {
                return isObjectRecord(mark) && typeof mark.type === 'string';
            })
            .map(mark => {
                if (!isObjectRecord(mark.attrs)) {
                    return {type: mark.type};
                }

                return {
                    type: mark.type,
                    attrs: mark.attrs,
                };
            });

        if (marks.length > 0) {
            result.marks = marks;
        }
    }

    return result;
};

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

const toFallbackTextInlineContent = (textContent: string): FountainJSONContent[] => {
    if (textContent.length === 0) {
        return [];
    }

    return [
        {
            type: 'text',
            text: textContent,
        },
    ];
};

const parseStoredContentJson = (
    scriptId: string,
    blockId: string,
    contentJson: string | null,
    textContent: string,
    warnings: string[],
): FountainJSONContent[] => {
    if (!contentJson || contentJson.trim().length === 0) {
        return toFallbackTextInlineContent(textContent);
    }

    try {
        const parsed = JSON.parse(contentJson) as unknown;

        if (!Array.isArray(parsed)) {
            warnings.push(`Script ${scriptId}: block ${blockId} has invalid content_json shape.`);

            return toFallbackTextInlineContent(textContent);
        }

        return parsed
            .map(sanitizeInlineContentNode)
            .filter((item): item is FountainJSONContent => Boolean(item));
    } catch (error) {
        warnings.push(
            `Script ${scriptId}: block ${blockId} has unparsable content_json (${error instanceof Error ? error.message : String(error)}).`,
        );

        return toFallbackTextInlineContent(textContent);
    }
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

const resolveStatus = (warnings: string[], error: string | null): RewriteMigrationStatus => {
    if (error) {
        return 'failed';
    }

    if (warnings.length > 0) {
        return 'partial';
    }

    return 'success';
};

const extractScriptBlocks = (
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

const persistExtractedBlocks = async (
    db: DbClient,
    scriptId: string,
    extracted: ExtractScriptBlocksResult,
    migratedAt: number,
): Promise<PersistExtractedBlocksResult> => {
    const warnings: string[] = [];

    const scriptCharacters = await listScriptCharacters(db, scriptId);
    const existingScenes = await db
        .select()
        .from(scriptScenes)
        .where(eq(scriptScenes.scriptId, scriptId));
    const characterIdSet = new Set(scriptCharacters.map(character => character.id));
    const sceneIdByHeadingBlockId = new Map<string, string>();
    const actIdByHeadingBlockId = new Map<string, string>();
    const existingSceneByHeadingBlockId = new Map<string, typeof existingScenes[number]>();

    existingScenes.forEach(scene => {
        if (!scene.headingBlockId) {
            return;
        }

        existingSceneByHeadingBlockId.set(scene.headingBlockId, scene);
    });

    extracted.scenes.forEach(scene => {
        sceneIdByHeadingBlockId.set(scene.headingBlockId, scene.id);
    });

    extracted.acts.forEach(act => {
        actIdByHeadingBlockId.set(act.headingBlockId, act.id);
    });

    const validCharacterRefsByBlockId = new Map<string, RewriteStoredBlockCharacterRefRow[]>();

    extracted.blocks.forEach(block => {
        const refs = Object.entries(block.characterRefByKey)
            .sort((a, b) => a[0].localeCompare(b[0]))
            .reduce<RewriteStoredBlockCharacterRefRow[]>((accumulator, [characterKey, characterId]) => {
                if (!characterIdSet.has(characterId)) {
                    warnings.push(
                        `Script ${scriptId}: block ${block.blockId} has unknown character id ${characterId} for key ${characterKey}.`,
                    );

                    return accumulator;
                }

                accumulator.push({
                    blockId: block.blockId,
                    characterKey,
                    characterId,
                });

                return accumulator;
            }, []);

        validCharacterRefsByBlockId.set(block.blockId, refs);
    });

    await db.transaction(async tx => {
        await tx
            .delete(scriptBlocks)
            .where(eq(scriptBlocks.scriptId, scriptId));

        await tx
            .delete(scriptScenes)
            .where(eq(scriptScenes.scriptId, scriptId));

        await tx
            .delete(scriptActs)
            .where(eq(scriptActs.scriptId, scriptId));

        for (const act of extracted.acts) {
            await upsertScriptAct(tx, {
                id: act.id,
                scriptId,
                headingBlockId: act.headingBlockId,
                name: act.name,
                createdAt: migratedAt,
                updatedAt: migratedAt,
            });
        }

        for (const scene of extracted.scenes) {
            const existingScene = existingSceneByHeadingBlockId.get(scene.headingBlockId) ?? null;
            const importedSynopsis = extracted.importMetadata.sceneSynopsisByHeadingBlockId.get(scene.headingBlockId);

            await upsertScriptScene(tx, {
                id: scene.id,
                scriptId,
                headingBlockId: scene.headingBlockId,
                sceneNumber: existingScene?.sceneNumber ?? null,
                colorHex: existingScene?.colorHex ?? null,
                synopsis: importedSynopsis ?? existingScene?.synopsis ?? null,
                locationId: existingScene?.locationId ?? null,
                createdAt: existingScene?.createdAt ?? migratedAt,
                updatedAt: migratedAt,
            });
        }

        if (extracted.importMetadata.titlePageFields !== null) {
            await replaceScriptTitlePageFields(
                tx,
                scriptId,
                extracted.importMetadata.titlePageFields.map(field => ({
                    id: makeTitlePageFieldId(scriptId, field.orderNo),
                    fieldKey: field.fieldKey,
                    fieldValue: field.fieldValue,
                    orderNo: field.orderNo,
                    createdAt: migratedAt,
                    updatedAt: migratedAt,
                })),
            );
        }

        await bulkUpsertScriptBlocks(tx, extracted.blocks.map(block => ({
            id: block.blockId,
            scriptId,
            blockType: block.blockType,
            orderNo: block.orderNo,
            textContent: block.textContent,
            contentJson: block.contentJson,
            sceneId: block.sceneHeadingBlockId
                ? sceneIdByHeadingBlockId.get(block.sceneHeadingBlockId) ?? null
                : null,
            actId: block.actHeadingBlockId
                ? actIdByHeadingBlockId.get(block.actHeadingBlockId) ?? null
                : null,
            columnGroupId: block.columnGroupId,
            columnIndex: block.columnIndex,
            createdAt: migratedAt,
            updatedAt: migratedAt,
        })));

        for (const block of extracted.blocks) {
            await replaceScriptBlockCharacterRefs(
                tx,
                block.blockId,
                (validCharacterRefsByBlockId.get(block.blockId) ?? []).map(ref => ({
                    characterId: ref.characterId,
                    characterKey: ref.characterKey,
                    isConfirmed: true,
                })),
            );
        }
    });

    const storedCharacterRefCount = Array.from(validCharacterRefsByBlockId.values())
        .reduce((sum, refs) => {
            return sum + refs.length;
        }, 0);

    return {
        storedBlockCount: extracted.blocks.length,
        storedCharacterRefCount,
        warnings,
    };
};

const toAudit = (
    scriptId: string,
    trigger: string,
    migratedAt: number,
    legacyBlockCount: number,
    storedBlockCount: number,
    storedCharacterRefCount: number,
    warnings: string[],
    error: string | null,
): RewriteBlocksMigrationAudit => {
    return {
        scriptId,
        trigger,
        status: resolveStatus(warnings, error),
        migratedAt,
        legacyBlockCount,
        storedBlockCount,
        storedCharacterRefCount,
        warnings,
        error,
    };
};

const toScriptDocumentFromStoredRows = (
    scriptId: string,
    blockRows: RewriteStoredBlockRow[],
    characterRefRows: RewriteStoredBlockCharacterRefRow[],
): {document: ScriptDocument, warnings: string[]} => {
    const warnings: string[] = [];

    const characterRefsByBlockId = new Map<string, Record<string, string>>();

    characterRefRows.forEach(row => {
        const current = characterRefsByBlockId.get(row.blockId) ?? {};

        current[row.characterKey] = row.characterId;
        characterRefsByBlockId.set(row.blockId, current);
    });

    const blockRowsSorted = [...blockRows]
        .sort((a, b) => a.orderNo - b.orderNo);

    const createBlockNode = (row: RewriteStoredBlockRow): FountainJSONContent => {
        const attrs: Record<string, unknown> = {
            id: row.id,
            blockType: row.blockType,
        };
        const characterRefByKey = characterRefsByBlockId.get(row.id);

        if (characterRefByKey && Object.keys(characterRefByKey).length > 0) {
            attrs.characterRefs = characterRefByKey;
        }

        return {
            type: FOUNTAIN_BLOCK_NODE_NAME,
            attrs,
            content: parseStoredContentJson(
                scriptId,
                row.id,
                row.contentJson,
                row.textContent,
                warnings,
            ),
        };
    };

    const content: FountainJSONContent[] = [];

    let cursor = 0;

    while (cursor < blockRowsSorted.length) {
        const row = blockRowsSorted[cursor];

        if (!row.columnGroupId) {
            content.push(createBlockNode(row));
            cursor += 1;
            continue;
        }

        const groupId = row.columnGroupId;
        const groupedRows: RewriteStoredBlockRow[] = [];

        while (cursor < blockRowsSorted.length && blockRowsSorted[cursor].columnGroupId === groupId) {
            groupedRows.push(blockRowsSorted[cursor]);
            cursor += 1;
        }

        if (groupedRows.length === 0) {
            continue;
        }

        const blocksByColumn = new Map<number, FountainJSONContent[]>();

        groupedRows.forEach(groupRow => {
            const columnIndex = typeof groupRow.columnIndex === 'number'
                ? groupRow.columnIndex
                : 0;

            if (groupRow.columnIndex === null) {
                warnings.push(
                    `Script ${scriptId}: block ${groupRow.id} had null column_index in group ${groupId}; treated as column 0.`,
                );
            }

            const currentColumn = blocksByColumn.get(columnIndex) ?? [];

            currentColumn.push(createBlockNode(groupRow));
            blocksByColumn.set(columnIndex, currentColumn);
        });

        const columnIndexes = Array.from(blocksByColumn.keys())
            .sort((a, b) => a - b);

        const columns: FountainJSONContent[] = columnIndexes.map(columnIndex => {
            return {
                type: FOUNTAIN_COLUMN_NODE_NAME,
                content: blocksByColumn.get(columnIndex) ?? [],
            };
        });

        content.push({
            type: FOUNTAIN_COLUMN_GROUP_NODE_NAME,
            content: columns,
        });
    }

    return {
        document: {
            type: 'doc',
            content,
        },
        warnings,
    };
};

export const rebuildScriptDocumentFromBlocks = (
    scriptId: string,
    blockRows: RewriteStoredBlockRow[],
    characterRefRows: RewriteStoredBlockCharacterRefRow[],
): {document: ScriptDocument, warnings: string[]} => {
    return toScriptDocumentFromStoredRows(scriptId, blockRows, characterRefRows);
};

export const migrateLegacyJsonToBlocksForScript = async (
    db: DbClient,
    scriptId: string,
    options?: MigrateLegacyJsonToBlocksForScriptOptions,
): Promise<RewriteBlocksMigrationAudit> => {
    const trigger = options?.trigger ?? 'manual';
    const migratedAt = Date.now();
    const warnings: string[] = [];
    const sourceDocument = options?.sourceDocument ?? null;

    if (!options?.force) {
        const existingRows = await db
            .select({id: scriptBlocks.id})
            .from(scriptBlocks)
            .where(eq(scriptBlocks.scriptId, scriptId))
            .limit(1);

        if (existingRows.length > 0) {
            return toAudit(
                scriptId,
                trigger,
                migratedAt,
                0,
                0,
                0,
                warnings,
                null,
            );
        }
    }

    if (!sourceDocument || !Array.isArray(sourceDocument.content)) {
        return toAudit(
            scriptId,
            trigger,
            migratedAt,
            0,
            0,
            0,
            warnings,
            `Script ${scriptId}: sourceDocument is required for block migration.`,
        );
    }

    const extracted = extractScriptBlocks(scriptId, sourceDocument);

    warnings.push(...extracted.warnings);

    try {
        const persisted = await persistExtractedBlocks(db, scriptId, extracted, migratedAt);

        warnings.push(...persisted.warnings);

        return toAudit(
            scriptId,
            trigger,
            migratedAt,
            extracted.blocks.length,
            persisted.storedBlockCount,
            persisted.storedCharacterRefCount,
            warnings,
            null,
        );
    } catch (error) {
        return toAudit(
            scriptId,
            trigger,
            migratedAt,
            extracted.blocks.length,
            0,
            0,
            warnings,
            error instanceof Error
                ? error.message
                : String(error),
        );
    }
};
