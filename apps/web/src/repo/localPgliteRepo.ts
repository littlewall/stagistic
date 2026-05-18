import {
    bulkUpsertScriptBlocks,
    dbQueries,
    listScriptBlocks,
    type ListScriptBlocksOptions,
    type ListScriptsOptions,
    reorderScriptBlocks,
    replaceScriptBlockCharacterRefs,
    type ScriptBlockCharacterRefRow,
    type ScriptBlockOrderMove,
    type ScriptBlockUpsertRow,
    type ScriptDataRepository,
    type ScriptRepository,
    updateScriptSceneMetadata,
    type UpdateScriptSceneMetadataPayload,
    upsertScriptAct,
    type UpsertScriptActPayload,
    upsertScriptLocation,
    type UpsertScriptLocationPayload,
    upsertScriptScene,
    type UpsertScriptScenePayload,
} from '@stagistic/db';
import {type ScriptDocument} from '@stagistic/script';
import {
    trimOrFallback,
    uuidv7,
} from '@stagistic/shared';

import {getLocalDb} from '~db';

import {createCharacterHandlers} from './localPglite/characters';
import {createConfigHandlers} from './localPglite/config';
import {createContentHandlers} from './localPglite/content';
import {createTitlePageHandlers} from './localPglite/titlePage';
import {
    LEGACY_TO_BLOCKS_TRIGGERS,
    migrateScriptDocumentToBlocks,
} from './localPglite/migration/legacyToBlocks';
import {createOutboxRecorder} from './localPglite/outbox';
import type {GetDb} from './localPglite/types';

export const createLocalPgliteDataRepository = (): ScriptDataRepository => {
    const dbPromise = getLocalDb();

    const getDb: GetDb = async () => dbPromise;
    const recordOutbox = createOutboxRecorder(getDb);

    const scripts = {
        list: async (options?: ListScriptsOptions) => {
            const db = await getDb();

            return dbQueries.listScripts(db, options);
        },
        getSummary: async (scriptId: string) => {
            const db = await getDb();

            return dbQueries.getScriptSummary(db, scriptId);
        },
        create: async (title: string, initialContent?: ScriptDocument) => {
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
                try {
                    await migrateScriptDocumentToBlocks({
                        db,
                        scriptId: id,
                        sourceDocument: initialContent,
                        trigger: LEGACY_TO_BLOCKS_TRIGGERS.createScript,
                        context: LEGACY_TO_BLOCKS_TRIGGERS.createScript,
                    });
                } catch (error) {
                    try {
                        await dbQueries.deleteScript(db, id);
                    } catch (rollbackError) {
                        console.error('[db-local] failed to rollback script after create migration error', rollbackError);
                    }

                    throw error;
                }
            }

            return id;
        },
        rename: async (scriptId: string, title: string) => {
            const db = await getDb();
            const now = Date.now();
            const nextTitle = trimOrFallback(title, 'Untitled script');

            await dbQueries.updateScriptTitle(db, {
                id: scriptId,
                title: nextTitle,
                updatedAt: now,
            });
        },
        delete: async (scriptId: string) => {
            const db = await getDb();

            await dbQueries.deleteScript(db, scriptId);
        },
        setActiveBlock: async (scriptId: string, blockId: string | null) => {
            const db = await getDb();

            await dbQueries.updateActiveBlock(db, {
                scriptId,
                activeBlockId: blockId,
            });
        },
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

    const characters = {
        list: async (scriptId: string) => {
            const db = await getDb();

            return dbQueries.listScriptCharacters(db, scriptId);
        },
        confirm: confirmScriptCharacter,
        delete: deleteScriptCharacter,
        rename: renameScriptCharacter,
        setColor: setScriptCharacterColor,
        setGender: setScriptCharacterGender,
    };

    const characterGenders = {
        list: listScriptCharacterGenders,
        upsert: upsertScriptCharacterGender,
    };

    const {
        loadLatest,
        saveLatest,
    } = createContentHandlers({
        getDb,
        recordOutbox,
    });

    const content = {
        loadLatest,
        saveLatest,
    };

    const {
        loadScriptConfig,
        saveScriptConfig,
        deleteScriptConfig,
    } = createConfigHandlers({
        getDb,
        recordOutbox,
    });

    const configs = {
        load: loadScriptConfig,
        save: saveScriptConfig,
        delete: deleteScriptConfig,
    };

    const titlePage = createTitlePageHandlers({
        getDb,
        recordOutbox,
    });

    const blocks = {
        list: async (scriptId: string, queryOptions?: ListScriptBlocksOptions) => {
            const db = await getDb();

            return listScriptBlocks(db, scriptId, queryOptions);
        },
        listByScene: async (sceneId: string) => {
            const db = await getDb();

            return dbQueries.listScriptBlocksByScene(db, sceneId);
        },
        listByAct: async (actId: string) => {
            const db = await getDb();

            return dbQueries.listScriptBlocksByAct(db, actId);
        },
        getById: async (blockId: string) => {
            const db = await getDb();

            return dbQueries.getScriptBlockById(db, blockId);
        },
        bulkUpsert: async (rows: ScriptBlockUpsertRow[]) => {
            const db = await getDb();

            await bulkUpsertScriptBlocks(db, rows);
        },
        bulkDelete: async (blockIds: string[]) => {
            const db = await getDb();

            await dbQueries.bulkDeleteScriptBlocks(db, blockIds);
        },
        reorder: async (scriptId: string, moves: ScriptBlockOrderMove[]) => {
            const db = await getDb();

            await reorderScriptBlocks(db, scriptId, moves);
        },
    };

    const scenes = {
        list: async (scriptId: string) => {
            const db = await getDb();

            return dbQueries.listScriptScenes(db, scriptId);
        },
        upsert: async (payload: UpsertScriptScenePayload) => {
            const db = await getDb();

            await upsertScriptScene(db, payload);
        },
        delete: async (sceneId: string) => {
            const db = await getDb();

            await dbQueries.deleteScriptScene(db, sceneId);
        },
        updateMetadata: async (payload: UpdateScriptSceneMetadataPayload) => {
            const db = await getDb();

            await updateScriptSceneMetadata(db, payload);
        },
    };

    const acts = {
        list: async (scriptId: string) => {
            const db = await getDb();

            return dbQueries.listScriptActs(db, scriptId);
        },
        upsert: async (payload: UpsertScriptActPayload) => {
            const db = await getDb();

            await upsertScriptAct(db, payload);
        },
        delete: async (actId: string) => {
            const db = await getDb();

            await dbQueries.deleteScriptAct(db, actId);
        },
    };

    const locations = {
        list: async (scriptId: string) => {
            const db = await getDb();

            return dbQueries.listScriptLocations(db, scriptId);
        },
        upsert: async (payload: UpsertScriptLocationPayload) => {
            const db = await getDb();

            await upsertScriptLocation(db, payload);
        },
        delete: async (locationId: string) => {
            const db = await getDb();

            await dbQueries.deleteScriptLocation(db, locationId);
        },
    };

    const blockCharacterRefs = {
        listByBlock: async (blockId: string) => {
            const db = await getDb();

            return dbQueries.listScriptBlockCharacterRefs(db, blockId);
        },
        listByScript: async (scriptId: string) => {
            const db = await getDb();

            return dbQueries.listScriptCharacterRefsByScript(db, scriptId);
        },
        listByCharacter: async (characterId: string) => {
            const db = await getDb();

            return dbQueries.listScriptCharacterRefsByCharacter(db, characterId);
        },
        replaceForBlock: async (blockId: string, rows: ScriptBlockCharacterRefRow[]) => {
            const db = await getDb();

            await replaceScriptBlockCharacterRefs(db, blockId, rows);
        },
        deleteByCharacterIds: async (characterIds: string[]) => {
            const db = await getDb();

            await dbQueries.deleteScriptBlockRefsByCharacterIds(db, characterIds);
        },
    };

    return {
        scripts,
        content,
        configs,
        titlePage,
        characters,
        characterGenders,
        blocks,
        scenes,
        acts,
        locations,
        blockCharacterRefs,
    } satisfies ScriptDataRepository;
};

