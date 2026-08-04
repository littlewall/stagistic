import {uuidv7} from '@stagistic/shared';

import type {FileStorage} from '../fileStorage';
import type {LocalDb} from '../pglite';
import * as dbQueries from '../queries';
import type {ScriptRepository} from '../scriptRepository';
import {createAttachmentHandlers} from './attachments';
import {createCharacterHandlers} from './characters';
import {createCharacterGroupHandlers} from './characterGroupHandlers';
import {createSettingsHandlers} from './config';
import {createContentHandlers} from './content';
import {createLocalPgliteReactiveSources} from './createLocalPgliteReactiveSources';
import {createLocationHandlers} from './locations';
import {createMusicHandlers} from './music';
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
    const characterGroupHandlers = createCharacterGroupHandlers(mutationDeps);
    const content = createContentHandlers(mutationDeps);
    const settingsHandlers = createSettingsHandlers(mutationDeps);
    const titlePageHandlers = createTitlePageHandlers(mutationDeps);
    const music = createMusicHandlers(mutationDeps);
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
        listCharacterGroups: scriptId => characterGroupHandlers.listScriptCharacterGroups(scriptId),
        listCharacterGenders: scriptId => characterHandlers.listScriptCharacterGenders(scriptId),
        listMusic: scriptId => music.list(scriptId),
        listLocations: scriptId => locations.list(scriptId),
        listSceneLocations: scriptId => locations.listSceneAssignments(scriptId),
        loadTitlePage: scriptId => titlePageHandlers.load(scriptId),
        loadEditorSettings: scriptId => settingsHandlers.loadScriptSettings(scriptId),
    });

    return {
        ...reactiveSources,
        allocateScriptId: uuidv7,
        allocateScriptCharacterId: uuidv7,
        allocateScriptCharacterGroupId: uuidv7,
        allocateScriptCharacterGenderId: uuidv7,
        allocateScriptMusicId: uuidv7,
        allocateScriptLocationId: uuidv7,
        listScripts: options => scripts.list(options),
        getScriptSummary: scriptId => scripts.getSummary(scriptId),
        listScriptCharacters: scriptId => listScriptCharacters(scriptId),
        listScriptCharacterGroups: scriptId => characterGroupHandlers.listScriptCharacterGroups(scriptId),
        listScriptCharacterGenders: scriptId => characterHandlers.listScriptCharacterGenders(scriptId),
        listScriptMusic: scriptId => music.list(scriptId),
        createScriptMusic: (scriptId, input) => music.create(scriptId, input),
        createScriptMusicWithId: (scriptId, input) => music.createWithId(scriptId, input),
        updateScriptMusic: (scriptId, musicId, input) => music.update(scriptId, musicId, input),
        deleteScriptMusic: (scriptId, musicId) => music.delete(scriptId, musicId),
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
        createScriptCharacterGroup: (scriptId, key) => {
            return characterGroupHandlers.createScriptCharacterGroup(scriptId, key);
        },
        createScriptCharacterGroupWithId: (scriptId, input) => {
            return characterGroupHandlers.createScriptCharacterGroupWithId(scriptId, input);
        },
        confirmScriptCharacterWithId: (scriptId, input) => {
            return characterHandlers.confirmScriptCharacterWithId(scriptId, input);
        },
        deleteScriptCharacter: (scriptId, id) => characterHandlers.deleteScriptCharacter(scriptId, id),
        deleteScriptCharacterGroup: (scriptId, id) => {
            return characterGroupHandlers.deleteScriptCharacterGroup(scriptId, id);
        },
        renameScriptCharacter: (scriptId, id, key) => {
            return characterHandlers.renameScriptCharacter(scriptId, id, key);
        },
        renameScriptCharacterGroup: (scriptId, id, key) => {
            return characterGroupHandlers.renameScriptCharacterGroup(scriptId, id, key);
        },
        setScriptCharacterColor: (scriptId, id, color) => {
            return characterHandlers.setScriptCharacterColor(scriptId, id, color);
        },
        setScriptCharacterGroupColor: (scriptId, id, color) => {
            return characterGroupHandlers.setScriptCharacterGroupColor(scriptId, id, color);
        },
        replaceScriptCharacterGroupMembers: (scriptId, id, memberIds) => {
            return characterGroupHandlers.replaceScriptCharacterGroupMembers(scriptId, id, memberIds);
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
        getMusicAttachment: (musicId, role) => attachments.getByMusicRole(musicId, role),
        setMusicAttachment: (scriptId, musicId, role, file) => {
            return attachments.setForMusic(scriptId, musicId, role, file);
        },
        removeMusicAttachment: (scriptId, musicId, role) => {
            return attachments.removeFromMusic(scriptId, musicId, role);
        },
        getAttachmentBlob: key => attachments.getBlob(key),
    };
};
