import type {ScriptRepository} from '@stagistic/db';
import type {EditorSettingsOverride} from '@stagistic/script';
import {useLiveQuery} from '@tanstack/react-db';
import {
    useCallback,
    useMemo,
    useSyncExternalStore,
} from 'react';

import {getScriptEditorSettingsStore} from './scriptEditorSettingsStore';

const emptyStatus = {
    isReady: true,
    sourceError: null,
    mutations: [],
} as const;
const getEmptyStatus = () => emptyStatus;
const subscribeEmpty = () => () => undefined;
const emptyConfirmed = {
    rows: [],
    isReady: true,
    error: null,
} as const;
const getEmptyConfirmed = () => emptyConfirmed;

export const useScriptEditorSettingsRecord = (
    scriptId: string | null,
    repository: ScriptRepository,
) => {
    const store = useMemo(() => scriptId
        ? getScriptEditorSettingsStore(repository, scriptId)
        : null, [repository, scriptId]);
    const storeStatus = useSyncExternalStore(
        store?.status.subscribe ?? subscribeEmpty,
        store?.status.getSnapshot ?? getEmptyStatus,
        store?.status.getSnapshot ?? getEmptyStatus,
    );
    const confirmed = useSyncExternalStore(
        store?.confirmed.subscribe ?? subscribeEmpty,
        store?.confirmed.getSnapshot ?? getEmptyConfirmed,
        store?.confirmed.getSnapshot ?? getEmptyConfirmed,
    );
    const query = useLiveQuery(q => {
        if (!store) {
            return undefined;
        }

        return q.from({records: store.collection});
    }, [store]);
    const save = useCallback(
        (settings: EditorSettingsOverride) => store?.save(settings) ?? Promise.resolve(),
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
