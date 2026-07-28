import {useSyncExternalStore} from 'react';

import type {
    ReactiveSourceSnapshot,
    ReactiveSourceStore,
} from './createReactiveSourceStore';
import type {ReactiveCollectionStatusStore} from './reactiveCollectionStatus';

const emptyStatus = {
    isReady: true,
    sourceError: null,
    mutations: [],
} as const;
const emptySource = {
    rows: [],
    isReady: true,
    error: null,
} as const;
const getEmptyStatus = () => emptyStatus;
const getEmptySource = <T>() => emptySource as ReactiveSourceSnapshot<T>;
const subscribeEmpty = () => () => undefined;

export const useReactiveCollectionStatus = (
    status?: ReactiveCollectionStatusStore,
) => useSyncExternalStore(
    status?.subscribe ?? subscribeEmpty,
    status?.getSnapshot ?? getEmptyStatus,
    status?.getSnapshot ?? getEmptyStatus,
);

export const useReactiveSourceSnapshot = <T>(
    source?: ReactiveSourceStore<T>,
) => useSyncExternalStore(
    source?.subscribe ?? subscribeEmpty,
    source?.getSnapshot ?? getEmptySource<T>,
    source?.getSnapshot ?? getEmptySource<T>,
);
