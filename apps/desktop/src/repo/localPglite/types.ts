import type {LocalDb} from '~db';

export type GetDb = () => Promise<LocalDb>;

export interface OutboxPayload {
    scriptId: string,
    opType: string,
    payloadJson: string,
}

export type RecordOutbox = (payload: OutboxPayload) => Promise<void>;
