import * as dbQueries from '../../queries';
import type {CharacterOutlineMutationDeps} from './mutationDeps';
import {buildCharacterOutlinePayload} from './outboxPayloads';
import type {CharacterHandlers} from './types';

export const createOutlineMutations = ({
    getDb,
    recordOutbox,
    syncDb,
}: CharacterOutlineMutationDeps): Pick<
    CharacterHandlers,
    'setScriptCharacterOutline'
> => {
    const setScriptCharacterOutline: CharacterHandlers['setScriptCharacterOutline'] = async (
        scriptId,
        characterId,
        outline,
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

        await dbQueries.updateScriptCharacterOutline(db, {
            scriptId,
            characterId,
            outline,
            updatedAt: now,
        });
        await dbQueries.updateScriptTimestamp(db, {
            scriptId,
            updatedAt: now,
        });
        await recordOutbox({
            scriptId,
            opType: 'character.outline',
            payloadJson: buildCharacterOutlinePayload(scriptId, characterId, outline, now),
        });

        /*
         * The outline is edited in the sidebar, which never mutates editor content,
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
        setScriptCharacterOutline,
    };
};
