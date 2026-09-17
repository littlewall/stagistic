import {
    useScriptPlaces,
    useScriptRepository,
} from '@stagistic/app-core';
import type {
    ExportCharacter,
    ExportCharacterGroup,
    ScriptData,
} from '@stagistic/export';
import {
    buildScriptBlockIndex,
    type EditorSettings,
    normalizeCharacterKey,
} from '@stagistic/script';
import {useMemo} from 'react';

import {useScriptCharacters} from '../ScriptCharactersContext';
import {useScriptWorkspace} from '../ScriptWorkspaceContext';
import {useScriptSettingsModal} from '../settings/ScriptSettingsModalProvider';
import {
    collectInitialPageData,
    type ExportCatalogEntity,
} from './collectInitialPageData';

const toDisplayName = (key: string) => key
    .toLowerCase()
    .replace(/(^|\s)\S/gu, match => match.toUpperCase());

const collectCharacters = (catalogEntities: ExportCatalogEntity[]): ExportCharacter[] => catalogEntities
    .filter((entity): entity is Extract<ExportCatalogEntity, {kind: 'character'}> => entity.kind === 'character')
    .map(character => {
        const key = normalizeCharacterKey(character.key);

        return {
            id: character.id,
            key,
            displayName: toDisplayName(key),
        };
    })
    .sort((left, right) => left.displayName.localeCompare(right.displayName));
const collectGroups = (catalogEntities: ExportCatalogEntity[]): ExportCharacterGroup[] => catalogEntities
    .filter((entity): entity is Extract<ExportCatalogEntity, {kind: 'group'}> => entity.kind === 'group')
    .map(group => ({
        id: group.id,
        key: normalizeCharacterKey(group.key),
        memberIds: [...group.memberIds],
    }));

export const useExportScriptData = (): {
    script: ScriptData | null,
    settings: EditorSettings,
} => {
    const {
        currentScript,
        currentScriptId,
        initialValue,
        initialIndexSnapshot,
    } = useScriptWorkspace();
    const {
        confirmedCharacterRecords,
        confirmedGroupRecords,
    } = useScriptCharacters();
    const repository = useScriptRepository();
    const placeState = useScriptPlaces(currentScriptId, repository);
    const {
        resolvedScriptSettings: settings,
        titlePageDraft,
    } = useScriptSettingsModal();

    const script = useMemo<ScriptData | null>(() => {
        if (!initialValue || !currentScript) {
            return null;
        }

        const snapshot = initialIndexSnapshot ?? buildScriptBlockIndex(initialValue).snapshot;
        const catalogEntities: ExportCatalogEntity[] = [
            ...confirmedCharacterRecords.map(character => ({
                ...character,
                kind: 'character' as const,
            })), ...confirmedGroupRecords,
        ];
        const {
            initialCharacters,
            initialPlaces,
            initialVocalRanges,
        } = collectInitialPageData(
            snapshot,
            catalogEntities,
            placeState.places,
            placeState.scenePlaceIds,
        );

        return {
            doc: initialValue,
            characters: collectCharacters(catalogEntities),
            groups: collectGroups(catalogEntities),
            initialCharacters,
            initialPlaces,
            initialVocalRanges,
            scriptTitle: currentScript.name,
            titlePage: titlePageDraft,
        };
    }, [
        confirmedCharacterRecords,
        confirmedGroupRecords,
        currentScript,
        initialIndexSnapshot,
        initialValue,
        placeState.places,
        placeState.scenePlaceIds,
        titlePageDraft,
    ]);

    return {script, settings};
};
