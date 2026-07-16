import type {ReactiveQuerySource} from '@stagistic/db';
import {
    createCollection,
    type PendingMutation,
} from '@tanstack/react-db';

import {
    createReactiveCollectionStatusStore,
    type ReactiveCollectionStatusStore,
} from './reactiveCollectionStatus';

export interface ReactiveCollectionMutationHandlers<T extends object> {
    insert?: (value: T) => Promise<void>,
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

type ReactivePendingMutation<T extends object, TKey extends string | number> = Omit<
    PendingMutation<T>,
    'key'
> & {key: TKey};

const createConfirmation = () => {
    let resolve!: () => void;
    let reject!: (error: Error) => void;
    const promise = new Promise<void>((resolvePromise, rejectPromise) => {
        resolve = resolvePromise;
        reject = rejectPromise;
    });

    return {
        promise, resolve, reject,
    };
};

const valuesEqual = (left: unknown, right: unknown) => Object.is(left, right)
    || JSON.stringify(left) === JSON.stringify(right);
const isConfirmed = <T extends object, TKey extends string | number>(
    rows: readonly T[],
    mutation: ReactivePendingMutation<T, TKey>,
    getKey: (value: T) => TKey,
) => {
    const row = rows.find(value => getKey(value) === mutation.key);

    if (mutation.type === 'delete') {
        return !row;
    }

    if (!row) {
        return false;
    }

    if (mutation.type === 'insert') {
        return true;
    }

    return Object.entries(mutation.changes).every(([key, value]) => valuesEqual(row[key as keyof T], value));
};

const waitForConfirmation = async <T extends object, TKey extends string | number>(
    source: ReactiveQuerySource<T>,
    mutation: ReactivePendingMutation<T, TKey>,
    getKey: (value: T) => TKey,
    timeoutMs: number,
) => {
    await source.refresh();

    if (isConfirmed(await source.read(), mutation, getKey)) {
        return;
    }

    const confirmation = createConfirmation();
    const timeout = setTimeout(() => {
        confirmation.reject(new Error(
            `Timed out confirming ${mutation.type} for entity ${String(mutation.key)}`,
        ));
    }, timeoutMs);
    let unsubscribe: (() => void) | undefined;

    try {
        unsubscribe = await source.subscribe(rows => {
            if (!isConfirmed(rows, mutation, getKey)) {
                return;
            }

            confirmation.resolve();
        }, error => {
            confirmation.reject(error);
        });
        await confirmation.promise;
    } finally {
        clearTimeout(timeout);
        unsubscribe?.();
    }
};

const createEntityQueue = () => {
    const queues = new Map<string | number, Promise<void>>();

    return (key: string | number, task: () => Promise<void>) => {
        const previous = queues.get(key) ?? Promise.resolve();
        const current = previous.catch(() => undefined).then(task);

        queues.set(key, current);
        void current.finally(() => {
            if (queues.get(key) === current) {
                queues.delete(key);
            }
        }).catch(() => undefined);

        return current;
    };
};

export const createReactiveCollection = <
    T extends object,
    TKey extends string | number,
>({
    id,
    source,
    getKey,
    handlers = {},
    confirmationTimeoutMs = 2_000,
}: CreateReactiveCollectionOptions<T, TKey>) => {
    const status = createReactiveCollectionStatusStore();
    const enqueueEntityMutation = createEntityQueue();

    const persist = async (
        mutation: ReactivePendingMutation<T, TKey>,
        action: ReactiveMutationAction,
    ) => enqueueEntityMutation(mutation.key, async () => {
        status.startMutation({entityKey: mutation.key, action});

        try {
            const commands = {
                insert: () => handlers.insert?.(mutation.modified),
                update: () => handlers.update?.(
                    mutation.original as T,
                    mutation.modified,
                    mutation.changes,
                ),
                delete: () => handlers.delete?.(mutation.original as T),
            };

            await commands[action]();
            await waitForConfirmation(source, mutation, getKey, confirmationTimeoutMs);
            status.finishMutation(mutation.key, action);
        } catch (error) {
            const normalizedError = error instanceof Error
                ? error
                : new Error(String(error));

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
                truncate,
            }) => {
                let active = true;
                let unsubscribe: (() => void) | undefined;

                const applySnapshot = (rows: readonly T[]) => {
                    if (!active) {
                        return;
                    }

                    begin({immediate: true});
                    truncate();
                    rows.forEach(value => write({type: 'insert', value}));
                    commit();

                    if (!status.getSnapshot().isReady) {
                        status.setReady();
                        markReady();
                    }

                    status.setSourceError(null);
                };

                void source.subscribe(applySnapshot, error => {
                    status.setSourceError(error);
                }).then(cleanup => {
                    if (!active) {
                        cleanup();

                        return;
                    }

                    unsubscribe = cleanup;
                }).catch(error => {
                    const normalizedError = error instanceof Error
                        ? error
                        : new Error(String(error));

                    status.setSourceError(normalizedError);
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
            await Promise.all(transaction.mutations.map(mutation => persist(
                mutation as ReactivePendingMutation<T, TKey>,
                'insert',
            )));
        },
        onUpdate: async ({transaction}) => {
            await Promise.all(transaction.mutations.map(mutation => persist(
                mutation as ReactivePendingMutation<T, TKey>,
                'update',
            )));
        },
        onDelete: async ({transaction}) => {
            await Promise.all(transaction.mutations.map(mutation => persist(
                mutation as ReactivePendingMutation<T, TKey>,
                'delete',
            )));
        },
    });

    return {collection, status};
};

export type {ReactiveCollectionStatusStore};
