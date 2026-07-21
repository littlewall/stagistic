import type {
    CreateScriptMusicInput,
    ScriptRepository,
    UpdateScriptMusicInput,
} from '@stagistic/db';
import {useLiveQuery} from '@tanstack/react-db';
import {
    useCallback,
    useMemo,
} from 'react';

import {useReactiveCollectionStatus} from '../collections';
import {getScriptMusicStore} from './scriptMusicStore';

export const useScriptMusic = (
    scriptId: string | null,
    repository: ScriptRepository,
) => {
    const store = useMemo(() => scriptId
        ? getScriptMusicStore(repository, scriptId)
        : null, [repository, scriptId]);
    const status = useReactiveCollectionStatus(store?.status);
    const query = useLiveQuery(
        q => {
            if (!store) {
                return undefined;
            }

            return q
                .from({music: store.collection})
                .orderBy(({music}) => music.sceneNumber, 'asc')
                .orderBy(({music}) => music.indexInScene, 'asc');
        },
        [store],
    );
    const createMusic = useCallback(
        (input: CreateScriptMusicInput) => store?.createMusic(input) ?? Promise.resolve(null),
        [store],
    );
    const updateMusic = useCallback(
        (musicId: string, input: UpdateScriptMusicInput) => store?.updateMusic(musicId, input) ?? Promise.resolve(null),
        [store],
    );
    const deleteMusic = useCallback(
        (musicId: string) => store?.deleteMusic(musicId) ?? Promise.resolve(),
        [store],
    );

    return {
        music: query.data ?? [],
        isLoading: Boolean(store) && (!status.isReady || query.isLoading),
        error: status.sourceError
            ?? status.mutations.find(mutation => mutation.status === 'failed')?.error
            ?? null,
        createMusic,
        updateMusic,
        deleteMusic,
    };
};
