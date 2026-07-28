import {uuidv7} from '@stagistic/shared';

import * as dbQueries from '../queries';
import type {ScriptMusicRepository} from '../scriptRepository';
import type {
    GetDb,
    RecordOutbox,
    SyncDb,
} from './types';

interface CreateMusicHandlersArgs {
    getDb: GetDb,
    recordOutbox: RecordOutbox,
    syncDb: SyncDb,
}

export const createMusicHandlers = ({
    getDb,
    recordOutbox,
    syncDb,
}: CreateMusicHandlersArgs): ScriptMusicRepository => {
    const list: ScriptMusicRepository['list'] = async scriptId => {
        const db = await getDb();

        return dbQueries.listScriptMusic(db, scriptId);
    };

    const createWithId: ScriptMusicRepository['createWithId'] = async (scriptId, input) => {
        const title = input.title.trim();

        if (!title) {
            return null;
        }

        const db = await getDb();
        const now = input.timestamp ?? Date.now();
        const musicId = input.id;

        await db.transaction(async tx => {
            await dbQueries.insertScriptMusic(tx, {
                id: musicId,
                scriptId,
                sceneNumber: 0,
                indexInScene: 0,
                mode: 'open',
                title,
                kind: input.kind,
                startBlockId: null,
                endBlockId: null,
                createdAt: now,
                updatedAt: now,
            });
            await dbQueries.updateScriptTimestamp(tx, {scriptId, updatedAt: now});
            await recordOutbox({
                scriptId,
                entityKey: `music:${musicId}`,
                opType: 'music.create',
                occurredAt: now,
                payloadJson: JSON.stringify({
                    scriptId,
                    musicId,
                    title,
                    kind: input.kind,
                    createdAt: now,
                }),
            }, tx);
        });
        await syncDb();

        return dbQueries.getScriptMusicById(db, {
            scriptId,
            musicId,
        });
    };
    const create: ScriptMusicRepository['create'] = (scriptId, input) => createWithId(scriptId, {
        ...input,
        id: uuidv7(),
    });

    const update: ScriptMusicRepository['update'] = async (scriptId, musicId, input) => {
        const title = input.title.trim();

        if (!musicId || !title) {
            return null;
        }

        const db = await getDb();
        const now = Date.now();

        await db.transaction(async tx => {
            await dbQueries.updateScriptMusic(tx, {
                scriptId,
                musicId,
                title,
                kind: input.kind,
                updatedAt: now,
            });
            await dbQueries.updateScriptTimestamp(tx, {scriptId, updatedAt: now});
            await recordOutbox({
                scriptId,
                entityKey: `music:${musicId}`,
                opType: 'music.update',
                occurredAt: now,
                payloadJson: JSON.stringify({
                    scriptId,
                    musicId,
                    title,
                    kind: input.kind,
                    updatedAt: now,
                }),
            }, tx);
        });
        await syncDb();

        return dbQueries.getScriptMusicById(db, {
            scriptId,
            musicId,
        });
    };

    const deleteMusic: ScriptMusicRepository['delete'] = async (scriptId, musicId) => {
        if (!musicId) {
            return;
        }

        const db = await getDb();
        const now = Date.now();

        await db.transaction(async tx => {
            await dbQueries.deleteScriptMusic(tx, {scriptId, musicId});
            await dbQueries.updateScriptTimestamp(tx, {scriptId, updatedAt: now});
            await recordOutbox({
                scriptId,
                entityKey: `music:${musicId}`,
                opType: 'music.delete',
                occurredAt: now,
                payloadJson: JSON.stringify({
                    scriptId, musicId, deletedAt: now,
                }),
            }, tx);
        });
        await syncDb();
    };

    return {
        list,
        create,
        createWithId,
        update,
        delete: deleteMusic,
    };
};
