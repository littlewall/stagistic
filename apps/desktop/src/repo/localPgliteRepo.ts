import {dbQueries, type ScriptSummary} from '@stagistic/db';
import {
    ELEMENT_ACTION,
    ELEMENT_CENTERED,
    ELEMENT_CHARACTER,
    ELEMENT_DIALOGUE,
    ELEMENT_DUAL_DIALOGUE,
    ELEMENT_DUAL_DIALOGUE_CHARACTER,
    ELEMENT_LYRICS,
    ELEMENT_PARENTHETICAL,
    ELEMENT_SCENE_HEADING,
    ELEMENT_TRANSITION,
    type FountainElementType,
} from '@stagistic/editor-core';
import {
    BLOCK_CASING_OPTIONS,
    BLOCK_SHORTCUT_OPTIONS,
    BLOCK_TEXT_ALIGN_OPTIONS,
    type BlockCasing,
    type BlockShortcut,
    type BlockTextAlign,
    type EditorSettingsOverride,
    LATEST_SCRIPT_SCHEMA_VERSION,
    type ScriptDocument,
} from '@stagistic/shared';
import {uuidv7} from '@stagistic/shared';
import type {ScriptRepository} from '@stagistic/sync-core';

import {getLocalDb} from '~db';

const ENABLE_OUTBOX = false;

const serializeDocument = (value: ScriptDocument) => JSON.stringify(value);

const parseDocument = (value: string) => JSON.parse(value) as ScriptDocument;

const toMillis = (value?: number) => {
    if (typeof value === 'number') {
        return Math.round(value * 1000);
    }

    return null;
};

const fromMillis = (value?: number | null) => {
    if (typeof value === 'number') {
        return value / 1000;
    }

    return undefined;
};

const isObjectRecord = (value: unknown): value is Record<string, unknown> => Boolean(value)
    && typeof value === 'object'
    && !Array.isArray(value);

const parseJson = (value: string): unknown => {
    try {
        return JSON.parse(value) as unknown;
    } catch {
        return null;
    }
};

const FOUNTAIN_ELEMENT_TYPES = new Set<FountainElementType>([
    ELEMENT_SCENE_HEADING,
    ELEMENT_ACTION,
    ELEMENT_CHARACTER,
    ELEMENT_DUAL_DIALOGUE_CHARACTER,
    ELEMENT_PARENTHETICAL,
    ELEMENT_DIALOGUE,
    ELEMENT_DUAL_DIALOGUE,
    ELEMENT_TRANSITION,
    ELEMENT_LYRICS,
    ELEMENT_CENTERED,
]);

const isFountainElementType = (value: unknown): value is FountainElementType => typeof value === 'string' && FOUNTAIN_ELEMENT_TYPES.has(value as FountainElementType);
const isBlockTextAlign = (value: unknown): value is BlockTextAlign => {
    return typeof value === 'string'
        && BLOCK_TEXT_ALIGN_OPTIONS.includes(value as BlockTextAlign);
};

const isBlockCasing = (value: unknown): value is BlockCasing => {
    return typeof value === 'string'
        && BLOCK_CASING_OPTIONS.includes(value as BlockCasing);
};

const isBlockShortcut = (value: unknown): value is BlockShortcut => {
    return typeof value === 'string'
        && BLOCK_SHORTCUT_OPTIONS.includes(value as BlockShortcut);
};

const isScriptSettingsPayload = (value: unknown): value is Pick<EditorSettingsOverride, 'page' | 'typography'> => {
    if (!isObjectRecord(value)) {
        return false;
    }

    const page = value.page;
    const typography = value.typography;

    return (page === undefined || isObjectRecord(page))
        && (typography === undefined || isObjectRecord(typography));
};

