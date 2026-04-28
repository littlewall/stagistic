import {dbQueries} from '@stagistic/db';
import {uuidv7} from '@stagistic/shared';

import type {
    GetDb,
    RecordOutbox,
} from './types';

const ENABLE_OUTBOX = false;

export const createOutboxRecorder = (getDb: GetDb): RecordOutbox => {
    return async (payload, dbOverride) => {
        if (!ENABLE_OUTBOX) {
            return;
        }

        const db = dbOverride ?? await getDb();

        await dbQueries.insertOutbox(db, {
            id: uuidv7(),
            scriptId: payload.scriptId,
            opType: payload.opType,
            payloadJson: payload.payloadJson,
            createdAt: Date.now(),
            status: 'pending',
        });
    };
};
