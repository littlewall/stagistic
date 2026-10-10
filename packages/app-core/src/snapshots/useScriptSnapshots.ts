import type {ScriptRepository} from '@stagistic/db';
import {useMemo} from 'react';

import {useReactiveCollectionStatus, useReactiveSourceSnapshot} from '../collections';
import {getScriptSnapshotsStore} from './scriptSnapshotsStore';

/** Snapshots of a script, newest first. */
export const useScriptSnapshots = (
    scriptId: string | null,
    repository: ScriptRepository,
) => {
    const store = useMemo(() => scriptId
        ? getScriptSnapshotsStore(repository, scriptId)
        : null, [repository, scriptId]);
    const status = useReactiveCollectionStatus(store?.status);
    const confirmed = useReactiveSourceSnapshot(store?.confirmed);
    const snapshots = useMemo(() => [...confirmed.rows].sort((left, right) => {
        return right.createdAt - left.createdAt || (left.id < right.id ? 1 : -1);
    }), [confirmed.rows]);

    return {
        snapshots,
        isLoading: Boolean(store) && (!status.isReady || !confirmed.isReady),
        error: confirmed.error ?? status.sourceError ?? null,
    };
};
