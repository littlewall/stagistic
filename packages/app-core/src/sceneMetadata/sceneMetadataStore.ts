import type {
    ScriptRepository,
    ScriptSceneCharacter,
    ScriptSceneSynopsis,
} from '@stagistic/db';

import {createReactiveCollection, createRepositoryStoreRegistry} from '../collections';

const createSceneMetadataStore = (repository: ScriptRepository, scriptId: string) => ({
    characters: createReactiveCollection<ScriptSceneCharacter, string>({
        id: `scene-characters:${scriptId}`,
        source: repository.getScriptSceneCharactersSource(scriptId),
        getKey: row => JSON.stringify([row.headingBlockId, row.characterId]),
    }),
    synopses: createReactiveCollection<ScriptSceneSynopsis, string>({
        id: `scene-synopses:${scriptId}`,
        source: repository.getScriptSceneSynopsesSource(scriptId),
        getKey: row => row.headingBlockId,
    }),
});

export const getSceneMetadataStore = createRepositoryStoreRegistry(createSceneMetadataStore);
