import {syncOutbox} from '../../schema';
import type {DbClient} from '../types';

/**
 * Insert a new outbox entry for sync.
 */
export const insertOutbox = async (db: DbClient, payload: {
    id: string,
    scriptId: string | null,
    opType: string | null,
    payloadJson: string | null,
    createdAt: number | null,
    status: string,
}) => {
    await db.insert(syncOutbox).values({
        id: payload.id,
        scriptId: payload.scriptId,
        opType: payload.opType,
        payloadJson: payload.payloadJson,
        createdAt: payload.createdAt,
        status: payload.status,
    });
};