export const createLocalPgliteRepository = (): ScriptRepository => {
    const repositoryData = createLocalPgliteDataRepository();

    return {
        ...repositoryData,
        listScripts: options => repositoryData.scripts.list(options),
        getScriptSummary: scriptId => repositoryData.scripts.getSummary(scriptId),
        listScriptCharacters: scriptId => repositoryData.characters.list(scriptId),
        listScriptCharacterGenders: scriptId => repositoryData.characterGenders.list(scriptId),
        createScript: (title, initialContent) => repositoryData.scripts.create(title, initialContent),
        renameScript: (scriptId, title) => repositoryData.scripts.rename(scriptId, title),
        deleteScript: scriptId => repositoryData.scripts.delete(scriptId),
        setActiveBlock: (scriptId, blockId) => repositoryData.scripts.setActiveBlock(scriptId, blockId),
        confirmScriptCharacter: (scriptId, characterKey) => repositoryData.characters.confirm(scriptId, characterKey),
        deleteScriptCharacter: (scriptId, characterId) => repositoryData.characters.delete(scriptId, characterId),
        renameScriptCharacter: (scriptId, characterId, nextCharacterKey) => repositoryData.characters.rename(
            scriptId,
            characterId,
            nextCharacterKey,
        ),
        setScriptCharacterColor: (scriptId, characterId, colorHex) => repositoryData.characters.setColor(
            scriptId,
            characterId,
            colorHex,
        ),
        setScriptCharacterGender: (scriptId, characterId, genderKey) => repositoryData.characters.setGender(
            scriptId,
            characterId,
            genderKey,
        ),
        upsertScriptCharacterGender: (scriptId, label) => repositoryData.characterGenders.upsert(scriptId, label),
        loadLatest: scriptId => repositoryData.content.loadLatest(scriptId),
        saveLatest: (scriptId, value) => repositoryData.content.saveLatest(scriptId, value),
        loadScriptConfig: (scriptId, namespace) => repositoryData.configs.load(scriptId, namespace),
        saveScriptConfig: (scriptId, namespace, settings) => repositoryData.configs.save(scriptId, namespace, settings),
        deleteScriptConfig: (scriptId, namespace) => repositoryData.configs.delete(scriptId, namespace),
        loadTitlePage: scriptId => repositoryData.titlePage.load(scriptId),
        saveTitlePage: (scriptId, settings) => repositoryData.titlePage.save(scriptId, settings),
        deleteTitlePage: scriptId => repositoryData.titlePage.delete(scriptId),
    };
};
