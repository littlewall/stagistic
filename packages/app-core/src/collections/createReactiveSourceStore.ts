export interface ReactiveSourceSnapshot<T> {
    rows: readonly T[],
    isReady: boolean,
    error: Error | null,
}

export interface ReactiveSourceStore<T> {
    subscribe: (listener: () => void) => () => void,
    getSnapshot: () => ReactiveSourceSnapshot<T>,
    setRows: (rows: readonly T[]) => void,
    setError: (error: Error) => void,
}

export const createReactiveSourceStore = <T>(): ReactiveSourceStore<T> => {
    const listeners = new Set<() => void>();
    let snapshot: ReactiveSourceSnapshot<T> = {
        rows: [],
        isReady: false,
        error: null,
    };
    const emit = (next: ReactiveSourceSnapshot<T>) => {
        snapshot = next;
        listeners.forEach(listener => listener());
    };

    return {
        subscribe: (listener: () => void) => {
            listeners.add(listener);

            return () => listeners.delete(listener);
        },
        getSnapshot: () => snapshot,
        setRows: rows => emit({
            rows,
            isReady: true,
            error: null,
        }),
        setError: error => emit({
            ...snapshot,
            isReady: true,
            error,
        }),
    };
};
