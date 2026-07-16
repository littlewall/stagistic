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
}

type LiveQueryHandle = Awaited<ReturnType<PGliteWithLive['live']['query']>>;

export const createPgliteReactiveQuerySource = <T>({
    getDb,
    readRows,
    watchQuery,
    watchParams = [],
}: CreatePgliteReactiveQuerySourceOptions<T>): ReactiveQuerySource<T> => {
    const listeners = new Set<ReactiveQueryListener<T>>();
    const errorListeners = new Set<ReactiveQueryErrorListener>();
    let liveQuery: LiveQueryHandle | null = null;
    let startPromise: Promise<void> | null = null;
    let readQueue = Promise.resolve();
    let snapshot: readonly T[] | null = null;
    let generation = 0;

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
        const read = readQueue
            .catch(() => undefined)
            .then(async () => {
                const rows = await readRows();

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

        const handle = liveQuery;

        liveQuery = null;
        startPromise = null;

        await handle?.unsubscribe();
    };

    const start = async () => {
        if (liveQuery) {
            return;
        }

        if (startPromise) {
            return startPromise;
        }

        const currentGeneration = generation;

        const nextStart = (async () => {
            const db = await getDb();
            const client = (db as unknown as {$client: PGliteWithLive}).$client;
            const handle = await client.live.query({
                query: watchQuery,
                params: watchParams,
                callback: () => {
                    void enqueueRead(false);
                },
            });

            if (currentGeneration !== generation || listeners.size === 0) {
                await handle.unsubscribe();

                return;
            }

            liveQuery = handle;
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

    return {
        read: readRows,
        subscribe: async (listener, onError) => {
            listeners.add(listener);

            if (onError) {
                errorListeners.add(onError);
            }

            try {
                if (liveQuery && snapshot) {
                    listener(snapshot);
                } else {
                    await start();
                }
            } catch (error) {
                listeners.delete(listener);

                if (onError) {
                    errorListeners.delete(onError);
                }

                if (listeners.size === 0) {
                    await stop();
                }

                throw error;
            }

            let active = true;

            return () => {
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
        },
        refresh: async () => {
            if (listeners.size > 0) {
                await start();
            }

            await enqueueRead(true);
        },
    };
};
