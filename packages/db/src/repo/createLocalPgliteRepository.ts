import {uuidv7} from '@stagistic/shared';

import type {FileStorage} from '../fileStorage';
import type {LocalDb} from '../pglite';
import * as dbQueries from '../queries';
import type {ScriptRepository} from '../scriptRepository';
import {createAttachmentHandlers} from './attachments';
import {createCharacterHandlers} from './characters';
import {createSettingsHandlers} from './config';
import {createContentHandlers} from './content';
import {createLocalPgliteReactiveSources} from './createLocalPgliteReactiveSources';
import {createCueHandlers} from './cues';
import {createLocationHandlers} from './locations';
import {createOutboxRecorder} from './outbox';
import {createScriptsHandlers} from './scripts';
import {createTitlePageHandlers} from './titlePage';
import type {GetDb} from './types';

export interface LocalPgliteRepositoryDeps {
    getLocalDb: () => Promise<LocalDb>,
    syncToFs: () => Promise<void>,
    fileStorage: FileStorage,
}

export const createLocalPgliteRepository = ({
    getLocalDb,
    syncToFs,
    fileStorage,
}: LocalPgliteRepositoryDeps): ScriptRepository => {
    const dbPromise = getLocalDb();
    const getDb: GetDb = async () => dbPromise;
    const recordOutbox = createOutboxRecorder(getDb);
    const mutationDeps = {
        getDb,
        recordOutbox,
        syncDb: syncToFs,
    };
    const scripts = createScriptsHandlers(mutationDeps);
    const characterHandlers = createCharacterHandlers(mutationDeps);
    const content = createContentHandlers(mutationDeps);
    const settingsHandlers = createSettingsHandlers(mutationDeps);
    const titlePageHandlers = createTitlePageHandlers(mutationDeps);
    const cues = createCueHandlers(mutationDeps);
    const locations = createLocationHandlers(mutationDeps);
    const attachments = createAttachmentHandlers({
        ...mutationDeps,
        fileStorage,
    });
    const listScriptCharacters = async (scriptId: string) => {
        return dbQueries.listScriptCharacters(await getDb(), scriptId);
    };
    const reactiveSources = createLocalPgliteReactiveSources({
        getDb,
        listScripts: () => scripts.list(),
        listCharacters: listScriptCharacters,
        listCharacterGenders: scriptId => characterHandlers.listScriptCharacterGenders(scriptId),
        listCues: scriptId => cues.list(scriptId),
        listLocations: scriptId => locations.list(scriptId),
        listSceneLocations: scriptId => locations.listSceneAssignments(scriptId),
        loadTitlePage: scriptId => titlePageHandlers.load(scriptId),
        loadEditorSettings: scriptId => settingsHandlers.loadScriptSettings(scriptId),
    });

    return {
        ...reactiveSources,
        allocateScriptId: uuidv7,
        allocateScriptCharacterId: uuidv7,
        allocateScriptCharacterGenderId: uuidv7,
        allocateScriptCueId: uuidv7,
        allocateScriptLocationId: uuidv7,
        listScripts: options => scripts.list(options),
        getScriptSummary: scriptId => scripts.getSummary(scriptId),
        listScriptCharacters: scriptId => listScriptCharacters(scriptId),
        listScriptCharacterGenders: scriptId => characterHandlers.listScriptCharacterGenders(scriptId),
        listScriptCues: scriptId => cues.list(scriptId),
        createScriptCue: (scriptId, input) => cues.create(scriptId, input),
        createScriptCueWithId: (scriptId, input) => cues.createWithId(scriptId, input),
        updateScriptCue: (scriptId, cueId, input) => cues.update(scriptId, cueId, input),
        deleteScriptCue: (scriptId, cueId) => cues.delete(scriptId, cueId),
        listScriptLocations: scriptId => locations.list(scriptId),
        listScriptSceneLocations: scriptId => locations.listSceneAssignments(scriptId),
        createScriptLocation: (scriptId, input) => locations.create(scriptId, input),
        createScriptLocationWithId: (scriptId, input) => locations.createWithId(scriptId, input),
        renameScriptLocation: (scriptId, locationId, name) => locations.rename(scriptId, locationId, name),
        deleteScriptLocation: (scriptId, locationId) => locations.delete(scriptId, locationId),
        replaceScriptSceneLocations: (scriptId, sceneId, locationIds) => {
            return locations.replaceSceneAssignments(scriptId, sceneId, locationIds);
        },
        createScript: (title, initialContent) => scripts.create(title, initialContent),
        createScriptWithId: input => scripts.createWithId(input),
        renameScript: (scriptId, input) => scripts.rename(scriptId, input),
        renameScriptTitle: (scriptId, title) => scripts.renameTitle(scriptId, title),
        duplicateScript: (scriptId, input) => scripts.duplicate(scriptId, input),
        duplicateScriptWithId: (scriptId, input) => scripts.duplicateWithId(scriptId, input),
        deleteScript: scriptId => scripts.delete(scriptId),
        setActiveBlock: (scriptId, blockId) => scripts.setActiveBlock(scriptId, blockId),
        confirmScriptCharacter: (scriptId, key) => characterHandlers.confirmScriptCharacter(scriptId, key),
        confirmScriptCharacterWithId: (scriptId, input) => {
            return characterHandlers.confirmScriptCharacterWithId(scriptId, input);
        },
        deleteScriptCharacter: (scriptId, id) => characterHandlers.deleteScriptCharacter(scriptId, id),
        renameScriptCharacter: (scriptId, id, key) => {
            return characterHandlers.renameScriptCharacter(scriptId, id, key);
        },
        setScriptCharacterColor: (scriptId, id, color) => {
            return characterHandlers.setScriptCharacterColor(scriptId, id, color);
        },
        setScriptCharacterGender: (scriptId, id, gender) => {
            return characterHandlers.setScriptCharacterGender(scriptId, id, gender);
        },
        setScriptCharacterOutline: (scriptId, id, outline) => {
            return characterHandlers.setScriptCharacterOutline(scriptId, id, outline);
        },
        upsertScriptCharacterGender: (scriptId, label) => {
            return characterHandlers.upsertScriptCharacterGender(scriptId, label);
        },
        upsertScriptCharacterGenderWithId: (scriptId, input) => {
            return characterHandlers.upsertScriptCharacterGenderWithId(scriptId, input);
        },
        loadLatest: scriptId => content.loadLatest(scriptId),
        saveLatest: (scriptId, value) => content.saveLatest(scriptId, value),
        loadScriptSettings: scriptId => settingsHandlers.loadScriptSettings(scriptId),
        saveScriptSettings: (scriptId, settings) => settingsHandlers.saveScriptSettings(scriptId, settings),
        deleteScriptSettings: scriptId => settingsHandlers.deleteScriptSettings(scriptId),
        loadTitlePage: scriptId => titlePageHandlers.load(scriptId),
        saveTitlePage: (scriptId, settings) => titlePageHandlers.save(scriptId, settings),
        deleteTitlePage: scriptId => titlePageHandlers.delete(scriptId),
        getCueAttachment: (cueId, role) => attachments.getByCueRole(cueId, role),
        setCueAttachment: (scriptId, cueId, role, file) => {
            return attachments.setForCue(scriptId, cueId, role, file);
        },
        removeCueAttachment: (scriptId, cueId, role) => {
            return attachments.removeFromCue(scriptId, cueId, role);
        },
        getAttachmentBlob: key => attachments.getBlob(key),
    };
};
