import {AsyncDebouncer} from '@tanstack/pacer';

export type PersistenceRetryProfile = 'none' | 'transient';

export interface AsyncPersistencePacerSnapshot {
    status: 'disabled' | 'idle' | 'pending' | 'executing' | 'settled',
    isPending: boolean,
    isExecuting: boolean,
    errorCount: number,
    successCount: number,
    lastError: Error | null,
}

interface CreateAsyncPersistencePacerOptions {
    key: string,
    waitMs: number,
    retryProfile?: PersistenceRetryProfile,
}

const retryOptions = {
    none: {
        maxAttempts: 1,
    },
    transient: {
        maxAttempts: 3,
        backoff: 'exponential' as const,
        baseWait: 250,
        maxWait: 2_000,
        jitter: 0.2,
    },
};

const toError = (error: unknown) => {
    return error instanceof Error ? error : new Error(String(error));
};

export const createAsyncPersistencePacer = <
    TArgs extends unknown[],
    TResult,
>(
    task: (...args: TArgs) => Promise<TResult>,
    {
        key,
        waitMs,
        retryProfile = 'none',
    }: CreateAsyncPersistencePacerOptions,
) => {
    const listeners = new Set<() => void>();
    let lastError: Error | null = null;
    let snapshot: AsyncPersistencePacerSnapshot;
    const debouncer = new AsyncDebouncer(task, {
        key,
        wait: waitMs,
        throwOnError: true,
        asyncRetryerOptions: retryOptions[retryProfile],
        onError: error => {
            lastError = toError(error);
        },
        onSuccess: () => {
            lastError = null;
        },
    });
    const readSnapshot = (): AsyncPersistencePacerSnapshot => {
        const state = debouncer.store.state;

        return {
            status: state.status,
            isPending: state.isPending,
            isExecuting: state.isExecuting,
            errorCount: state.errorCount,
            successCount: state.successCount,
            lastError,
        };
    };

    snapshot = readSnapshot();

    const subscription = debouncer.store.subscribe(() => {
        snapshot = readSnapshot();
        listeners.forEach(listener => listener());
    });

    return {
        schedule: (...args: TArgs) => {
            lastError = null;

            return debouncer.maybeExecute(...args);
        },
        flush: () => debouncer.flush(),
        cancel: () => debouncer.cancel(),
        abort: () => debouncer.abort(),
        reset: () => {
            lastError = null;
            debouncer.reset();
        },
        subscribe: (listener: () => void) => {
            listeners.add(listener);

            return () => listeners.delete(listener);
        },
        getSnapshot: () => snapshot,
        dispose: () => {
            debouncer.cancel();
            debouncer.abort();
            subscription.unsubscribe();
            listeners.clear();
        },
    };
};

export type AsyncPersistencePacer = ReturnType<typeof createAsyncPersistencePacer>;
