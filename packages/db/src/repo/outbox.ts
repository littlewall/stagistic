import {uuidv7} from '@stagistic/shared';

import * as dbQueries from '../queries';
import {
    createMutationEnvelope,
    serializeMutationEnvelope,
} from './sync/mutationEnvelope';
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
        const occurredAt = payload.occurredAt ?? Date.now();
        const operationId = payload.operationId ?? uuidv7();
        let domainPayload: unknown = payload.payloadJson;

        try {
            domainPayload = JSON.parse(payload.payloadJson);
        } catch {
            // Preserve forward-compatible opaque payloads as strings.
        }

        const envelope = createMutationEnvelope({
            operationId,
            operationType: payload.opType,
            entityKey: payload.entityKey ?? `script:${payload.scriptId}`,
            scriptId: payload.scriptId,
            occurredAt,
            payload: domainPayload,
        });

        await dbQueries.insertOutbox(db, {
            id: operationId,
            scriptId: payload.scriptId,
            opType: payload.opType,
            payloadJson: serializeMutationEnvelope(envelope),
            createdAt: occurredAt,
            status: 'pending',
        });
    };
};
