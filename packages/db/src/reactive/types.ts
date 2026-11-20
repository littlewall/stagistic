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

/** A failed `subscribe` rejects with an error carrying the cleanup of the listener it left behind. */
export const unsubscribeOfFailedSubscribe = (error: unknown): (() => void) | undefined => {
    const unsubscribe = (error as {unsubscribe?: unknown} | null | undefined)?.unsubscribe;

    return typeof unsubscribe === 'function' ? unsubscribe as () => void : undefined;
};
