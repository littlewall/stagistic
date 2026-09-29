import * as dbQueries from '../../queries';
import type {CharacterMutationDeps} from './mutationDeps';
import {buildCharacterVocalRangePayload, buildCharacterVoiceTypePayload} from './outboxPayloads';
import type {CharacterHandlers} from './types';
import {createCharacterAttributeUpdater} from './updateCharacterAttribute';

export const createVocalRangeMutations = (
    deps: CharacterMutationDeps,
): Pick<CharacterHandlers, 'setScriptCharacterVoiceType' | 'setScriptCharacterVocalRange'> => {
    const updateCharacterAttribute = createCharacterAttributeUpdater(deps);

    const setScriptCharacterVoiceType: CharacterHandlers['setScriptCharacterVoiceType'] = (scriptId, characterId, voiceType) =>
        updateCharacterAttribute(scriptId, characterId, {
            opType: 'character.voiceType',
            update: (tx, updatedAt) =>
                dbQueries.updateScriptCharacterVoiceType(tx, {
                    scriptId,
                    characterId,
                    voiceType,
                    updatedAt,
                }),
            buildPayload: now => buildCharacterVoiceTypePayload(scriptId, characterId, voiceType, now),
        });

    const setScriptCharacterVocalRange: CharacterHandlers['setScriptCharacterVocalRange'] = (scriptId, characterId, vocalRangeLow, vocalRangeHigh) =>
        updateCharacterAttribute(scriptId, characterId, {
            opType: 'character.vocalRange',
            update: (tx, updatedAt) =>
                dbQueries.updateScriptCharacterVocalRange(tx, {
                    scriptId,
                    characterId,
                    vocalRangeLow,
                    vocalRangeHigh,
                    updatedAt,
                }),
            buildPayload: now => buildCharacterVocalRangePayload(scriptId, characterId, vocalRangeLow, vocalRangeHigh, now),
        });

    return {
        setScriptCharacterVoiceType,
        setScriptCharacterVocalRange,
    };
};
