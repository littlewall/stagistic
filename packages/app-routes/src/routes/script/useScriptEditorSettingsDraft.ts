import {type FountainElementType} from '@stagistic/script-core';
import {
    clampCharacterColorSaturation,
    DEFAULT_EDITOR_SETTINGS,
    type EditorSettings,
    type EditorSettingsOverride,
    mergeEditorSettings,
} from '@stagistic/script-core';
import {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from 'react';

import {
    type BlockSettingsPatch,
    normalizeSettingsOverride,
} from './editor/settings';

const SETTINGS_SAVE_DEBOUNCE_MS = 450;

type UseScriptEditorSettingsDraftArgs = {
    currentScriptId: string | null,
    scriptSettingsOverride: EditorSettingsOverride | null | undefined,
    handleSaveScriptSettingsOverride: (settings?: EditorSettingsOverride) => Promise<boolean>,
};

type StructureSettingsPatch = Partial<NonNullable<EditorSettingsOverride['structure']>>;

export const useScriptEditorSettingsDraft = ({
    currentScriptId,
    scriptSettingsOverride,
    handleSaveScriptSettingsOverride,
}: UseScriptEditorSettingsDraftArgs) => {
    const [scriptSettingsDraft, setScriptSettingsDraft] = useState<EditorSettingsOverride>({});
    const settingsSaveTimerRef = useRef<number | null>(null);
    const hydratedSettingsScriptIdRef = useRef<string | null>(null);

    const resolvedScriptSettings = useMemo<EditorSettings>(
        () => mergeEditorSettings(DEFAULT_EDITOR_SETTINGS, scriptSettingsDraft),
        [scriptSettingsDraft],
    );

    const draftSerialized = useMemo(
        () => JSON.stringify(scriptSettingsDraft ?? {}),
        [scriptSettingsDraft],
    );
    const loadedSerialized = useMemo(
        () => JSON.stringify(scriptSettingsOverride ?? {}),
        [scriptSettingsOverride],
    );

    const clearSettingsSaveTimer = useCallback(() => {
        if (!settingsSaveTimerRef.current) {
            return;
        }

        window.clearTimeout(settingsSaveTimerRef.current);
        settingsSaveTimerRef.current = null;
    }, []);

    useEffect(() => {
        hydratedSettingsScriptIdRef.current = null;
        setScriptSettingsDraft({});
    }, [currentScriptId]);

    useEffect(() => {
        if (!currentScriptId || scriptSettingsOverride === undefined) {
            return;
        }

        if (hydratedSettingsScriptIdRef.current === currentScriptId) {
            return;
        }

        setScriptSettingsDraft(normalizeSettingsOverride(scriptSettingsOverride ?? {}));
        hydratedSettingsScriptIdRef.current = currentScriptId;
    }, [currentScriptId, scriptSettingsOverride]);

    useEffect(() => {
        if (!currentScriptId || scriptSettingsOverride === undefined) {
            return;
        }

        if (draftSerialized === loadedSerialized) {
            return;
        }

        clearSettingsSaveTimer();

        const snapshot = scriptSettingsDraft;

        settingsSaveTimerRef.current = window.setTimeout(() => {
            void handleSaveScriptSettingsOverride(snapshot);
        }, SETTINGS_SAVE_DEBOUNCE_MS);

        return () => {
            clearSettingsSaveTimer();
        };
    }, [
        clearSettingsSaveTimer,
        currentScriptId,
        draftSerialized,
        handleSaveScriptSettingsOverride,
        loadedSerialized,
        scriptSettingsDraft,
        scriptSettingsOverride,
    ]);

    useEffect(() => {
        return () => {
            clearSettingsSaveTimer();
        };
    }, [clearSettingsSaveTimer]);

    const updateBlockSettings = useCallback((
        blockType: FountainElementType,
        patch: BlockSettingsPatch,
    ) => {
        setScriptSettingsDraft(previous => ({
            ...previous,
            blocks: {
                ...previous.blocks ?? {},
                [blockType]: {
                    ...previous.blocks?.[blockType] ?? {},
                    ...patch,
                },
            },
        }));
    }, []);

    const updateCharacterColorSaturation = useCallback((value: number) => {
        const nextSaturation = clampCharacterColorSaturation(value);

        setScriptSettingsDraft(previous => ({
            ...previous,
            visual: {
                ...previous.visual ?? {},
                characterColorSaturation: nextSaturation,
            },
        }));
    }, []);

    const updateStructureSettings = useCallback((patch: StructureSettingsPatch) => {
        setScriptSettingsDraft(previous => ({
            ...previous,
            structure: {
                ...previous.structure ?? {},
                ...patch,
                actDisplay: {
                    ...previous.structure?.actDisplay ?? {},
                    ...patch.actDisplay ?? {},
                },
                musicPrefixes: {
                    ...previous.structure?.musicPrefixes ?? {},
                    ...patch.musicPrefixes ?? {},
                    song: {
                        ...previous.structure?.musicPrefixes?.song ?? {},
                        ...patch.musicPrefixes?.song ?? {},
                    },
                    reprise: {
                        ...previous.structure?.musicPrefixes?.reprise ?? {},
                        ...patch.musicPrefixes?.reprise ?? {},
                    },
                    underscore: {
                        ...previous.structure?.musicPrefixes?.underscore ?? {},
                        ...patch.musicPrefixes?.underscore ?? {},
                    },
                },
            },
        }));
    }, []);

    return {
        scriptSettingsDraft,
        resolvedScriptSettings,
        updateBlockSettings,
        updateCharacterColorSaturation,
        updateStructureSettings,
    };
};
