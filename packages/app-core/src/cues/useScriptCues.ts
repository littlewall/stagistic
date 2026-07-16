import type {
    CreateScriptCueInput,
    ScriptRepository,
    UpdateScriptCueInput,
} from '@stagistic/db';
import {useLiveQuery} from '@tanstack/react-db';
import {
    useCallback,
    useMemo,
    useSyncExternalStore,
} from 'react';

import {getScriptCuesStore} from './scriptCuesStore';

const emptyStatus = {
    isReady: true,
    sourceError: null,
    mutations: [],
} as const;
const getEmptyStatus = () => emptyStatus;
const subscribeEmpty = () => () => undefined;

export const useScriptCues = (
    scriptId: string | null,
    repository: ScriptRepository,
) => {
    const store = useMemo(() => scriptId
        ? getScriptCuesStore(repository, scriptId)
        : null, [repository, scriptId]);
    const status = useSyncExternalStore(
        store?.status.subscribe ?? subscribeEmpty,
        store?.status.getSnapshot ?? getEmptyStatus,
        store?.status.getSnapshot ?? getEmptyStatus,
    );
    const query = useLiveQuery(
        q => {
            if (!store) {
                return undefined;
            }

            return q
                .from({cues: store.collection})
                .orderBy(({cues}) => cues.sceneNumber, 'asc')
                .orderBy(({cues}) => cues.indexInScene, 'asc');
        },
        [store],
    );
    const createCue = useCallback(
        (input: CreateScriptCueInput) => store?.createCue(input) ?? Promise.resolve(null),
        [store],
    );
    const updateCue = useCallback(
        (cueId: string, input: UpdateScriptCueInput) => store?.updateCue(cueId, input) ?? Promise.resolve(null),
        [store],
    );
    const deleteCue = useCallback(
        (cueId: string) => store?.deleteCue(cueId) ?? Promise.resolve(),
        [store],
    );

    return {
        cues: query.data ?? [],
        isLoading: Boolean(store) && (!status.isReady || query.isLoading),
        error: status.sourceError
            ?? status.mutations.find(mutation => mutation.status === 'failed')?.error
            ?? null,
        createCue,
        updateCue,
        deleteCue,
    };
};
