import type {ReactiveQuerySource} from '@stagistic/db';

export interface ReactiveSourceSnapshot<T> {
    rows: readonly T[],
    isReady: boolean,
    error: Error | null,
}

export const createReactiveSourceStore = <T>(source: ReactiveQuerySource<T>) => {
    const listeners = new Set<() => void>();
    let snapshot: ReactiveSourceSnapshot<T> = {
        rows: [],
        isReady: false,
        error: null,
    };
    let generation = 0;
    let unsubscribeSource: (() => void) | undefined;

    const emit = (next: ReactiveSourceSnapshot<T>) => {
        snapshot = next;
        listeners.forEach(listener => listener());
    };

    const start = () => {
        const startGeneration = generation;

        void source.subscribe(rows => {
            if (startGeneration !== generation) {
                return;
            }

            emit({
                rows, isReady: true, error: null,
            });
        }, error => {
            if (startGeneration !== generation) {
                return;
            }

            emit({
                ...snapshot, isReady: true, error,
            });
        }).then(cleanup => {
            if (startGeneration !== generation || listeners.size === 0) {
                cleanup();

                return;
            }

            unsubscribeSource = cleanup;
        }).catch(error => {
            if (startGeneration !== generation) {
                return;
            }

            emit({
                ...snapshot,
                isReady: true,
                error: error instanceof Error ? error : new Error(String(error)),
            });
        });
    };

    return {
        subscribe: (listener: () => void) => {
            listeners.add(listener);

            if (listeners.size === 1) {
                start();
            }

            return () => {
                listeners.delete(listener);

                if (listeners.size > 0) {
                    return;
                }

                generation += 1;
                unsubscribeSource?.();
                unsubscribeSource = undefined;
            };
        },
        getSnapshot: () => snapshot,
    };
};
