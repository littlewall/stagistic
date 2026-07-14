import {type useScriptRepository} from '@stagistic/app-core';
import {
    useCallback,
    useEffect,
    useState,
} from 'react';

type ScriptRepository = ReturnType<typeof useScriptRepository>;
type ScriptPlace = Awaited<ReturnType<ScriptRepository['listScriptLocations']>>[number];

const sortPlaces = (places: ScriptPlace[]) => {
    return [...places].sort((left, right) => left.name.localeCompare(right.name));
};

export const useScriptPlacesState = (
    scriptId: string | null,
    scriptRepository: ScriptRepository,
) => {
    const [places, setPlaces] = useState<ScriptPlace[]>([]);
    const [scenePlaceIds, setScenePlaceIds] = useState<Record<string, string[]>>({});
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (!scriptId) {
            setPlaces([]);
            setScenePlaceIds({});
            setIsLoading(false);

            return;
        }

        let isCurrent = true;

        setIsLoading(true);

        const loadPlaces = async () => {
            const placesPromise = scriptRepository.listScriptLocations(scriptId);
            const assignmentsPromise = scriptRepository.listScriptSceneLocations(scriptId);
            const [storedPlaces, storedSceneAssignments] = await Promise.all([placesPromise, assignmentsPromise]);

            if (isCurrent) {
                setPlaces(storedPlaces);
                setScenePlaceIds(storedSceneAssignments.reduce<Record<string, string[]>>((result, assignment) => {
                    const currentPlaceIds = result[assignment.sceneHeadingBlockId] ?? [];

                    result[assignment.sceneHeadingBlockId] = [...currentPlaceIds, assignment.locationId];

                    return result;
                }, {}));
                setIsLoading(false);
            }
        };

        void loadPlaces();

        return () => {
            isCurrent = false;
        };
    }, [scriptId, scriptRepository]);

    const createPlace = useCallback(async (name: string) => {
        if (!scriptId) {
            return null;
        }

        const createdPlace = await scriptRepository.createScriptLocation(scriptId, {name});

        if (!createdPlace) {
            return null;
        }

        setPlaces(previous => sortPlaces([...previous, createdPlace]));

        return createdPlace;
    }, [scriptId, scriptRepository]);

    const renamePlace = useCallback(async (placeId: string, name: string) => {
        if (!scriptId) {
            return null;
        }

        const renamedPlace = await scriptRepository.renameScriptLocation(scriptId, placeId, name);

        if (!renamedPlace) {
            return null;
        }

        setPlaces(previous => sortPlaces(previous.map(place => {
            return place.id === placeId ? renamedPlace : place;
        })));

        return renamedPlace;
    }, [scriptId, scriptRepository]);

    const deletePlace = useCallback(async (placeId: string) => {
        if (!scriptId || !placeId) {
            return;
        }

        await scriptRepository.deleteScriptLocation(scriptId, placeId);
        setPlaces(previous => previous.filter(place => place.id !== placeId));
        setScenePlaceIds(previous => Object.fromEntries(
            Object.entries(previous).map(([sceneId, placeIds]) => [sceneId, placeIds.filter(candidate => candidate !== placeId)]),
        ));
    }, [scriptId, scriptRepository]);

    const setScenePlaces = useCallback(async (sceneHeadingBlockId: string, placeIds: string[]) => {
        if (!scriptId) {
            return [];
        }

        setScenePlaceIds(previous => ({
            ...previous,
            [sceneHeadingBlockId]: placeIds,
        }));

        const storedPlaceIds = await scriptRepository.replaceScriptSceneLocations(
            scriptId,
            sceneHeadingBlockId,
            placeIds,
        );

        setScenePlaceIds(previous => ({
            ...previous,
            [sceneHeadingBlockId]: storedPlaceIds,
        }));

        return storedPlaceIds;
    }, [scriptId, scriptRepository]);

    return {
        places,
        scenePlaceIds,
        isLoading,
        createPlace,
        renamePlace,
        deletePlace,
        setScenePlaces,
    };
};
