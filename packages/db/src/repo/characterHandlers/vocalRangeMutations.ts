import * as dbQueries from '../../queries';
import type {CharacterMutationDeps} from './mutationDeps';
import {
    buildCharacterVocalRangePayload,
    buildCharacterVoiceTypePayload,
} from './outboxPayloads';
import type {CharacterHandlers} from './types';

export const createVocalRangeMutations = ({
    getDb,
    recordOutbox,
    syncDb,
}: CharacterMutationDeps): Pick<
    CharacterHandlers,
    'setScriptCharacterVoiceType' | 'setScriptCharacterVocalRange'
> => {
    const setScriptCharacterVoiceType: CharacterHandlers['setScriptCharacterVoiceType'] = async (
        scriptId,
        characterId,
        voiceType,
    ) => {
        if (!characterId) {
            return null;
        }

        const db = await getDb();
        const now = Date.now();
        const currentCharacter = await dbQueries.getScriptCharacterById(db, {
            scriptId,
            characterId,
        });

        if (!currentCharacter) {
            return null;
        }

        await db.transaction(async tx => {
            await dbQueries.updateScriptCharacterVoiceType(tx, {
                scriptId,
                characterId,
                voiceType,
                updatedAt: now,
            });
            await dbQueries.updateScriptTimestamp(tx, {scriptId, updatedAt: now});
            await recordOutbox({
                scriptId,
                entityKey: `character:${characterId}`,
                opType: 'character.voiceType',
                occurredAt: now,
                payloadJson: buildCharacterVoiceTypePayload(scriptId, characterId, voiceType, now),
            }, tx);
        });

        /*
         * Voice type is edited in the sidebar, which never mutates editor content,
         * so no content autosave follows to flush PGlite. Flush explicitly here or
         * the value is lost on refresh.
         */
        await syncDb();

        return dbQueries.getScriptCharacterById(db, {
            scriptId,
            characterId,
        });
    };

    const setScriptCharacterVocalRange: CharacterHandlers['setScriptCharacterVocalRange'] = async (
        scriptId,
        characterId,
        vocalRangeLow,
        vocalRangeHigh,
    ) => {
        if (!characterId) {
            return null;
        }

        const db = await getDb();
        const now = Date.now();
        const currentCharacter = await dbQueries.getScriptCharacterById(db, {
            scriptId,
            characterId,
        });

        if (!currentCharacter) {
            return null;
        }

        await db.transaction(async tx => {
            await dbQueries.updateScriptCharacterVocalRange(tx, {
                scriptId,
                characterId,
                vocalRangeLow,
                vocalRangeHigh,
                updatedAt: now,
            });
            await dbQueries.updateScriptTimestamp(tx, {scriptId, updatedAt: now});
            await recordOutbox({
                scriptId,
                entityKey: `character:${characterId}`,
                opType: 'character.vocalRange',
                occurredAt: now,
                payloadJson: buildCharacterVocalRangePayload(
                    scriptId,
                    characterId,
                    vocalRangeLow,
                    vocalRangeHigh,
                    now,
                ),
            }, tx);
        });

        /*
         * Vocal range is edited in the sidebar, which never mutates editor content,
         * so no content autosave follows to flush PGlite. Flush explicitly here or
         * the value is lost on refresh.
         */
        await syncDb();

        return dbQueries.getScriptCharacterById(db, {
            scriptId,
            characterId,
        });
    };

    return {
        setScriptCharacterVoiceType,
        setScriptCharacterVocalRange,
    };
};
