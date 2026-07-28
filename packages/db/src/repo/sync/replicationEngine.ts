import type {MutationEnvelope} from './mutationEnvelope';

export interface OutboundMutationBatch {
    batchId: string,
    operations: readonly MutationEnvelope[],
}

export interface ReplicationAcknowledgement {
    batchId: string,
    acknowledgedOperationIds: readonly string[],
    rejectedOperationIds: readonly string[],
}

export interface InboundMutationBatch {
    cursor: string | null,
    operations: readonly MutationEnvelope[],
}

export interface ReplicationRetryPolicy {
    nextDelayMs: (attempt: number, error: Error) => number,
}

export type ReplicationStatus =
    | {state: 'idle'}
    | {state: 'sending', operationCount: number}
    | {state: 'receiving'}
    | {
        state: 'retrying', attempt: number, nextAttemptAt: number,
    }
    | {state: 'error', error: Error};

export interface ReplicationTransport {
    send: (batch: OutboundMutationBatch) => Promise<ReplicationAcknowledgement>,
    receive: (cursor: string | null) => Promise<InboundMutationBatch>,
}

export interface ReplicationEnginePort {
    flushOutbound: () => Promise<void>,
    applyInboundToPglite: (batch: InboundMutationBatch) => Promise<void>,
    getStatus: () => ReplicationStatus,
    subscribeStatus: (listener: () => void) => () => void,
}
