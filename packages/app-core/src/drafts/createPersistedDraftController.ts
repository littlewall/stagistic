import {createAsyncPersistencePacer} from '../pacing';
import {
    defaultDraftEquals,
    type PersistedDraftControllerOptions,
    type PersistedDraftEntity,
    type PersistedDraftSnapshot,
    toDraftError,
} from './persistedDraftContract';

export type {
    PersistedDraftScheduler,
    PersistedDraftSnapshot,
    PersistedDraftStatus,
} from './persistedDraftContract';

export const createPersistedDraftController = <TKey, TValue>({
    defaultValue,
    persist,
    debounceMs = 450,
    equals = defaultDraftEquals,
    scheduler,
}: PersistedDraftControllerOptions<TKey, TValue>) => {
    const listeners = new Set<() => void>();
    let entity: PersistedDraftEntity<TKey, TValue> = {
        key: null,
        confirmedValue: defaultValue,
        isHydrated: true,
    };
    let snapshot: PersistedDraftSnapshot<TValue> = {
        value: defaultValue,
        status: 'idle',
        isHydrated: true,
        isDirty: false,
        error: null,
    };
    let revision = 0;
    let generation = 0;
    let timer: unknown;
    let savePromise: Promise<void> | null = null;
    let isActive = false;
    let persistValue = persist;

    const emit = (next: PersistedDraftSnapshot<TValue>) => {
        snapshot = next;

        if (isActive) {
            listeners.forEach(listener => listener());
        }
    };

    const cancelScheduledSave = () => {
        if (!scheduler) {
            persistencePacer.cancel();

            return;
        }

        if (timer === undefined) {
            return;
        }

        scheduler.cancel(timer);
        timer = undefined;
    };

    const runSaveLoop = () => {
        if (savePromise) {
            return savePromise;
        }

        const saveGeneration = generation;
        const run = async () => {
            while (
                saveGeneration === generation
                && entity.key !== null
                && snapshot.isHydrated
                && snapshot.isDirty
            ) {
                const saveRevision = revision;
                const value = snapshot.value;
                const key = entity.key;

                emit({
                    ...snapshot, status: 'saving', error: null,
                });

                try {
                    await persistValue(key, value);
                } catch (error) {
                    if (saveGeneration !== generation) {
                        return;
                    }

                    if (saveRevision !== revision) {
                        continue;
                    }

                    emit({
                        ...snapshot, status: 'error', error: toDraftError(error),
                    });
                    throw error;
                }

                if (saveGeneration !== generation) {
                    return;
                }

                if (saveRevision !== revision) {
                    continue;
                }

                entity = {...entity, confirmedValue: value};
                emit({
                    value,
                    status: 'saved',
                    isHydrated: true,
                    isDirty: false,
                    error: null,
                });
            }
        };

        savePromise = run().finally(() => {
            savePromise = null;
        });

        return savePromise;
    };

    const persistencePacer = createAsyncPersistencePacer(
        () => runSaveLoop(),
        {
            key: 'persisted-draft',
            waitMs: debounceMs,
        },
    );

    const scheduleSave = () => {
        cancelScheduledSave();

        if (!isActive || !snapshot.isDirty || entity.key === null) {
            return;
        }

        if (!scheduler) {
            void persistencePacer.schedule().catch(() => undefined);

            return;
        }

        timer = scheduler.schedule(() => {
            timer = undefined;
            void runSaveLoop().catch(() => undefined);
        }, debounceMs);
    };

    const setEntity = ({
        key,
        confirmedValue,
        isHydrated,
    }: PersistedDraftEntity<TKey, TValue>) => {
        if (!Object.is(entity.key, key)) {
            generation += 1;
            revision = 0;
            cancelScheduledSave();
            entity = {
                key, confirmedValue, isHydrated: key === null || isHydrated,
            };
            emit({
                value: key === null || isHydrated ? confirmedValue : defaultValue,
                status: key !== null && !isHydrated ? 'loading' : 'idle',
                isHydrated: key === null || isHydrated,
                isDirty: false,
                error: null,
            });

            return;
        }

        const wasHydrated = entity.isHydrated;

        entity = {
            key, confirmedValue, isHydrated: key === null || isHydrated,
        };

        if (key !== null && !isHydrated) {
            if (!wasHydrated) {
                emit({
                    ...snapshot, status: 'loading', isHydrated: false,
                });
            }

            return;
        }

        if (!wasHydrated) {
            emit({
                value: confirmedValue,
                status: 'idle',
                isHydrated: true,
                isDirty: false,
                error: null,
            });

            return;
        }

        if (snapshot.isDirty) {
            if (
                snapshot.status !== 'saving'
                && equals(snapshot.value, confirmedValue)
            ) {
                cancelScheduledSave();
                emit({
                    ...snapshot, status: 'saved', isDirty: false, error: null,
                });
            }

            return;
        }

        if (!equals(snapshot.value, confirmedValue)) {
            emit({
                value: confirmedValue,
                status: 'idle',
                isHydrated: true,
                isDirty: false,
                error: null,
            });
        }
    };

    const update = (next: TValue | ((previous: TValue) => TValue)) => {
        if (entity.key === null || !snapshot.isHydrated) {
            return;
        }

        const value = typeof next === 'function'
            ? (next as (previous: TValue) => TValue)(snapshot.value)
            : next;
        const isDirty = !equals(value, entity.confirmedValue);

        revision += 1;
        emit({
            value,
            status: isDirty ? 'dirty' : 'saved',
            isHydrated: true,
            isDirty,
            error: null,
        });

        if (isDirty) {
            scheduleSave();
        } else {
            cancelScheduledSave();
        }
    };

    const flush = () => {
        cancelScheduledSave();

        if (!snapshot.isDirty || entity.key === null || !snapshot.isHydrated) {
            return Promise.resolve();
        }

        return runSaveLoop();
    };

    return {
        subscribe: (listener: () => void) => {
            listeners.add(listener);

            return () => {
                listeners.delete(listener);
            };
        },
        getSnapshot: () => snapshot,
        setEntity,
        setPersist: (nextPersist: typeof persist) => {
            persistValue = nextPersist;
        },
        update,
        flush,
        retry: flush,
        resume: () => {
            isActive = true;
            scheduleSave();
        },
        pause: () => {
            isActive = false;
            cancelScheduledSave();
        },
    };
};
