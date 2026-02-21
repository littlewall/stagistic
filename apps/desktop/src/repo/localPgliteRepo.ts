import {
    dbQueries,
    type ScriptSummary,
} from '@stagistic/db';
import {
    LATEST_SCRIPT_SCHEMA_VERSION,
    type ScriptDocument,
} from '@stagistic/script-core';
import {
    trimOrFallback,
    uuidv7,
} from '@stagistic/shared';
import type {
    ListScriptsOptions,
    ScriptCharacterRef,
    ScriptRepository,
} from '@stagistic/sync-core';

import {getLocalDb} from '~db';

import {createCharacterHandlers} from './localPglite/characters';
import {createBlockIndexHandlers} from './localPglite/blockIndex';
import {createConfigHandlers} from './localPglite/config';
import {createContentHandlers} from './localPglite/content';
import {
    computeContentHash,
    serializeDocument,
} from './localPglite/documentCodec';
import {createOutboxRecorder} from './localPglite/outbox';
import type {GetDb} from './localPglite/types';

export const createLocalPgliteRepository = (): ScriptRepository => {
    const dbPromise = getLocalDb();

    const getDb: GetDb = async () => dbPromise;
    const recordOutbox = createOutboxRecorder(getDb);
    const blockIndexHandlers = createBlockIndexHandlers({getDb});

    const listScripts = async (options?: ListScriptsOptions): Promise<ScriptSummary[]> => {
        const db = await getDb();

        return dbQueries.listScripts(db, options);
    };

    const getScriptSummary = async (scriptId: string): Promise<ScriptSummary | null> => {
        const db = await getDb();

        return dbQueries.getScriptSummary(db, scriptId);
    };

    const listScriptCharacters = async (scriptId: string): Promise<ScriptCharacterRef[]> => {
        const db = await getDb();

        return dbQueries.listScriptCharacters(db, scriptId);
    };

    const createScript = async (title: string, initialContent?: ScriptDocument) => {
        const db = await getDb();
        const id = uuidv7();
        const now = Date.now();

        await dbQueries.insertScript(db, {
            id,
            title: trimOrFallback(title, 'Untitled script'),
            createdAt: now,
            updatedAt: now,
        });

        if (initialContent) {
            const contentJson = serializeDocument(initialContent);
            const contentHash = computeContentHash(contentJson);

            await dbQueries.insertLatest(db, {
                scriptId: id,
                contentJson,
                contentHash,
                contentSize: contentJson.length,
                updatedAt: now,
                schemaVersion: LATEST_SCRIPT_SCHEMA_VERSION,
            });

            try {
                await blockIndexHandlers.rebuildScriptBlockIndexFromDocument({
                    scriptId: id,
                    value: initialContent,
                    contentHash,
                    updatedAt: now,
                    db,
                });
            } catch (error) {
                console.error('Failed to rebuild script block index after createScript', error);
                await blockIndexHandlers.markScriptBlockIndexStale(id, contentHash, error);
            }
        }

        return id;
    };

    const renameScript = async (scriptId: string, title: string) => {
        const db = await getDb();
        const now = Date.now();
        const nextTitle = trimOrFallback(title, 'Untitled script');

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

    const {
        listScriptCharacterGenders,
        confirmScriptCharacter,
        deleteScriptCharacter,
        renameScriptCharacter,
        setScriptCharacterColor,
        setScriptCharacterGender,
        upsertScriptCharacterGender,
    } = createCharacterHandlers({
        getDb,
        recordOutbox,
    });

    const {
        loadLatest,
        saveLatest,
        commitVersion,
        loadVersion,
        restoreLatestFromVersion,
    } = createContentHandlers({
        getDb,
        recordOutbox,
        blockIndex: {
            rebuildScriptBlockIndexFromDocument: blockIndexHandlers.rebuildScriptBlockIndexFromDocument,
            markScriptBlockIndexStale: blockIndexHandlers.markScriptBlockIndexStale,
        },
    });

    const {
        loadScriptConfig,
        saveScriptConfig,
        deleteScriptConfig,
    } = createConfigHandlers({
        getDb,
        recordOutbox,
    });

    return {
        listScripts,
        getScriptSummary,
        listScriptCharacters,
        listScriptCharacterGenders,
        createScript,
        renameScript,
        deleteScript,
        setActiveBlock,
        confirmScriptCharacter,
        deleteScriptCharacter,
        renameScriptCharacter,
        setScriptCharacterColor,
        setScriptCharacterGender,
        upsertScriptCharacterGender,
        loadLatest,
        saveLatest,
        commitVersion,
        loadScriptConfig,
        saveScriptConfig,
        deleteScriptConfig,
        loadVersion,
        restoreLatestFromVersion,
        getScriptBlockIndex: blockIndexHandlers.getScriptBlockIndex,
        ensureScriptBlockIndex: blockIndexHandlers.ensureScriptBlockIndex,
        rebuildScriptBlockIndex: blockIndexHandlers.rebuildScriptBlockIndex,
    } satisfies ScriptRepository;
};
