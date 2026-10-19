import type {PersistedDraftEntity, PersistedDraftSnapshot} from './persistedDraftContract';

export type DraftEntityReconciliation<TValue> =
    /** Another entity was loaded: start a new save generation, then emit. */
    {type: 'switch', snapshot: PersistedDraftSnapshot<TValue>} | {
        type: 'emit',
        snapshot: PersistedDraftSnapshot<TValue>,
        cancelSave: boolean,
    } | {type: 'none'};

interface ReconcileDraftEntityArgs<TKey, TValue> {
    previous: PersistedDraftEntity<TKey, TValue>,
    next: PersistedDraftEntity<TKey, TValue>,
    snapshot: PersistedDraftSnapshot<TValue>,
    defaultValue: TValue,
    equals: (a: TValue, b: TValue) => boolean,
    isSaveInFlight: boolean,
}

const settled = <TValue>(value: TValue): PersistedDraftSnapshot<TValue> => ({
    value,
    status: 'idle',
    isHydrated: true,
    isDirty: false,
    error: null,
});

/** Decides how a confirmed-value update from the source reconciles with the local draft. */
export const reconcileDraftEntity = <TKey, TValue>({
    previous,
    next,
    snapshot,
    defaultValue,
    equals,
    isSaveInFlight,
}: ReconcileDraftEntityArgs<TKey, TValue>): DraftEntityReconciliation<TValue> => {
    const {key, confirmedValue} = next;
    const isHydrated = key === null || next.isHydrated;

    if (!Object.is(previous.key, key)) {
        return {
            type: 'switch',
            snapshot: {
                value: isHydrated ? confirmedValue : defaultValue,
                status: isHydrated ? 'idle' : 'loading',
                isHydrated,
                isDirty: false,
                error: null,
            },
        };
    }

    if (!isHydrated) {
        return previous.isHydrated ? {type: 'none'} : {
            type: 'emit',
            snapshot: {
                ...snapshot,
                status: 'loading',
                isHydrated: false,
            },
            cancelSave: false,
        };
    }

    if (!previous.isHydrated) {
        return {
            type: 'emit',
            snapshot: settled(confirmedValue),
            cancelSave: false,
        };
    }

    if (snapshot.isDirty) {
        return snapshot.status !== 'saving' && equals(snapshot.value, confirmedValue)
            ? {
                type: 'emit',
                snapshot: {
                    ...snapshot,
                    status: 'saved',
                    isDirty: false,
                    error: null,
                },
                cancelSave: true,
            }
            : {type: 'none'};
    }

    // While a save is in flight, reconcile after it settles; the echo may predate it.
    if (equals(snapshot.value, confirmedValue) || isSaveInFlight) {
        return {type: 'none'};
    }

    return {
        type: 'emit',
        snapshot: settled(confirmedValue),
        cancelSave: false,
    };
};
