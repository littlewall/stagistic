import type {ReactiveQuerySource} from '@stagistic/db';
import {structuralValueEquals} from '@stagistic/shared';
import {createCollection, type PendingMutation} from '@tanstack/react-db';

import {createKeyedTaskQueue} from './createKeyedTaskQueue';
import {createReactiveSourceStore} from './createReactiveSourceStore';
import {createReactiveCollectionStatusStore} from './reactiveCollectionStatus';

export interface ReactiveCollectionMutationHandlers<T extends object> {
    /**
     * May resolve with the durable record: the server assigns values the optimistic copy
     * cannot know (timestamps), so confirmation compares the returned record instead.
     */
    insert?: (value: T) => Promise<T | void>,
    update?: (original: T, modified: T, changes: Partial<T>) => Promise<void>,
    delete?: (value: T) => Promise<void>,
}

interface CreateReactiveCollectionOptions<T extends object, TKey extends string | number> {
    id: string,
    source: ReactiveQuerySource<T>,
    getKey: (value: T) => TKey,
    handlers?: ReactiveCollectionMutationHandlers<T>,
    confirmationTimeoutMs?: number,
}

type ReactiveMutationAction = 'insert' | 'update' | 'delete';

const COLLECTION_VIRTUAL_KEYS = [
    '$collectionId',
    '$key',
    '$origin',
    '$synced',
] as const;

export const toDomainCollectionValue = <T extends object>(value: T): T => {
    const domainValue = {...value} as T & Record<string, unknown>;

    COLLECTION_VIRTUAL_KEYS.forEach(key => {
        delete domainValue[key];
    });

    return domainValue;
};

type ReactivePendingMutation<T extends object, TKey extends string | number> = Omit<PendingMutation<T>, 'key'> & {key: TKey};

const createConfirmation = () => {
    let resolve!: () => void;
    let reject!: (error: Error) => void;
    const promise = new Promise<void>((resolvePromise, rejectPromise) => {
        resolve = resolvePromise;
        reject = rejectPromise;
    });

    return {
        promise,
        resolve,
        reject,
    };
};

const isConfirmed = <T extends object, TKey extends string | number>(
    rows: readonly T[],
    mutation: ReactivePendingMutation<T, TKey>,
    getKey: (value: T) => TKey,
    durableInsert?: T,
) => {
    const row = rows.find(value => getKey(value) === mutation.key);

    if (mutation.type === 'delete') {
        return !row;
    }

    if (!row) {
        return false;
    }

    const expectedValues = mutation.type === 'insert' ? toDomainCollectionValue(durableInsert ?? mutation.modified) : mutation.changes;

    return Object.entries(expectedValues).every(([key, value]) => {
        return structuralValueEquals(row[key as keyof T], value);
    });
};

const waitForConfirmation = async <T extends object, TKey extends string | number>(
    source: ReactiveQuerySource<T>,
    mutation: ReactivePendingMutation<T, TKey>,
    getKey: (value: T) => TKey,
    timeoutMs: number,
    durableInsert?: T,
) => {
    await source.refresh();

    if (isConfirmed(await source.read(), mutation, getKey, durableInsert)) {
        return;
    }

    const confirmation = createConfirmation();
    const timeout = setTimeout(() => {
        confirmation.reject(new Error(`Timed out confirming ${mutation.type} for entity ${String(mutation.key)}`));
    }, timeoutMs);
    let unsubscribe: (() => void) | undefined;

    try {
        unsubscribe = await source.subscribe(
            rows => {
                if (!isConfirmed(rows, mutation, getKey, durableInsert)) {
                    return;
                }

                confirmation.resolve();
            },
            error => {
                confirmation.reject(error);
            },
        );
        await confirmation.promise;
    } finally {
        clearTimeout(timeout);
        unsubscribe?.();
    }
};

