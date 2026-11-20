import type {PGliteWithLive} from '@electric-sql/pglite/live';

import type {LocalDb} from '../pglite';
import type {
    ReactiveQueryErrorListener,
    ReactiveQueryListener,
    ReactiveQuerySource,
} from './types';

interface CreatePgliteReactiveQuerySourceOptions<T> {
    getDb: () => Promise<LocalDb>,
    readRows: () => Promise<readonly T[]>,
    watchQuery: string,
    watchParams?: unknown[],
    /** How long the live query may take to start, and a read to answer, before the call fails. */
    subscribeTimeoutMs?: number,
}

type LiveQueryHandle = Awaited<ReturnType<PGliteWithLive['live']['query']>>;

interface LiveClient extends PGliteWithLive {
    onLeaderChange?: (callback: () => void) => () => void,
}

const withTimeout = <T>(
    promise: Promise<T>,
    ms: number,
    message: string,
    onLateValue?: (value: T) => void,
): Promise<T> => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    let timedOutAlready = false;
    const timedOut = new Promise<never>((_resolve, reject) => {
        timer = setTimeout(() => {
            timedOutAlready = true;
            reject(new Error(message));
        }, ms);
    });

    promise.then(value => {
        if (timedOutAlready) {
            onLateValue?.(value);
        }
    }, () => {});

    return Promise.race([promise, timedOut]).finally(() => clearTimeout(timer));
};

