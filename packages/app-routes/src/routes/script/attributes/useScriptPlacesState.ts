import {
    useScriptPlaces,
    type useScriptRepository,
} from '@stagistic/app-core';

type ScriptRepository = ReturnType<typeof useScriptRepository>;

export const useScriptPlacesState = (
    scriptId: string | null,
    scriptRepository: ScriptRepository,
) => useScriptPlaces(scriptId, scriptRepository);
