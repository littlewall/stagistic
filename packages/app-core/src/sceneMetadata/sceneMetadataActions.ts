import {
    ReadOnlyScriptRepositoryError,
    type SceneCharacterInput,
    type ScriptRepository,
} from '@stagistic/db';

export const createSceneMetadataActions = (repository: ScriptRepository, scriptId: string, isReadOnly = false) => {
    const guard = () => {
        if (isReadOnly) throw new ReadOnlyScriptRepositoryError('edit Board metadata');
    };

    return {
        putSceneCharacter: async (headingBlockId: string, characterId: string, input: SceneCharacterInput) => {
            guard();

            return repository.putSceneCharacter(scriptId, headingBlockId, characterId, input);
        },
        removeSceneCharacter: async (headingBlockId: string, characterId: string) => {
            guard();
            await repository.removeSceneCharacter(scriptId, headingBlockId, characterId);
        },
        updateSceneSynopsis: async (headingBlockId: string, synopsis: string | null) => {
            guard();

            return repository.updateSceneSynopsis(scriptId, headingBlockId, synopsis);
        },
    };
};
