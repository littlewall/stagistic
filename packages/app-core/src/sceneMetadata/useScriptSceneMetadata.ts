import type {ScriptRepository} from '@stagistic/db';
import {useLiveQuery} from '@tanstack/react-db';
import {useMemo} from 'react';

import {useReactiveCollectionStatus} from '../collections';
import {createSceneMetadataActions} from './sceneMetadataActions';
import {getSceneMetadataStore} from './sceneMetadataStore';

export const useSceneMetadataActions = (scriptId: string, repository: ScriptRepository, isReadOnly = false) => {
    return useMemo(() => createSceneMetadataActions(repository, scriptId, isReadOnly), [
        repository,
        scriptId,
        isReadOnly,
    ]);
};

export const useScriptSceneCharacters = (scriptId: string | null, repository: ScriptRepository) => {
    const store = useMemo(() => scriptId ? getSceneMetadataStore(repository, scriptId).characters : null, [repository, scriptId]);
    const status = useReactiveCollectionStatus(store?.status);
    const query = useLiveQuery(q => {
        if (!store) return undefined;

        return q.from({characters: store.collection}).orderBy(({characters}) => characters.createdAt, 'asc');
    }, [store]);

    return {
        sceneCharacters: query.data ?? [],
        isLoading: Boolean(store) && (!status.isReady || query.isLoading),
        error: status.sourceError,
    };
};

export const useScriptSceneSynopses = (scriptId: string | null, repository: ScriptRepository) => {
    const store = useMemo(() => scriptId ? getSceneMetadataStore(repository, scriptId).synopses : null, [repository, scriptId]);
    const status = useReactiveCollectionStatus(store?.status);
    const query = useLiveQuery(q => (store ? q.from({synopses: store.collection}) : undefined), [store]);

    return {
        sceneSynopses: query.data ?? [],
        isLoading: Boolean(store) && (!status.isReady || query.isLoading),
        error: status.sourceError,
    };
};