export const createPgliteReactiveQuerySource = <T>({
    getDb,
    readRows,
    watchQuery,
    watchParams = [],
    subscribeTimeoutMs = 15_000,
}: CreatePgliteReactiveQuerySourceOptions<T>): ReactiveQuerySource<T> => {
    const listeners = new Set<ReactiveQueryListener<T>>();
    const errorListeners = new Set<ReactiveQueryErrorListener>();
    let liveQuery: LiveQueryHandle | null = null;
    let startPromise: Promise<void> | null = null;
    let readQueue = Promise.resolve();
    let snapshot: readonly T[] | null = null;
    let generation = 0;
    let stopLeaderChange = () => {};
    let reestablishTimer: ReturnType<typeof setTimeout> | undefined;
    let reestablishGate: Promise<void> | null = null;
    let openReestablishGate: () => void = () => {};

    let latestQueuedRead = 0;

    const readWithDeadline = (onLateRows?: (rows: readonly T[]) => void) => withTimeout(
        readRows(),
        subscribeTimeoutMs,
        'The list did not answer in time.',
        onLateRows,
    );

    const waitForReestablish = async () => {
        while (reestablishGate) {
            await reestablishGate;
        }
    };

    const settleReestablishGate = () => {
        openReestablishGate();
        reestablishGate = null;
    };

    const reportError = (error: unknown) => {
        const normalizedError = error instanceof Error
            ? error
            : new Error(String(error));

        errorListeners.forEach(listener => listener(normalizedError));

        return normalizedError;
    };

    const emit = (rows: readonly T[]) => {
        snapshot = rows;
        listeners.forEach(listener => listener(rows));
    };

    const enqueueRead = (throwOnError: boolean) => {
        latestQueuedRead += 1;

        const readId = latestQueuedRead;
        const read = readQueue
            .catch(() => undefined)
            .then(async () => {
                const rows = await readWithDeadline(lateRows => {
                    // The data arrived after the deadline; show it unless a newer read superseded it.
                    if (readId === latestQueuedRead && listeners.size > 0) {
                        emit(lateRows);
                    }
                });

                emit(rows);
            });

        readQueue = read.catch(() => undefined);

        if (throwOnError) {
            return read.catch(error => {
                throw reportError(error);
            });
        }

        void read.catch(reportError);

        return Promise.resolve();
    };

    const stop = async () => {
        generation += 1;
        stopLeaderChange();
        stopLeaderChange = () => {};
        clearTimeout(reestablishTimer);
        reestablishTimer = undefined;
        settleReestablishGate();

        const handle = liveQuery;

        liveQuery = null;
        startPromise = null;

        await handle?.unsubscribe();
    };

    const start = async () => {
        if (listeners.size === 0) {
            return;
        }

        if (liveQuery) {
            return;
        }

        if (startPromise) {
            return startPromise;
        }

        const currentGeneration = generation;

        const nextStart = (async () => {
            const db = await getDb();
            const client = (db as unknown as {$client: LiveClient}).$client;
            const handle = await withTimeout(
                client.live.query({
                    query: watchQuery,
                    params: watchParams,
                    callback: () => {
                        void enqueueRead(false);
                    },
                }),
                subscribeTimeoutMs,
                'The list did not answer in time.',
                lateHandle => {
                    // The leader answered after the deadline. Keep the handle when nothing replaced it.
                    if (currentGeneration === generation && !liveQuery && listeners.size > 0) {
                        liveQuery = lateHandle;
                        stopLeaderChange();
                        stopLeaderChange = client.onLeaderChange?.(reestablish) ?? (() => {});
                        void enqueueRead(false);

                        return;
                    }

                    void Promise.resolve(lateHandle.unsubscribe()).catch(() => {});
                },
            );

            if (currentGeneration !== generation || liveQuery) {
                await handle.unsubscribe().catch(() => {});

                return;
            }

            liveQuery = handle;
            stopLeaderChange();
            stopLeaderChange = client.onLeaderChange?.(reestablish) ?? (() => {});

            await enqueueRead(true);
        })();

        startPromise = nextStart;

        try {
            await nextStart;
        } finally {
            if (startPromise === nextStart) {
                startPromise = null;
            }
        }
    };

    /*
     * The live query's temp view lives on the leader's connection, so a leader
     * change kills it. The change arrives as two events (leader-now, then a
     * broadcast leader-here) with the tab still connected in between, so the
     * re-establish is debounced past them, and retried once more if a late
     * event still cut the first attempt off. Nothing awaits the old handle:
     * its view died with the old leader.
     */
    const reestablish = () => {
        generation += 1;
        liveQuery = null;
        startPromise = null;
        clearTimeout(reestablishTimer);

        if (!reestablishGate) {
            reestablishGate = new Promise<void>(resolve => {
                openReestablishGate = resolve;
            });
        }

        reestablishTimer = setTimeout(() => {
            reestablishTimer = undefined;

            const run = async () => {
                if (listeners.size === 0) {
                    return;
                }

                try {
                    await start();
                } catch {
                    if (listeners.size > 0) {
                        await new Promise(resolve => setTimeout(resolve, 200));

                        await start().catch(reportError);
                    }
                }
            };

            void run().finally(settleReestablishGate);
        }, 100);
    };

    return {
        read: () => readWithDeadline(),
        subscribe: async (listener, onError) => {
            listeners.add(listener);

            if (onError) {
                errorListeners.add(onError);
            }

            let active = true;
            const cleanup = () => {
                if (!active) {
                    return;
                }

                active = false;
                listeners.delete(listener);

                if (onError) {
                    errorListeners.delete(onError);
                }

                if (listeners.size === 0) {
                    void stop().catch(reportError);
                }
            };

            /*
             * On failure the listener stays subscribed so a later refresh or
             * leader change re-emits to it; "Try again" recovers without the
             * caller re-subscribing. The rejection carries `unsubscribe` so the
             * caller can still release the listener when it goes away.
             */
            try {
                await waitForReestablish();

                if (liveQuery && snapshot) {
                    listener(snapshot);
                } else if (liveQuery) {
                    // The live query is up but the first read never landed; re-read to emit.
                    await enqueueRead(true);
                } else {
                    await start();
                }
            } catch (error) {
                // A fresh error per subscriber: concurrent subscribers share one start rejection.
                throw Object.assign(
                    new Error(error instanceof Error ? error.message : String(error), {cause: error}),
                    {unsubscribe: cleanup},
                );
            }

            return cleanup;
        },
        refresh: async () => {
            await waitForReestablish();

            if (listeners.size > 0 && !liveQuery) {
                await start();
            }

            await enqueueRead(true);
        },
    };
};
