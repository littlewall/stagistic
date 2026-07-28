import type {LocalDb} from '../pglite';
import type {DbClient} from '../queries';

export type GetDb = () => Promise<LocalDb>;

export type SyncDb = () => Promise<void>;

export interface OutboxPayload {
    scriptId: string,
    opType: string,
    payloadJson: string,
    entityKey?: string,
    operationId?: string,
    occurredAt?: number,
}

export type RecordOutbox = (payload: OutboxPayload, db?: DbClient) => Promise<void>;
