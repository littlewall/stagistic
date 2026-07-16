import type {
    ReactiveQueryErrorListener,
    ReactiveQueryListener,
    ReactiveQuerySource,
} from './types';

export interface InMemoryReactiveQuerySource<T> extends ReactiveQuerySource<T> {
    emit: (rows: readonly T[]) => void,
    emitError: (error: Error) => void,
    listenerCount: () => number,
}

export const createInMemoryReactiveQuerySource = <T>(
    initialRows: readonly T[] = [],
): InMemoryReactiveQuerySource<T> => {
    const listeners = new Set<ReactiveQueryListener<T>>();
    const errorListeners = new Set<ReactiveQueryErrorListener>();
    let rows = initialRows;

    const emit = (nextRows: readonly T[]) => {
        rows = nextRows;
        listeners.forEach(listener => listener(rows));
    };

    return {
        read: () => Promise.resolve(rows),
        subscribe: (listener, onError) => {
            listeners.add(listener);

            if (onError) {
                errorListeners.add(onError);
            }

            listener(rows);

            return Promise.resolve(() => {
                listeners.delete(listener);

                if (onError) {
                    errorListeners.delete(onError);
                }
            });
        },
        refresh: () => {
            listeners.forEach(listener => listener(rows));

            return Promise.resolve();
        },
        emit,
        emitError: error => {
            errorListeners.forEach(listener => listener(error));
        },
        listenerCount: () => listeners.size,
    };
};
