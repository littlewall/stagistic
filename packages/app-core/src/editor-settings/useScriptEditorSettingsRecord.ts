import type {ScriptRepository} from '@stagistic/db';
import type {EditorSettingsOverride} from '@stagistic/script';
import {useLiveQuery} from '@tanstack/react-db';
import {
    useCallback,
    useMemo,
} from 'react';

import {
    useReactiveCollectionStatus,
    useReactiveSourceSnapshot,
} from '../collections';
import {getScriptEditorSettingsStore} from './scriptEditorSettingsStore';

export const useScriptEditorSettingsRecord = (
    scriptId: string | null,
    repository: ScriptRepository,
) => {
    const store = useMemo(() => scriptId
        ? getScriptEditorSettingsStore(repository, scriptId)
        : null, [repository, scriptId]);
    const storeStatus = useReactiveCollectionStatus(store?.status);
    const confirmed = useReactiveSourceSnapshot(store?.confirmed);
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
