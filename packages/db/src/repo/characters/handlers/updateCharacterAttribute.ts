import type {DbClient} from '../../../queries';
import * as dbQueries from '../../../queries';
import type {CharacterMutationDeps} from './mutationDeps';

interface CharacterAttributeUpdate {
    opType: string,
    update: (tx: DbClient, updatedAt: number) => Promise<unknown>,
    buildPayload: (occurredAt: number) => string,
}

/**
 * Shared shape of single-attribute character edits (color, outline, voice type,
 * vocal range): update the row, touch the script, record the outbox op, flush.
 *
 * These are edited in the sidebar, which never mutates editor content, so no
 * content autosave follows to flush PGlite. Flush explicitly here or the value
 * is lost on refresh.
 */
export const createCharacterAttributeUpdater =
    ({
        getDb,
        recordOutbox,
        syncDb,
    }: CharacterMutationDeps) => async (scriptId: string, characterId: string, {
        opType,
        update,
        buildPayload,
    }: CharacterAttributeUpdate) => {
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
            await update(tx, now);
            await dbQueries.updateScriptTimestamp(tx, {scriptId, updatedAt: now});
            await recordOutbox(
                {
                    scriptId,
                    entityKey: `character:${characterId}`,
                    opType,
                    occurredAt: now,
                    payloadJson: buildPayload(now),
                },
                tx,
            );
        });
        await syncDb();

        return dbQueries.getScriptCharacterById(db, {
            scriptId,
            characterId,
        });
    };
