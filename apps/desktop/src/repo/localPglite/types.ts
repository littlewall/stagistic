import type {DbClient} from '@stagistic/db';

import type {LocalDb} from '~db';

export type GetDb = () => Promise<LocalDb>;

export interface OutboxPayload {
    scriptId: string,
    opType: string,
    payloadJson: string,
}

export type RecordOutbox = (payload: OutboxPayload, db?: DbClient) => Promise<void>;
