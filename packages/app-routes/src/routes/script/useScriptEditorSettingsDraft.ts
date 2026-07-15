import {type ScriptBlockNodeType} from '@stagistic/script';
import {
    clampCharacterColorSaturation,
    DEFAULT_EDITOR_SETTINGS,
    type EditorSettings,
    type EditorSettingsOverride,
    type HeaderFooterAlignment,
    type HeaderFooterSettingsPatch,
    type InitialPagesSettingsPatch,
    mergeEditorSettings,
    type PageSettings,
    type StructureSettingsPatch,
} from '@stagistic/script';
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

type HeaderFooterRowPatch = NonNullable<HeaderFooterSettingsPatch['header']>;

const mergeHeaderFooterRow = (
    previous: HeaderFooterRowPatch | undefined,
    patch: HeaderFooterRowPatch | undefined,
): HeaderFooterRowPatch | undefined => {
    if (!patch) {
        return previous;
    }

    const next = {...previous};

    Object.entries(patch).forEach(([alignment, cell]) => {
        const key = alignment as HeaderFooterAlignment;

        next[key] = {...previous?.[key], ...cell};
    });

    return next;
};

interface UseScriptEditorSettingsDraftArgs {
    state: {
        currentScriptId: string | null,
        scriptSettingsOverride: EditorSettingsOverride | null | undefined,
    },
    requests: {
        handleSaveScriptSettingsOverride: (settings?: EditorSettingsOverride) => Promise<boolean>,
    },
}

export const useScriptEditorSettingsDraft = ({
    state,
    requests,
}: UseScriptEditorSettingsDraftArgs) => {
    const {
        currentScriptId,
        scriptSettingsOverride,
    } = state;
    const {handleSaveScriptSettingsOverride} = requests;
    const [scriptSettingsDraft, setScriptSettingsDraft] = useState<EditorSettingsOverride>({});
    const settingsSaveTimerRef = useRef<number | null>(null);
    const hydratedSettingsScriptIdRef = useRef<string | null>(null);

    const effectiveScriptSettingsDraft = useMemo<EditorSettingsOverride>(() => {
        const hasHydratedForCurrentScript = currentScriptId !== null
            && hydratedSettingsScriptIdRef.current === currentScriptId;

        return !hasHydratedForCurrentScript && scriptSettingsOverride != null
            ? normalizeSettingsOverride(scriptSettingsOverride)
            : scriptSettingsDraft;
    }, [
        currentScriptId,
        scriptSettingsDraft,
        scriptSettingsOverride,
    ]);

    const resolvedScriptSettings = useMemo<EditorSettings>(
        () => mergeEditorSettings(DEFAULT_EDITOR_SETTINGS, effectiveScriptSettingsDraft),
        [effectiveScriptSettingsDraft],
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
        blockType: ScriptBlockNodeType,
        patch: BlockSettingsPatch,
    ) => {
        setScriptSettingsDraft(previous => ({
            ...previous,
            blocks: {
                ...previous.blocks,
                [blockType]: {
                    ...previous.blocks?.[blockType],
                    ...patch,
                },
            },
        }));
    }, []);

    const resetBlockSettings = useCallback((blockType: ScriptBlockNodeType) => {
        setScriptSettingsDraft(previous => {
            const nextBlocks = {...previous.blocks};

            delete nextBlocks[blockType];

            return {
                ...previous,
                blocks: Object.keys(nextBlocks).length > 0 ? nextBlocks : undefined,
            };
        });
    }, []);

    const updateCharacterColorSaturation = useCallback((value: number) => {
        const nextSaturation = clampCharacterColorSaturation(value);

        setScriptSettingsDraft(previous => ({
            ...previous,
            visual: {
                ...previous.visual,
                characterColorSaturation: nextSaturation,
            },
        }));
    }, []);

    const updateStructureSettings = useCallback((patch: StructureSettingsPatch) => {
        setScriptSettingsDraft(previous => ({
            ...previous,
            structure: {
                ...previous.structure,
                ...patch,
                actDisplay: {
                    ...previous.structure?.actDisplay,
                    ...patch.actDisplay,
                },
            },
        }));
    }, []);

    const updatePageSettings = useCallback((patch: Partial<PageSettings>) => {
        setScriptSettingsDraft(previous => ({
            ...previous,
            page: {
                ...previous.page,
                ...patch,
            },
        }));
    }, []);

    const updateHeaderFooterSettings = useCallback((patch: HeaderFooterSettingsPatch) => {
        setScriptSettingsDraft(previous => ({
            ...previous,
            headerFooter: {
                ...previous.headerFooter,
                ...patch,
                header: mergeHeaderFooterRow(previous.headerFooter?.header, patch.header),
                footer: mergeHeaderFooterRow(previous.headerFooter?.footer, patch.footer),
            },
        }));
    }, []);

    const updateInitialPagesSettings = useCallback((patch: InitialPagesSettingsPatch) => {
        setScriptSettingsDraft(previous => ({
            ...previous,
            initialPages: {
                ...previous.initialPages,
                castAndPlace: {
                    ...previous.initialPages?.castAndPlace,
                    ...patch.castAndPlace,
                },
                songs: {
                    ...previous.initialPages?.songs,
                    ...patch.songs,
                },
            },
        }));
    }, []);

    return {
        scriptSettingsDraft,
        effectiveScriptSettingsDraft,
        resolvedScriptSettings,
        updateBlockSettings,
        resetBlockSettings,
        updateCharacterColorSaturation,
        updateStructureSettings,
        updatePageSettings,
        updateHeaderFooterSettings,
        updateInitialPagesSettings,
    };
};
