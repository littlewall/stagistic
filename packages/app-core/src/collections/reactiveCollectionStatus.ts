export type ReactiveMutationStatus = 'pending' | 'failed';

export interface ReactiveMutationState {
    action: string,
    entityKey: string | number,
    error: Error | null,
    status: ReactiveMutationStatus,
}

export interface ReactiveCollectionSnapshot {
    isReady: boolean,
    sourceError: Error | null,
    mutations: readonly ReactiveMutationState[],
}

type Listener = () => void;

export interface ReactiveCollectionStatusStore {
    getSnapshot: () => ReactiveCollectionSnapshot,
    subscribe: (listener: Listener) => () => void,
    setReady: () => void,
    setSourceError: (error: Error | null) => void,
    startMutation: (mutation: Omit<ReactiveMutationState, 'error' | 'status'>) => void,
    finishMutation: (entityKey: string | number, action: string) => void,
    failMutation: (
        entityKey: string | number,
        action: string,
        error: Error,
    ) => void,
}

export const createReactiveCollectionStatusStore = (): ReactiveCollectionStatusStore => {
    const listeners = new Set<Listener>();
    let snapshot: ReactiveCollectionSnapshot = {
        isReady: false,
        sourceError: null,
        mutations: [],
    };

    const emit = (nextSnapshot: ReactiveCollectionSnapshot) => {
        snapshot = nextSnapshot;
        listeners.forEach(listener => listener());
    };

    const removeMutation = (
        entityKey: string | number,
        action: string,
    ) => snapshot.mutations.filter(mutation => mutation.entityKey !== entityKey || mutation.action !== action);

    return {
        getSnapshot: () => snapshot,
        subscribe: listener => {
            listeners.add(listener);

            return () => listeners.delete(listener);
        },
        setReady: () => emit({...snapshot, isReady: true}),
        setSourceError: sourceError => emit({...snapshot, sourceError}),
        startMutation: mutation => emit({
            ...snapshot,
            mutations: [
                ...removeMutation(mutation.entityKey, mutation.action), {
                    ...mutation, error: null, status: 'pending',
                },
            ],
        }),
        finishMutation: (entityKey, action) => emit({
            ...snapshot,
            mutations: removeMutation(entityKey, action),
        }),
        failMutation: (entityKey, action, error) => emit({
            ...snapshot,
            mutations: [
                ...removeMutation(entityKey, action), {
                    entityKey, action, error, status: 'failed',
                },
            ],
        }),
    };
};
