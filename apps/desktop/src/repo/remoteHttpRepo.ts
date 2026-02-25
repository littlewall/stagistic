import type {ScriptSummary} from '@stagistic/db';
import type {
    ScriptCharacterGenderOption,
    ScriptCharacterRef,
    ScriptRepository,
} from '@stagistic/sync-core';

export const createRemoteHttpRepository = (): ScriptRepository => {
    const notImplemented = () => {
        throw new Error('Not implemented');
    };

    const scripts = {
        list: () => notImplemented() as Promise<ScriptSummary[]>,
        getSummary: () => notImplemented() as Promise<ScriptSummary | null>,
        create: () => notImplemented() as Promise<string>,
        rename: () => notImplemented() as Promise<void>,
        delete: () => notImplemented() as Promise<void>,
        setActiveBlock: () => notImplemented() as Promise<void>,
    };
    const content = {
        loadLatest: () => notImplemented(),
        saveLatest: () => notImplemented(),
    };
    const versions = {
        commit: () => notImplemented(),
        load: () => notImplemented(),
        restoreLatest: () => notImplemented(),
    };
    const configs = {
        load: () => notImplemented(),
        save: () => notImplemented(),
        delete: () => notImplemented(),
    };
    const characters = {
        list: () => notImplemented() as Promise<ScriptCharacterRef[]>,
        confirm: () => notImplemented() as Promise<ScriptCharacterRef | null>,
        delete: () => notImplemented() as Promise<void>,
        rename: () => notImplemented() as Promise<ScriptCharacterRef | null>,
        setColor: () => notImplemented() as Promise<ScriptCharacterRef | null>,
        setGender: () => notImplemented() as Promise<ScriptCharacterRef | null>,
    };
    const characterGenders = {
        list: () => notImplemented() as Promise<ScriptCharacterGenderOption[]>,
        upsert: () => notImplemented() as Promise<ScriptCharacterGenderOption | null>,
    };
    const blocks = {
        list: () => notImplemented(),
        listByScene: () => notImplemented(),
        listByAct: () => notImplemented(),
        getById: () => notImplemented(),
        bulkUpsert: () => notImplemented(),
        bulkDelete: () => notImplemented(),
        reorder: () => notImplemented(),
    };
    const scenes = {
        list: () => notImplemented(),
        upsert: () => notImplemented(),
        delete: () => notImplemented(),
        updateMetadata: () => notImplemented(),
    };
    const acts = {
        list: () => notImplemented(),
        upsert: () => notImplemented(),
        delete: () => notImplemented(),
    };
    const locations = {
        list: () => notImplemented(),
        upsert: () => notImplemented(),
        delete: () => notImplemented(),
    };
    const blockCharacterRefs = {
        listByBlock: () => notImplemented(),
        listByScript: () => notImplemented(),
        listByCharacter: () => notImplemented(),
        replaceForBlock: () => notImplemented(),
        deleteByCharacterIds: () => notImplemented(),
    };
    const layers = {
        list: () => notImplemented(),
        upsert: () => notImplemented(),
        setVisibility: () => notImplemented(),
        delete: () => notImplemented(),
    };
    const annotations = {
        listByBlock: () => notImplemented(),
        listByLayer: () => notImplemented(),
        upsert: () => notImplemented(),
        updateStatus: () => notImplemented(),
        delete: () => notImplemented(),
    };
    const views = {
        list: () => notImplemented(),
        getById: () => notImplemented(),
        upsert: () => notImplemented(),
        delete: () => notImplemented(),
    };
    const sceneVersions = {
        list: () => notImplemented(),
        getById: () => notImplemented(),
        insert: () => notImplemented(),
    };
    const props = {
        list: () => notImplemented(),
        upsert: () => notImplemented(),
        delete: () => notImplemented(),
        listByScene: () => notImplemented(),
        replaceSceneRows: () => notImplemented(),
    };
    const costumes = {
        list: () => notImplemented(),
        upsert: () => notImplemented(),
        delete: () => notImplemented(),
        listByScene: () => notImplemented(),
        replaceSceneRows: () => notImplemented(),
    };
    const cueSheets = {
        list: () => notImplemented(),
        upsert: () => notImplemented(),
        delete: () => notImplemented(),
        listAnnotations: () => notImplemented(),
        replaceAnnotations: () => notImplemented(),
    };
    const members = {
        list: () => notImplemented(),
        upsert: () => notImplemented(),
        delete: () => notImplemented(),
    };
    const permissions = {
        list: () => notImplemented(),
        upsert: () => notImplemented(),
        delete: () => notImplemented(),
    };

    return {
        scripts,
        content,
        versions,
        configs,
        characters,
        characterGenders,
        blocks,
        scenes,
        acts,
        locations,
        blockCharacterRefs,
        layers,
        annotations,
        views,
        sceneVersions,
        props,
        costumes,
        cueSheets,
        members,
        permissions,
        listScripts: scripts.list,
        getScriptSummary: scripts.getSummary,
        listScriptCharacters: characters.list,
        listScriptCharacterGenders: characterGenders.list,
        createScript: scripts.create,
        renameScript: scripts.rename,
        deleteScript: scripts.delete,
        setActiveBlock: scripts.setActiveBlock,
        confirmScriptCharacter: characters.confirm,
        deleteScriptCharacter: characters.delete,
        renameScriptCharacter: characters.rename,
        setScriptCharacterColor: characters.setColor,
        setScriptCharacterGender: characters.setGender,
        upsertScriptCharacterGender: characterGenders.upsert,
        loadLatest: content.loadLatest,
        saveLatest: content.saveLatest,
        commitVersion: versions.commit,
        loadScriptConfig: configs.load,
        saveScriptConfig: configs.save,
        deleteScriptConfig: configs.delete,
        loadVersion: versions.load,
        restoreLatestFromVersion: versions.restoreLatest,
    } satisfies ScriptRepository;
};
