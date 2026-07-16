import type {ScriptRepository} from '@stagistic/db';
import {useLiveQuery} from '@tanstack/react-db';
import {
    useCallback,
    useMemo,
} from 'react';

import {useReactiveCollectionStatus} from '../collections';
import {getScriptPlacesStore} from './scriptPlacesStore';

export const useScriptPlaces = (
    scriptId: string | null,
    repository: ScriptRepository,
) => {
    const store = useMemo(() => scriptId
        ? getScriptPlacesStore(repository, scriptId)
        : null, [repository, scriptId]);
    const locationsStatus = useReactiveCollectionStatus(store?.locationsStatus);
    const assignmentsStatus = useReactiveCollectionStatus(store?.assignmentsStatus);
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
