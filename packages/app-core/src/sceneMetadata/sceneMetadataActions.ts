import {
    ReadOnlyScriptRepositoryError,
    type SceneCharacterInput,
    type ScriptRepository,
    type ScriptSceneCharacter,
} from '@stagistic/db';
import {normalizeCharacterKey} from '@stagistic/script';

import {getScriptCharactersStore} from '../characters/scriptCharactersStoreRegistry';
import {getSceneMetadataStore} from './sceneMetadataStore';

/*
 * Board metadata writes go through the script's reactive collections: the card answers
 * immediately, the repository write follows in the background, and a rejected write rolls
 * the card back to its last durable value. Read-only Boards never reach the store.
 */
export const createSceneMetadataActions = (repository: ScriptRepository, scriptId: string, isReadOnly = false) => {
    const guard = () => {
        if (isReadOnly) throw new ReadOnlyScriptRepositoryError('edit Board metadata');
    };

    return {
        putSceneCharacter: async (headingBlockId: string, characterId: string, input: SceneCharacterInput): Promise<ScriptSceneCharacter | null> => {
            guard();

            return getSceneMetadataStore(repository, scriptId).putSceneCharacter(headingBlockId, characterId, input);
        },
        createSceneCharacter: async (headingBlockId: string, name: string) => {
            guard();

            const catalog = getScriptCharactersStore(repository, scriptId);
            const confirmation = catalog.confirmCharacter(name);
            const character = [...catalog.charactersCollection.values()].find(row => row.key === normalizeCharacterKey(name));

            if (!character) return confirmation;

            const attachment = getSceneMetadataStore(repository, scriptId).putSceneCharacter(headingBlockId, character.id, {});

            // Both are optimistic now; record persistence waits for catalog confirmation.
            const [confirmed] = await Promise.all([confirmation, attachment]);

            return confirmed;
        },
        removeSceneCharacter: async (headingBlockId: string, characterId: string): Promise<void> => {
            guard();

            return getSceneMetadataStore(repository, scriptId).removeSceneCharacter(headingBlockId, characterId);
        },
        updateSceneSynopsis: async (headingBlockId: string, synopsis: string | null): Promise<boolean> => {
            guard();

            return getSceneMetadataStore(repository, scriptId).updateSceneSynopsis(headingBlockId, synopsis);
        },
    };
};
