import type {DbClient} from '../queries';

import type {LocalDb} from '../pglite';

export type GetDb = () => Promise<LocalDb>;

export type SyncDb = () => Promise<void>;

export interface OutboxPayload {
    scriptId: string,
    opType: string,
    payloadJson: string,
}

export type RecordOutbox = (payload: OutboxPayload, db?: DbClient) => Promise<void>;