export const createLocalPgliteRepository = (): ScriptRepository => {
    const dbPromise = getLocalDb();

    const getDb = async () => dbPromise;

    const recordOutbox = async (payload: {
        scriptId: string, opType: string, payloadJson: string,
    }) => {
        if (!ENABLE_OUTBOX) {
            return;
        }

        const db = await getDb();

        await dbQueries.insertOutbox(db, {
            id: uuidv7(),
            scriptId: payload.scriptId,
            opType: payload.opType,
            payloadJson: payload.payloadJson,
            createdAt: Date.now(),
            status: 'pending',
        });
    };

    const listScripts = async (options?: {limit?: number}): Promise<ScriptSummary[]> => {
        const db = await getDb();

        return dbQueries.listScripts(db, options);
    };

    const getScriptSummary = async (scriptId: string): Promise<ScriptSummary | null> => {
        const db = await getDb();

        return dbQueries.getScriptSummary(db, scriptId);
    };

    const createScript = async (title: string, initialContent?: ScriptDocument) => {
        const db = await getDb();
        const id = uuidv7();
        const now = Date.now();

        await dbQueries.insertScript(db, {
            id,
            title: title.trim() || 'Untitled script',
            createdAt: now,
            updatedAt: now,
        });

        if (initialContent) {
            await dbQueries.insertLatest(db, {
                scriptId: id,
                contentJson: serializeDocument(initialContent),
                updatedAt: now,
                schemaVersion: LATEST_SCRIPT_SCHEMA_VERSION,
            });
        }

        return id;
    };

    const renameScript = async (scriptId: string, title: string) => {
        const db = await getDb();
        const now = Date.now();
        const nextTitle = title.trim() || 'Untitled script';

        await dbQueries.updateScriptTitle(db, {
            id: scriptId,
            title: nextTitle,
            updatedAt: now,
        });
    };

    const deleteScript = async (scriptId: string) => {
        const db = await getDb();

        await dbQueries.deleteScript(db, scriptId);
    };

    const setActiveBlock = async (scriptId: string, blockId: string | null) => {
        const db = await getDb();

        await dbQueries.updateActiveBlock(db, {
            scriptId,
            activeBlockId: blockId,
        });
    };

    const loadLatest = async (scriptId: string) => {
        const db = await getDb();
        const contentJson = await dbQueries.getLatestContent(db, scriptId);

        return contentJson ? parseDocument(contentJson) : null;
    };

    const saveLatest = async (scriptId: string, value: ScriptDocument) => {
        const db = await getDb();
        const now = Date.now();
        const contentJson = serializeDocument(value);

        await dbQueries.upsertLatest(db, {
            scriptId,
            contentJson,
            updatedAt: now,
            schemaVersion: LATEST_SCRIPT_SCHEMA_VERSION,
        });

        await dbQueries.updateScriptTimestamp(db, {
            scriptId,
            updatedAt: now,
        });

        await recordOutbox({
            scriptId,
            opType: 'latest.save',
            payloadJson: JSON.stringify({scriptId, updatedAt: now}),
        });
    };

    const loadVersion = async (versionId: string) => {
        const db = await getDb();
        const contentJson = await dbQueries.getVersionContent(db, versionId);

        return contentJson ? parseDocument(contentJson) : null;
    };

    const commitVersion = async (scriptId: string, message?: string) => {
        const db = await getDb();
        const latest = await loadLatest(scriptId);

        if (!latest) {
            throw new Error('Cannot commit version without latest content');
        }

        const versionId = uuidv7();
        const now = Date.now();

        await dbQueries.insertVersion(db, {
            id: versionId,
            scriptId,
            message: message ?? null,
            contentJson: serializeDocument(latest),
            createdAt: now,
            schemaVersion: LATEST_SCRIPT_SCHEMA_VERSION,
        });

        await dbQueries.updateScriptTimestamp(db, {
            scriptId,
            updatedAt: now,
        });

        await recordOutbox({
            scriptId,
            opType: 'version.commit',
            payloadJson: JSON.stringify({
                scriptId,
                versionId,
                createdAt: now,
            }),
        });

        return versionId;
    };

    const restoreLatestFromVersion = async (scriptId: string, versionId: string) => {
        const version = await loadVersion(versionId);

        if (!version) {
            return;
        }

        await saveLatest(scriptId, version);
    };

    const loadScriptConfig = async (scriptId: string, namespace: string): Promise<EditorSettingsOverride | null> => {
        const db = await getDb();
        const config = await dbQueries.getScriptConfigMeta(db, {scriptId, namespace});

        if (!config) {
            return null;
        }

        const blocks = await dbQueries.listScriptConfigBlocks(db, config.id);
        const parsedPayload = config.payloadJson ? parseJson(config.payloadJson) : null;
        const payload = isScriptSettingsPayload(parsedPayload) ? parsedPayload : {};
        const settings: EditorSettingsOverride = {
            ...payload,
            blocks: {},
        };

        blocks.forEach(block => {
            const blockType = block.blockType as keyof NonNullable<EditorSettingsOverride['blocks']>;

            settings.blocks![blockType] = {
                spacingBeforeEm: fromMillis(block.spacingBeforeMillis),
                lineHeight: fromMillis(block.lineHeightMillis),
                indentLeftChars: block.indentLeftChars ?? undefined,
                indentRightChars: block.indentRightChars ?? undefined,
                shortcut: isBlockShortcut(block.shortcut)
                    ? block.shortcut
                    : undefined,
                nextElement: isFountainElementType(block.nextElement)
                    ? block.nextElement
                    : undefined,
                textAlign: isBlockTextAlign(block.textAlign)
                    ? block.textAlign
                    : undefined,
                casing: isBlockCasing(block.casing)
                    ? block.casing
                    : undefined,
                isBold: block.isBold ?? undefined,
                isItalic: block.isItalic ?? undefined,
                isUnderline: block.isUnderline ?? undefined,
            };
        });

        if (Object.keys(settings.blocks ?? {}).length === 0) {
            delete settings.blocks;
        }

        return settings;
    };

    const saveScriptConfig = async (
        scriptId: string,
        namespace: string,
        settings: EditorSettingsOverride,
    ): Promise<void> => {
        const db = await getDb();
        const now = Date.now();
        const currentConfig = await dbQueries.getScriptConfigMeta(db, {scriptId, namespace});
        const configId = currentConfig?.id ?? uuidv7();
        const payloadJson = JSON.stringify({
            page: settings.page,
            typography: settings.typography,
        });
        const blockRows = Object.entries(settings.blocks ?? {}).map(([blockType, blockSettings]) => ({
            id: uuidv7(),
            blockType,
            spacingBeforeMillis: toMillis(blockSettings?.spacingBeforeEm),
            lineHeightMillis: toMillis(blockSettings?.lineHeight),
            indentLeftChars: blockSettings?.indentLeftChars ?? null,
            indentRightChars: blockSettings?.indentRightChars ?? null,
            shortcut: blockSettings?.shortcut ?? null,
            nextElement: blockSettings?.nextElement ?? null,
            textAlign: blockSettings?.textAlign ?? null,
            casing: blockSettings?.casing ?? null,
            isBold: blockSettings?.isBold ?? null,
            isItalic: blockSettings?.isItalic ?? null,
            isUnderline: blockSettings?.isUnderline ?? null,
            createdAt: now,
            updatedAt: now,
        }));

        await db.transaction(async tx => {
            if (!currentConfig) {
                await dbQueries.insertScriptConfig(tx, {
                    id: configId,
                    scriptId,
                    namespace,
                    payloadJson,
                    createdAt: now,
                    updatedAt: now,
                    schemaVersion: LATEST_SCRIPT_SCHEMA_VERSION,
                });
            } else {
                await dbQueries.updateScriptConfig(tx, {
                    id: configId,
                    payloadJson,
                    updatedAt: now,
                    schemaVersion: LATEST_SCRIPT_SCHEMA_VERSION,
                });
            }

            await dbQueries.replaceScriptConfigBlocks(tx, {
                configId,
                rows: blockRows,
            });
        });

        await recordOutbox({
            scriptId,
            opType: 'config.save',
            payloadJson: JSON.stringify({
                scriptId,
                namespace,
                updatedAt: now,
            }),
        });
    };

    const deleteScriptConfig = async (scriptId: string, namespace: string): Promise<void> => {
        const db = await getDb();

        await dbQueries.deleteScriptConfig(db, {scriptId, namespace});

        await recordOutbox({
            scriptId,
            opType: 'config.delete',
            payloadJson: JSON.stringify({
                scriptId,
                namespace,
                deletedAt: Date.now(),
            }),
        });
    };

    return {
        listScripts,
        getScriptSummary,
        createScript,
        renameScript,
        deleteScript,
        setActiveBlock,
        loadLatest,
        saveLatest,
        commitVersion,
        loadScriptConfig,
        saveScriptConfig,
        deleteScriptConfig,
        loadVersion,
        restoreLatestFromVersion,
    } satisfies ScriptRepository;
};
