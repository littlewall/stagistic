import type {ScriptCharacterRecord} from '@stagistic/script';
import {buildSceneBoardModel} from '@stagistic/script';
import type {BoardFilterCharacter} from '@stagistic/ui';
import {useMemo} from 'react';

import {useScriptCharacters} from '../workspace/ScriptCharactersContext';
import {useScriptWorkspace} from '../workspace/ScriptWorkspaceContext';
import {type BoardPreferences, useBoardPreferences} from './boardPreferences';
import {buildFilterCharacters} from './buildFilterCharacters';
import {type SceneCardRecord} from './buildSceneChips';
import {useBoardHistoryShortcuts} from './useBoardHistoryShortcuts';
import {type SceneBoardSource, useSceneBoardSource} from './useSceneBoardSource';
import {useWallMetadata, type WallSceneMetadata} from './useWallMetadata';

interface UseBoardLensDataReturn {
    source: SceneBoardSource,
    model: ReturnType<typeof buildSceneBoardModel>,
    records: readonly SceneCardRecord[],
    metadata: WallSceneMetadata | null,
    selectedIds: readonly string[],
    setSelectedIds: (ids: readonly string[]) => void,
    filterCharacters: readonly BoardFilterCharacter[],
    hasScenes: boolean,
    preferences: BoardPreferences,
    setPreferences: (prefs: BoardPreferences) => void,
    synopsisByScene: ReadonlyMap<string, string | null>,
    castOptions: ReadonlyArray<{
        id: string,
        name: string,
        color: string,
    }>,
    confirmedCharacterRecords: readonly ScriptCharacterRecord[],
}

/** Shared setup for both board lenses: data loading, filtering, preferences, and keyboard shortcuts. */
export const useBoardLensData = (isReadOnly: boolean): UseBoardLensDataReturn => {
    const {currentScriptId, documentSession} = useScriptWorkspace();
    const {
        confirmedCharacterRecords,
        confirmedGroupRecords,
    } = useScriptCharacters();
    const source = useSceneBoardSource();
    const {
        records,
        synopsisByScene,
        castOptions,
        metadata,
    } = useWallMetadata(source.displayColorByKey);
    const [preferences, setPreferences] = useBoardPreferences(currentScriptId ?? 'new-script');

    // Keyboard shortcuts (undo/redo)
    useBoardHistoryShortcuts(documentSession, isReadOnly);

    const model = useMemo(() => buildSceneBoardModel(source.index, {
        characters: confirmedCharacterRecords,
        groups: confirmedGroupRecords,
    }), [
        confirmedCharacterRecords,
        confirmedGroupRecords,
        source.index,
    ]);

    // A character deleted since the filter was saved drops out silently.
    const selectedIds = useMemo(() => {
        const knownIds = new Set(confirmedCharacterRecords.map(character => character.id));

        return preferences.characterIds.filter(id => knownIds.has(id));
    }, [confirmedCharacterRecords, preferences.characterIds]);

    const filterCharacters = useMemo(
        () => buildFilterCharacters(model, confirmedCharacterRecords, source.displayColorByKey, records),
        [
            confirmedCharacterRecords,
            model,
            records,
            source.displayColorByKey,
        ],
    );

    const hasScenes = model.acts.some(act => act.scenes.length > 0);

    return {
        source,
        model,
        records,
        metadata,
        selectedIds,
        setSelectedIds: (ids: readonly string[]) => setPreferences({...preferences, characterIds: [...ids]}),
        filterCharacters,
        hasScenes,
        preferences,
        setPreferences,
        synopsisByScene,
        castOptions,
        confirmedCharacterRecords,
    };
};
