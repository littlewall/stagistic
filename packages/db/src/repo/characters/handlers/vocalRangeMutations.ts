import * as dbQueries from '../../../queries';
import type {CharacterMutationDeps} from './mutationDeps';
import type {CharacterHandlers} from './types';
import {createCharacterAttributeUpdater} from './updateCharacterAttribute';

export const createVocalRangeMutations = (
    deps: CharacterMutationDeps,
): Pick<CharacterHandlers, 'setScriptCharacterVoiceType' | 'setScriptCharacterVocalRange'> => {
    const updateCharacterAttribute = createCharacterAttributeUpdater(deps);

    const setScriptCharacterVoiceType: CharacterHandlers['setScriptCharacterVoiceType'] = (scriptId, characterId, voiceType) => updateCharacterAttribute(scriptId, characterId, {
        update: (tx, updatedAt) => dbQueries.updateScriptCharacterVoiceType(tx, {
            scriptId,
            characterId,
            voiceType,
            updatedAt,
        }),
    });

    const setScriptCharacterVocalRange: CharacterHandlers['setScriptCharacterVocalRange'] = (scriptId, characterId, vocalRangeLow, vocalRangeHigh) => updateCharacterAttribute(scriptId, characterId, {
        update: (tx, updatedAt) => dbQueries.updateScriptCharacterVocalRange(tx, {
            scriptId,
            characterId,
            vocalRangeLow,
            vocalRangeHigh,
            updatedAt,
        }),
    });

    return {
        setScriptCharacterVoiceType,
        setScriptCharacterVocalRange,
    };
};
