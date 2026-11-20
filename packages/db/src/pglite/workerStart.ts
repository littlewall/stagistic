import {
    describeStartFailure,
    isStartFailureKind,
    StartFailureError,
    startFailureFromInfo,
    type StartFailureInfo,
} from '@stagistic/shared';

/*
 * The database worker reports how its start is going. Failures raised inside
 * the worker never reach the page on their own: PGlite's worker protocol only
 * answers calls once the leader is ready, so a failed leader looks like a hang.
 */
const MESSAGE_TYPE = 'stagistic-db-start';

export type WorkerStartStage = 'loading-assets' | 'backing-up' | 'migrating' | 'ready' | 'failed';

export type WorkerStartMessage = {
    type: typeof MESSAGE_TYPE,
    stage: Exclude<WorkerStartStage, 'failed'>,
} | {
    type: typeof MESSAGE_TYPE,
    stage: 'failed',
    failure: StartFailureInfo,
};

export function workerStartMessage(stage: Exclude<WorkerStartStage, 'failed'>): WorkerStartMessage;
export function workerStartMessage(stage: 'failed', failure: StartFailureInfo): WorkerStartMessage;
export function workerStartMessage(stage: WorkerStartStage, failure?: StartFailureInfo): WorkerStartMessage {
    if (stage === 'failed') {
        return {
            type: MESSAGE_TYPE,
            stage,
            failure: failure ?? describeStartFailure(new Error('Unknown failure')),
        };
    }

    return {type: MESSAGE_TYPE, stage};
}

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null;
const parseWorkerStartMessage = (data: unknown): WorkerStartMessage | null => {
    if (!isRecord(data) || data.type !== MESSAGE_TYPE) {
        return null;
    }

    if (
        data.stage === 'loading-assets'
        || data.stage === 'backing-up'
        || data.stage === 'migrating'
        || data.stage === 'ready'
    ) {
        return workerStartMessage(data.stage);
    }

    const {failure} = data;

    if (data.stage === 'failed' && isRecord(failure) && isStartFailureKind(failure.kind)) {
        return workerStartMessage('failed', {
            kind: failure.kind,
            message: typeof failure.message === 'string' ? failure.message : '',
            ...typeof failure.migrationId === 'string' ? {migrationId: failure.migrationId} : {},
        });
    }

    return null;
};

type WorkerEvents = Pick<Worker, 'addEventListener' | 'removeEventListener'>;

interface WorkerStartWatch {
    /** Rejects when the worker reports a failure or its file cannot be loaded; never resolves. */
    failed: Promise<never>,
    stop: () => void,
}

export const watchWorkerStart = (
    worker: WorkerEvents,
    onStage: (stage: Exclude<WorkerStartStage, 'failed'>) => void,
): WorkerStartWatch => {
    let rejectFailed: (error: StartFailureError) => void = () => {};
    const failed = new Promise<never>((_resolve, reject) => {
        rejectFailed = reject;
    });

    // Callers race this promise; an unraced rejection must not surface as unhandled.
    failed.catch(() => {});

    const handleMessage = (event: Event) => {
        const message = parseWorkerStartMessage((event as MessageEvent).data);

        if (!message) {
            return;
        }

        if (message.stage === 'failed') {
            rejectFailed(startFailureFromInfo(message.failure));

            return;
        }

        onStage(message.stage);
    };

    // A worker file replaced by an HTML fallback page (a removed build) fails to load as a module.
    const handleError = () => {
        rejectFailed(new StartFailureError(
            'unknown',
            'The database worker could not be loaded. The file may belong to a newer version of Stagistic.',
        ));
    };

    worker.addEventListener('message', handleMessage);
    worker.addEventListener('error', handleError);

    return {
        failed,
        stop: () => {
            worker.removeEventListener('message', handleMessage);
            worker.removeEventListener('error', handleError);
        },
    };
};
