import {
    useScriptPlaces,
    useScriptRepository,
} from '@stagistic/app-core';
import type {
    ExportCharacter,
    ScriptData,
} from '@stagistic/export';
import {
    buildScriptBlockIndex,
    type EditorSettings,
    normalizeCharacterKey,
} from '@stagistic/script';
import {useMemo} from 'react';

import {useScriptWorkspace} from '../ScriptWorkspaceContext';
import {useScriptSettingsModal} from '../settings/ScriptSettingsModalProvider';
import {collectInitialPageData} from './collectInitialPageData';

const toDisplayName = (key: string) => key
    .toLowerCase()
    .replace(/(^|\s)\S/gu, match => match.toUpperCase());

const collectCharacters = (
    snapshot: ReturnType<typeof buildScriptBlockIndex>['snapshot'],
): ExportCharacter[] => {
    const byId = new Map<string, ExportCharacter>();
    const byKey = new Map<string, ExportCharacter>();

    snapshot.blocks.forEach(block => {
        block.characterRefs?.forEach(ref => {
            const normalizedKey = normalizeCharacterKey(ref.key);
            const id = ref.characterId ?? `key:${normalizedKey}`;
            const character = {
                id,
                key: normalizedKey,
                displayName: toDisplayName(normalizedKey),
            };

            if (ref.characterId) {
                byId.set(ref.characterId, character);
            } else if (!byKey.has(normalizedKey)) {
                byKey.set(normalizedKey, character);
            }
        });
    });

    return [...byId.values(), ...byKey.values()]
        .sort((a, b) => a.displayName.localeCompare(b.displayName));
};

export const useExportScriptData = (): {
    script: ScriptData | null,
    settings: EditorSettings,
} => {
    const {
        currentScript,
        currentScriptId,
        characterCatalog,
        initialValue,
        initialIndexSnapshot,
    } = useScriptWorkspace();
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
        const {
            initialCharacters,
            initialPlaces,
        } = collectInitialPageData(
            snapshot,
            characterCatalog.characters,
            placeState.places,
            placeState.scenePlaceIds,
        );

        return {
            doc: initialValue,
            characters: collectCharacters(snapshot),
            initialCharacters,
            initialPlaces,
            scriptTitle: currentScript.name,
            titlePage: titlePageDraft,
        };
    }, [
        characterCatalog.characters,
        currentScript,
        initialIndexSnapshot,
        initialValue,
        placeState.places,
        placeState.scenePlaceIds,
        titlePageDraft,
    ]);

    return {script, settings};
};
