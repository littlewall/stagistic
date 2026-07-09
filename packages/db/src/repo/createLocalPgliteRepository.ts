import type {LocalDb} from '../pglite';
import * as dbQueries from '../queries';
import type {
    ScriptDataRepository,
    ScriptRepository,
} from '../scriptRepository';
import {createBlockCharacterRefsHandlers} from './blockCharacterRefs';
import {createBlocksHandlers} from './blocks';
import {createCharacterHandlers} from './characters';
import {createSettingsHandlers} from './config';
import {createContentHandlers} from './content';
import {createOutboxRecorder} from './outbox';
import {createScriptsHandlers} from './scripts';
import {
    createActsHandlers,
    createLocationsHandlers,
    createScenesHandlers,
} from './structure';
import {createTitlePageHandlers} from './titlePage';
import type {GetDb} from './types';

export interface LocalPgliteRepositoryDeps {
    getLocalDb: () => Promise<LocalDb>,
    syncToFs: () => Promise<void>,
}

export const createLocalPgliteDataRepository = ({
    getLocalDb,
    syncToFs,
}: LocalPgliteRepositoryDeps): ScriptDataRepository => {
    const dbPromise = getLocalDb();

    const getDb: GetDb = async () => dbPromise;
    const recordOutbox = createOutboxRecorder(getDb);

    const scripts = createScriptsHandlers({getDb});

    const {
        listScriptCharacterGenders,
        confirmScriptCharacter,
        deleteScriptCharacter,
        renameScriptCharacter,
        setScriptCharacterColor,
        setScriptCharacterGender,
        setScriptCharacterOutline,
        upsertScriptCharacterGender,
    } = createCharacterHandlers({
        getDb,
        recordOutbox,
        syncDb: syncToFs,
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
        setOutline: setScriptCharacterOutline,
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
        syncDb: syncToFs,
    });

    const content = {
        loadLatest,
        saveLatest,
    };

    const {
        loadScriptSettings,
        saveScriptSettings,
        deleteScriptSettings,
    } = createSettingsHandlers({
        getDb,
        recordOutbox,
        syncDb: syncToFs,
    });

    const settings = {
        load: loadScriptSettings,
        save: saveScriptSettings,
        delete: deleteScriptSettings,
    };

    const titlePage = createTitlePageHandlers({
        getDb,
        recordOutbox,
        syncDb: syncToFs,
    });

    const blocks = createBlocksHandlers({getDb});
    const scenes = createScenesHandlers({getDb});
    const acts = createActsHandlers({getDb});
    const locations = createLocationsHandlers({getDb});
    const blockCharacterRefs = createBlockCharacterRefsHandlers({getDb});

    return {
        scripts,
        content,
        settings,
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

export const createLocalPgliteRepository = (deps: LocalPgliteRepositoryDeps): ScriptRepository => {
    const repositoryData = createLocalPgliteDataRepository(deps);

    return {
        ...repositoryData,
        listScripts: options => repositoryData.scripts.list(options),
        getScriptSummary: scriptId => repositoryData.scripts.getSummary(scriptId),
        listScriptCharacters: scriptId => repositoryData.characters.list(scriptId),
        listScriptCharacterGenders: scriptId => repositoryData.characterGenders.list(scriptId),
        createScript: (title, initialContent) => repositoryData.scripts.create(title, initialContent),
        renameScript: (scriptId, input) => repositoryData.scripts.rename(scriptId, input),
        renameScriptTitle: (scriptId, title) => repositoryData.scripts.renameTitle(scriptId, title),
        duplicateScript: (sourceScriptId, input) => repositoryData.scripts.duplicate(sourceScriptId, input),
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
        setScriptCharacterOutline: (scriptId, characterId, outline) => repositoryData.characters.setOutline(
            scriptId,
            characterId,
            outline,
        ),
        upsertScriptCharacterGender: (scriptId, label) => repositoryData.characterGenders.upsert(scriptId, label),
        loadLatest: scriptId => repositoryData.content.loadLatest(scriptId),
        saveLatest: (scriptId, value) => repositoryData.content.saveLatest(scriptId, value),
        loadScriptSettings: scriptId => repositoryData.settings.load(scriptId),
        saveScriptSettings: (scriptId, settings) => repositoryData.settings.save(scriptId, settings),
        deleteScriptSettings: scriptId => repositoryData.settings.delete(scriptId),
        loadTitlePage: scriptId => repositoryData.titlePage.load(scriptId),
        saveTitlePage: (scriptId, settings) => repositoryData.titlePage.save(scriptId, settings),
        deleteTitlePage: scriptId => repositoryData.titlePage.delete(scriptId),
    };
};
