import type {ScriptRepository} from '@stagistic/db';
import {useLiveQuery} from '@tanstack/react-db';
import {
    useCallback,
    useMemo,
    useSyncExternalStore,
} from 'react';

import {getScriptPlacesStore} from './scriptPlacesStore';

const emptyStatus = {
    isReady: true,
    sourceError: null,
    mutations: [],
} as const;
const getEmptyStatus = () => emptyStatus;
const subscribeEmpty = () => () => undefined;

export const useScriptPlaces = (
    scriptId: string | null,
    repository: ScriptRepository,
) => {
    const store = useMemo(() => scriptId
        ? getScriptPlacesStore(repository, scriptId)
        : null, [repository, scriptId]);
    const locationsStatus = useSyncExternalStore(
        store?.locationsStatus.subscribe ?? subscribeEmpty,
        store?.locationsStatus.getSnapshot ?? getEmptyStatus,
        store?.locationsStatus.getSnapshot ?? getEmptyStatus,
    );
    const assignmentsStatus = useSyncExternalStore(
        store?.assignmentsStatus.subscribe ?? subscribeEmpty,
        store?.assignmentsStatus.getSnapshot ?? getEmptyStatus,
        store?.assignmentsStatus.getSnapshot ?? getEmptyStatus,
    );
    const locationsQuery = useLiveQuery(
        q => {
            if (!store) {
                return undefined;
            }

            return q
                .from({locations: store.locationsCollection})
                .orderBy(({locations}) => locations.name, 'asc');
        },
        [store],
    );
    const assignmentsQuery = useLiveQuery(
        q => {
            if (!store) {
                return undefined;
            }

            return q.from({assignments: store.assignmentsCollection});
        },
        [store],
    );
    const places = useMemo(() => locationsQuery.data ?? [], [locationsQuery.data]);
    const scenePlaceIds = useMemo(
        () => (assignmentsQuery.data ?? []).reduce<Record<string, string[]>>(
            (result, assignment) => {
                const currentIds = result[assignment.sceneHeadingBlockId] ?? [];

                result[assignment.sceneHeadingBlockId] = [...currentIds, assignment.locationId];

                return result;
            },
            {},
        )
        , [assignmentsQuery.data],
    );
    const createPlace = useCallback(
        (name: string) => store?.createPlace(name) ?? Promise.resolve(null),
        [store],
    );
    const renamePlace = useCallback(
        (placeId: string, name: string) => store?.renamePlace(placeId, name) ?? Promise.resolve(null)
        ,
        [store],
    );
    const deletePlace = useCallback(
        (placeId: string) => store?.deletePlace(placeId) ?? Promise.resolve(),
        [store],
    );
    const setScenePlaces = useCallback(
        (sceneHeadingBlockId: string, placeIds: string[]) => store?.setScenePlaces(sceneHeadingBlockId, placeIds) ?? Promise.resolve([])
        ,
        [store],
    );

    return {
        places,
        scenePlaceIds,
        isLoading: Boolean(store) && (
            !locationsStatus.isReady
            || !assignmentsStatus.isReady
            || locationsQuery.isLoading
            || assignmentsQuery.isLoading
        ),
        error: locationsStatus.sourceError
            ?? assignmentsStatus.sourceError
            ?? locationsStatus.mutations.find(mutation => mutation.status === 'failed')?.error
            ?? assignmentsStatus.mutations.find(mutation => mutation.status === 'failed')?.error
            ?? null,
        createPlace,
        renamePlace,
        deletePlace,
        setScenePlaces,
    };
};
