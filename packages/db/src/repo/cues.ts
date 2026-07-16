import {uuidv7} from '@stagistic/shared';

import * as dbQueries from '../queries';
import type {ScriptCuesRepository} from '../scriptRepository';
import type {
    GetDb,
    RecordOutbox,
    SyncDb,
} from './types';

interface CreateCueHandlersArgs {
    getDb: GetDb,
    recordOutbox: RecordOutbox,
    syncDb: SyncDb,
}

export const createCueHandlers = ({
    getDb,
    recordOutbox,
    syncDb,
}: CreateCueHandlersArgs): ScriptCuesRepository => {
    const list: ScriptCuesRepository['list'] = async scriptId => {
        const db = await getDb();

        return dbQueries.listScriptCues(db, scriptId);
    };

    const createWithId: ScriptCuesRepository['createWithId'] = async (scriptId, input) => {
        const title = input.title.trim();

        if (!title) {
            return null;
        }

        const db = await getDb();
        const now = input.timestamp ?? Date.now();
        const cueId = input.id;

        await db.transaction(async tx => {
            await dbQueries.insertScriptCue(tx, {
                id: cueId,
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
                entityKey: `cue:${cueId}`,
                opType: 'cue.create',
                occurredAt: now,
                payloadJson: JSON.stringify({
                    scriptId,
                    cueId,
                    title,
                    kind: input.kind,
                    createdAt: now,
                }),
            }, tx);
        });
        await syncDb();

        return dbQueries.getScriptCueById(db, {
            scriptId,
            cueId,
        });
    };
    const create: ScriptCuesRepository['create'] = (scriptId, input) => createWithId(scriptId, {
        ...input,
        id: uuidv7(),
    });

    const update: ScriptCuesRepository['update'] = async (scriptId, cueId, input) => {
        const title = input.title.trim();

        if (!cueId || !title) {
            return null;
        }

        const db = await getDb();
        const now = Date.now();

        await db.transaction(async tx => {
            await dbQueries.updateScriptCue(tx, {
                scriptId,
                cueId,
                title,
                kind: input.kind,
                updatedAt: now,
            });
            await dbQueries.updateScriptTimestamp(tx, {scriptId, updatedAt: now});
            await recordOutbox({
                scriptId,
                entityKey: `cue:${cueId}`,
                opType: 'cue.update',
                occurredAt: now,
                payloadJson: JSON.stringify({
                    scriptId,
                    cueId,
                    title,
                    kind: input.kind,
                    updatedAt: now,
                }),
            }, tx);
        });
        await syncDb();

        return dbQueries.getScriptCueById(db, {
            scriptId,
            cueId,
        });
    };

    const deleteCue: ScriptCuesRepository['delete'] = async (scriptId, cueId) => {
        if (!cueId) {
            return;
        }

        const db = await getDb();
        const now = Date.now();

        await db.transaction(async tx => {
            await dbQueries.deleteScriptCue(tx, {scriptId, cueId});
            await dbQueries.updateScriptTimestamp(tx, {scriptId, updatedAt: now});
            await recordOutbox({
                scriptId,
                entityKey: `cue:${cueId}`,
                opType: 'cue.delete',
                occurredAt: now,
                payloadJson: JSON.stringify({
                    scriptId, cueId, deletedAt: now,
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
        delete: deleteCue,
    };
};
