export type ReactiveQueryListener<T> = (rows: readonly T[]) => void;
export type ReactiveQueryErrorListener = (error: Error) => void;

export interface ReactiveQuerySource<T> {
    read: () => Promise<readonly T[]>,
    subscribe: (
        listener: ReactiveQueryListener<T>,
        onError?: ReactiveQueryErrorListener,
    ) => Promise<() => void>,
    refresh: () => Promise<void>,
}
