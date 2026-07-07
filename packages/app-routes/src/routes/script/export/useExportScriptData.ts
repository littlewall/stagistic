import {
    buildScriptBlockIndex,
    DEFAULT_EDITOR_SETTINGS,
    mergeEditorSettings,
    normalizeCharacterKey,
    type EditorSettings,
} from '@stagistic/script';
import type {
    ExportCharacter,
    ScriptData,
} from '@stagistic/export';
import {useMemo} from 'react';

import {useScriptWorkspace} from '../ScriptWorkspaceContext';

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
        initialValue,
        initialIndexSnapshot,
        scriptSettingsOverride,
    } = useScriptWorkspace();

    const settings = useMemo(
        () => mergeEditorSettings(DEFAULT_EDITOR_SETTINGS, scriptSettingsOverride ?? undefined),
        [scriptSettingsOverride],
    );

    const script = useMemo<ScriptData | null>(() => {
        if (!initialValue || !currentScript) {
            return null;
        }

        const snapshot = initialIndexSnapshot ?? buildScriptBlockIndex(initialValue).snapshot;

        return {
            doc: initialValue,
            characters: collectCharacters(snapshot),
            scriptTitle: currentScript.name,
            titlePage: null,
        };
    }, [
        currentScript,
        initialIndexSnapshot,
        initialValue,
    ]);

    return {script, settings};
};
