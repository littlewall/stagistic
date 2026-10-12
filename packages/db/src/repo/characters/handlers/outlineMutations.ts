import * as dbQueries from '../../../queries';
import type {CharacterMutationDeps} from './mutationDeps';
import type {CharacterHandlers} from './types';
import {createCharacterAttributeUpdater} from './updateCharacterAttribute';

export const createOutlineMutations = (deps: CharacterMutationDeps): Pick<CharacterHandlers, 'setScriptCharacterOutline'> => {
    const updateCharacterAttribute = createCharacterAttributeUpdater(deps);

    const setScriptCharacterOutline: CharacterHandlers['setScriptCharacterOutline'] = (scriptId, characterId, outline) => updateCharacterAttribute(scriptId, characterId, {
        update: (tx, updatedAt) => dbQueries.updateScriptCharacterOutline(tx, {
            scriptId,
            characterId,
            outline,
            updatedAt,
        }),
    });

    return {
        setScriptCharacterOutline,
    };
};
