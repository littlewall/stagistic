import type {LocalDb} from '../pglite';
import * as dbQueries from '../queries';
import type {ScriptRepository} from '../scriptRepository';
import {createCharacterHandlers} from './characters';
import {createSettingsHandlers} from './config';
import {createContentHandlers} from './content';
import {createCueHandlers} from './cues';
import {createLocationHandlers} from './locations';
import {createOutboxRecorder} from './outbox';
import {createScriptsHandlers} from './scripts';
import {createTitlePageHandlers} from './titlePage';
import type {GetDb} from './types';

export interface LocalPgliteRepositoryDeps {
    getLocalDb: () => Promise<LocalDb>,
    syncToFs: () => Promise<void>,
}

export const createLocalPgliteRepository = ({
    getLocalDb,
    syncToFs,
}: LocalPgliteRepositoryDeps): ScriptRepository => {
    const dbPromise = getLocalDb();

    const getDb: GetDb = async () => dbPromise;
    const recordOutbox = createOutboxRecorder(getDb);

    const scripts = createScriptsHandlers({getDb});
    const characterHandlers = createCharacterHandlers({
        getDb,
        recordOutbox,
        syncDb: syncToFs,
    });
    const content = createContentHandlers({
        getDb,
        recordOutbox,
        syncDb: syncToFs,
    });
    const settingsHandlers = createSettingsHandlers({
        getDb,
        recordOutbox,
        syncDb: syncToFs,
    });
    const titlePageHandlers = createTitlePageHandlers({
        getDb,
        recordOutbox,
        syncDb: syncToFs,
    });
    const cues = createCueHandlers({
        getDb,
        recordOutbox,
        syncDb: syncToFs,
    });
    const locations = createLocationHandlers({
        getDb,
        recordOutbox,
        syncDb: syncToFs,
    });

    const listScriptCharacters = async (scriptId: string) => {
        const db = await getDb();

        return dbQueries.listScriptCharacters(db, scriptId);
    };

    return {
        listScripts: options => scripts.list(options),
        getScriptSummary: scriptId => scripts.getSummary(scriptId),
        listScriptCharacters: scriptId => listScriptCharacters(scriptId),
        listScriptCharacterGenders: scriptId => characterHandlers.listScriptCharacterGenders(scriptId),
        listScriptCues: scriptId => cues.list(scriptId),
        createScriptCue: (scriptId, input) => cues.create(scriptId, input),
        deleteScriptCue: (scriptId, cueId) => cues.delete(scriptId, cueId),
        unassignScriptCue: (scriptId, cueId) => cues.unassign(scriptId, cueId),
        listScriptLocations: scriptId => locations.list(scriptId),
        createScriptLocation: (scriptId, input) => locations.create(scriptId, input),
        renameScriptLocation: (scriptId, locationId, name) => locations.rename(scriptId, locationId, name),
        deleteScriptLocation: (scriptId, locationId) => locations.delete(scriptId, locationId),
        createScript: (title, initialContent) => scripts.create(title, initialContent),
        renameScript: (scriptId, input) => scripts.rename(scriptId, input),
        renameScriptTitle: (scriptId, title) => scripts.renameTitle(scriptId, title),
        duplicateScript: (sourceScriptId, input) => scripts.duplicate(sourceScriptId, input),
        deleteScript: scriptId => scripts.delete(scriptId),
        setActiveBlock: (scriptId, blockId) => scripts.setActiveBlock(scriptId, blockId),
        confirmScriptCharacter: (scriptId, characterKey) => characterHandlers.confirmScriptCharacter(scriptId, characterKey),
        deleteScriptCharacter: (scriptId, characterId) => characterHandlers.deleteScriptCharacter(scriptId, characterId),
        renameScriptCharacter: (scriptId, characterId, nextCharacterKey) => characterHandlers.renameScriptCharacter(
            scriptId,
            characterId,
            nextCharacterKey,
        ),
        setScriptCharacterColor: (scriptId, characterId, colorHex) => characterHandlers.setScriptCharacterColor(
            scriptId,
            characterId,
            colorHex,
        ),
        setScriptCharacterGender: (scriptId, characterId, genderKey) => characterHandlers.setScriptCharacterGender(
            scriptId,
            characterId,
            genderKey,
        ),
        setScriptCharacterOutline: (scriptId, characterId, outline) => characterHandlers.setScriptCharacterOutline(
            scriptId,
            characterId,
            outline,
        ),
        upsertScriptCharacterGender: (scriptId, label) => characterHandlers.upsertScriptCharacterGender(scriptId, label),
        loadLatest: scriptId => content.loadLatest(scriptId),
        saveLatest: (scriptId, value) => content.saveLatest(scriptId, value),
        loadScriptSettings: scriptId => settingsHandlers.loadScriptSettings(scriptId),
        saveScriptSettings: (scriptId, settings) => settingsHandlers.saveScriptSettings(scriptId, settings),
        deleteScriptSettings: scriptId => settingsHandlers.deleteScriptSettings(scriptId),
        loadTitlePage: scriptId => titlePageHandlers.load(scriptId),
        saveTitlePage: (scriptId, settings) => titlePageHandlers.save(scriptId, settings),
        deleteTitlePage: scriptId => titlePageHandlers.delete(scriptId),
    };
};
