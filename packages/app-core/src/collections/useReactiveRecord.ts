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
        /*
         * Settings/title-page draft controllers need a confirmed baseline, not their own
         * pending save echoed back as an external edit. The live query tracks loading only.
         */
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