export const createReactiveCollection = <T extends object, TKey extends string | number>({
    id,
    source,
    getKey,
    handlers = {},
    confirmationTimeoutMs = 2_000,
}: CreateReactiveCollectionOptions<T, TKey>) => {
    const status = createReactiveCollectionStatusStore();
    const confirmed = createReactiveSourceStore<T>();
    const enqueueEntityMutation = createKeyedTaskQueue<TKey>();

    const persist = async (mutation: ReactivePendingMutation<T, TKey>, action: ReactiveMutationAction) => enqueueEntityMutation(mutation.key, async () => {
        status.startMutation({entityKey: mutation.key, action});

        try {
            const commands = {
                insert: handlers.insert ? () => handlers.insert?.(mutation.modified) : undefined,
                update: handlers.update ? () => handlers.update?.(mutation.original as T, mutation.modified, mutation.changes) : undefined,
                delete: handlers.delete ? () => handlers.delete?.(mutation.original as T) : undefined,
            };
            const command = commands[action];

            if (!command) {
                throw new Error(`Missing ${action} handler for collection ${id}`);
            }

            const result = await command();
            const durableInsert = action === 'insert' && result ? result : undefined;

            await waitForConfirmation(source, mutation, getKey, confirmationTimeoutMs, durableInsert);
            status.finishMutation(mutation.key, action);
        } catch (error) {
            const normalizedError = error instanceof Error ? error : new Error(String(error));

            status.failMutation(mutation.key, action, normalizedError);
            throw normalizedError;
        }
    });

    const collection = createCollection<T, TKey>({
        id,
        getKey,
        startSync: true,
        syncMode: 'eager',
        sync: {
            rowUpdateMode: 'full',
            sync: ({
                begin,
                write,
                commit,
                markReady,
            }) => {
                let active = true;
                let unsubscribe: (() => void) | undefined;
                let previousRows = new Map<TKey, T>();

                const applySnapshot = (rows: readonly T[]) => {
                    if (!active) {
                        return;
                    }

                    const nextRows = new Map(rows.map(value => [getKey(value), value]));

                    /*
                     * Let TanStack apply the confirming snapshot after pending writes settle.
                     * An immediate truncate would restore the client copy over server values.
                     */
                    begin();
                    previousRows.forEach((value, key) => {
                        if (!nextRows.has(key)) write({type: 'delete', value});
                    });
                    nextRows.forEach((value, key) => {
                        const previous = previousRows.get(key);

                        if (!previous) {
                            write({type: 'insert', value});

                            return;
                        }

                        if (!structuralValueEquals(previous, value)) write({type: 'update', value});
                    });
                    commit();
                    previousRows = nextRows;
                    confirmed.setRows(rows);

                    if (!status.getSnapshot().isReady) {
                        status.setReady();
                        markReady();
                    }

                    status.setSourceError(null);
                };

                void source
                    .subscribe(applySnapshot, error => {
                        status.setSourceError(error);
                        confirmed.setError(error);
                    })
                    .then(cleanup => {
                        if (!active) {
                            cleanup();

                            return;
                        }

                        unsubscribe = cleanup;
                    })
                    .catch(error => {
                        if (!active) {
                            return;
                        }

                        const normalizedError = error instanceof Error ? error : new Error(String(error));

                        status.setSourceError(normalizedError);
                        confirmed.setError(normalizedError);
                        status.setReady();
                        markReady();
                    });

                return () => {
                    active = false;
                    unsubscribe?.();
                };
            },
        },
        onInsert: async ({transaction}) => {
            await Promise.all(transaction.mutations.map(mutation => persist(mutation as ReactivePendingMutation<T, TKey>, 'insert')));
        },
        onUpdate: async ({transaction}) => {
            await Promise.all(transaction.mutations.map(mutation => persist(mutation as ReactivePendingMutation<T, TKey>, 'update')));
        },
        onDelete: async ({transaction}) => {
            await Promise.all(transaction.mutations.map(mutation => persist(mutation as ReactivePendingMutation<T, TKey>, 'delete')));
        },
    });

    return {
        collection,
        status,
        confirmed,
    };
};
