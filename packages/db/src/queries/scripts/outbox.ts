import {syncOutbox} from '../../schema';
import type {DbClient} from '../types';
import type {InsertOutboxPayload} from './payloads';

/**
 * Insert a new outbox entry for sync.
 */
export const insertOutbox = async (db: DbClient, payload: InsertOutboxPayload) => {
    await db.insert(syncOutbox).values({
        id: payload.id,
        scriptId: payload.scriptId,
        opType: payload.opType,
        payloadJson: payload.payloadJson,
        createdAt: payload.createdAt,
        status: payload.status,
    });
};
