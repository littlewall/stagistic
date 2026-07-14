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

    const create: ScriptCuesRepository['create'] = async (scriptId, input) => {
        const title = input.title.trim();

        if (!title) {
            return null;
        }

        const db = await getDb();
        const now = Date.now();
        const cueId = uuidv7();

        await dbQueries.insertScriptCue(db, {
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
        await dbQueries.updateScriptTimestamp(db, {
            scriptId,
            updatedAt: now,
        });
        await recordOutbox({
            scriptId,
            opType: 'cue.create',
            payloadJson: JSON.stringify({
                scriptId,
                cueId,
                title,
                kind: input.kind,
                createdAt: now,
            }),
        });
        await syncDb();

        return dbQueries.getScriptCueById(db, {
            scriptId,
            cueId,
        });
    };

    const update: ScriptCuesRepository['update'] = async (scriptId, cueId, input) => {
        const title = input.title.trim();

        if (!cueId || !title) {
            return null;
        }

        const db = await getDb();
        const now = Date.now();

        await dbQueries.updateScriptCue(db, {
            scriptId,
            cueId,
            title,
            kind: input.kind,
            updatedAt: now,
        });
        await dbQueries.updateScriptTimestamp(db, {
            scriptId,
            updatedAt: now,
        });
        await recordOutbox({
            scriptId,
            opType: 'cue.update',
            payloadJson: JSON.stringify({
                scriptId,
                cueId,
                title,
                kind: input.kind,
                updatedAt: now,
            }),
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

        await dbQueries.deleteScriptCue(db, {
            scriptId,
            cueId,
        });
        await dbQueries.updateScriptTimestamp(db, {
            scriptId,
            updatedAt: now,
        });
        await recordOutbox({
            scriptId,
            opType: 'cue.delete',
            payloadJson: JSON.stringify({
                scriptId,
                cueId,
                deletedAt: now,
            }),
        });
        await syncDb();
    };

    const unassign: ScriptCuesRepository['unassign'] = async (scriptId, cueId) => {
        if (!cueId) {
            return null;
        }

        const db = await getDb();
        const now = Date.now();

        await dbQueries.unassignScriptCue(db, {
            scriptId,
            cueId,
            updatedAt: now,
        });
        await dbQueries.updateScriptTimestamp(db, {
            scriptId,
            updatedAt: now,
        });
        await recordOutbox({
            scriptId,
            opType: 'cue.unassign',
            payloadJson: JSON.stringify({
                scriptId,
                cueId,
                updatedAt: now,
            }),
        });
        await syncDb();

        return dbQueries.getScriptCueById(db, {
            scriptId,
            cueId,
        });
    };

    return {
        list,
        create,
        update,
        delete: deleteCue,
        unassign,
    };
};
