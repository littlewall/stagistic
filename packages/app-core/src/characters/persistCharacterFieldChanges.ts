import type {ScriptCharacterRef, ScriptRepository} from '@stagistic/db';

export type CharacterField = 'colorHex' | 'genderKey' | 'outline' | 'voiceType' | 'vocalRangeLow' | 'vocalRangeHigh';

/** Persists each changed character field through its dedicated repository command. */
export const persistCharacterFieldChanges = async (
    repository: ScriptRepository,
    scriptId: string,
    original: ScriptCharacterRef,
    modified: ScriptCharacterRef,
    changes: Partial<ScriptCharacterRef>,
) => {
    const fieldCommands: Partial<Record<CharacterField, () => Promise<unknown>>> = {
        colorHex: () => repository.setScriptCharacterColor(scriptId, original.id, modified.colorHex),
        genderKey: () => repository.setScriptCharacterGender(scriptId, original.id, modified.genderKey),
        outline: () => repository.setScriptCharacterOutline(scriptId, original.id, modified.outline),
        voiceType: () => repository.setScriptCharacterVoiceType(scriptId, original.id, modified.voiceType),
        /*
         * Both keys read the current low+high pair and call the same
         * combined setter, since the range is only ever edited as a pair.
         * When a single edit changes both bounds at once, this fires twice
         * with identical (already-current) arguments — harmless, but keeps
         * the per-changed-field loop below correct for either bound alone.
         */
        vocalRangeLow: () => repository.setScriptCharacterVocalRange(scriptId, original.id, modified.vocalRangeLow, modified.vocalRangeHigh),
        vocalRangeHigh: () => repository.setScriptCharacterVocalRange(scriptId, original.id, modified.vocalRangeLow, modified.vocalRangeHigh),
    };
    const changedFields = Object.keys(changes).filter((field): field is CharacterField => field in fieldCommands);

    for (const field of changedFields) {
        const updated = await fieldCommands[field]?.();

        if (!updated) {
            throw new Error(`The character ${field} could not be saved`);
        }
    }
};
