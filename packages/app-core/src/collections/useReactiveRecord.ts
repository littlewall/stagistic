import {useLiveQuery} from '@tanstack/react-db';
import {useCallback} from 'react';

import type {createReactiveCollection} from './createReactiveCollection';
import {useReactiveCollectionStatus, useReactiveSourceSnapshot} from './useReactiveCollectionState';

type ReactiveRecordStore<T extends object, TValue> = ReturnType<typeof createReactiveCollection<T, string>> & {
    save: (value: TValue) => Promise<void>,
};

export const useReactiveRecord = <T extends object, TValue>(store: ReactiveRecordStore<T, TValue> | null) => {
    const storeStatus = useReactiveCollectionStatus(store?.status);
    const confirmed = useReactiveSourceSnapshot(store?.confirmed);
    const query = useLiveQuery(q => {
        if (!store) {
            return undefined;
        }

        return q.from({records: store.collection});
    }, [store]);
    const save = useCallback(
        (value: TValue) => store?.save(value) ?? Promise.resolve(),
        [store],
    );

    return {
        record: confirmed.rows[0] ?? null,
        isLoading: Boolean(store) && (
            !storeStatus.isReady
            || !confirmed.isReady
            || query.isLoading
        ),
        error: confirmed.error
            ?? storeStatus.sourceError
            ?? storeStatus.mutations.find(mutation => mutation.status === 'failed')?.error
            ?? null,
        save,
    };
};
