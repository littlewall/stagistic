import {
    type ScriptRepository,
    usePersistedDraft,
    useScriptEditorSettingsRecord,
} from '@stagistic/app-core';
import {
    type CharacterDecoration,
    DEFAULT_EDITOR_SETTINGS,
    type EditorSettings,
    type EditorSettingsOverride,
    type HeaderFooterAlignment,
    type HeaderFooterSettingsPatch,
    type InitialPagesSettingsPatch,
    mergeEditorSettings,
    type PageSettings,
    type ScriptBlockNodeType,
    type StructureSettingsPatch,
} from '@stagistic/script';
import {
    useCallback,
    useMemo,
} from 'react';

import {
    type BlockSettingsPatch,
    normalizeSettingsOverride,
} from '../settings/panels';

type HeaderFooterRowPatch = NonNullable<HeaderFooterSettingsPatch['header']>;

const EMPTY_SETTINGS: EditorSettingsOverride = {};

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
    currentScriptId: string | null,
    repository: ScriptRepository,
}

export const useScriptEditorSettingsDraft = ({
    currentScriptId,
    repository,
}: UseScriptEditorSettingsDraftArgs) => {
    const record = useScriptEditorSettingsRecord(currentScriptId, repository);
    const {save} = record;
    const confirmedSettings = useMemo(
        () => normalizeSettingsOverride(record.record?.settings ?? EMPTY_SETTINGS),
        [record.record?.settings],
    );
    const persist = useCallback((_scriptId: string, value: EditorSettingsOverride) => {
        return save(normalizeSettingsOverride(value));
    }, [save]);
    const draft = usePersistedDraft({
        entityKey: currentScriptId,
        confirmedValue: confirmedSettings,
        isHydrated: !record.isLoading,
        defaultValue: EMPTY_SETTINGS,
        persist,
    });
    const {setDraft} = draft;
    const scriptSettingsDraft = draft.draft;
    const resolvedScriptSettings = useMemo<EditorSettings>(
        () => mergeEditorSettings(DEFAULT_EDITOR_SETTINGS, scriptSettingsDraft),
        [scriptSettingsDraft],
    );

    const updateBlockSettings = useCallback((
        blockType: ScriptBlockNodeType,
        patch: BlockSettingsPatch,
    ) => {
        setDraft(previous => ({
            ...previous,
            blocks: {
                ...previous.blocks,
                [blockType]: {
                    ...previous.blocks?.[blockType],
                    ...patch,
                },
            },
        }));
    }, [setDraft]);

    const resetBlockSettings = useCallback((blockType: ScriptBlockNodeType) => {
        setDraft(previous => {
            const nextBlocks = {...previous.blocks};

            delete nextBlocks[blockType];

            return {
                ...previous,
                blocks: Object.keys(nextBlocks).length > 0 ? nextBlocks : undefined,
            };
        });
    }, [setDraft]);

    const updateCharacterDecoration = useCallback((value: CharacterDecoration) => {
        setDraft(previous => ({
            ...previous,
            visual: {
                ...previous.visual,
                characterDecoration: value,
            },
        }));
    }, [setDraft]);

    const updateStructureSettings = useCallback((patch: StructureSettingsPatch) => {
        setDraft(previous => ({
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
    }, [setDraft]);

    const updatePageSettings = useCallback((patch: Partial<PageSettings>) => {
        setDraft(previous => ({
            ...previous,
            page: {
                ...previous.page,
                ...patch,
            },
        }));
    }, [setDraft]);

    const updateHeaderFooterSettings = useCallback((patch: HeaderFooterSettingsPatch) => {
        setDraft(previous => ({
            ...previous,
            headerFooter: {
                ...previous.headerFooter,
                ...patch,
                header: mergeHeaderFooterRow(previous.headerFooter?.header, patch.header),
                footer: mergeHeaderFooterRow(previous.headerFooter?.footer, patch.footer),
            },
        }));
    }, [setDraft]);

    const updateInitialPagesSettings = useCallback((patch: InitialPagesSettingsPatch) => {
        setDraft(previous => ({
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
    }, [setDraft]);

    return {
        scriptSettingsDraft,
        effectiveScriptSettingsDraft: scriptSettingsDraft,
        /*
         * draft.isHydrated alone lags one render behind a script switch (the
         * controller only learns the new key in a layout effect), which lets
         * the editor mount with empty settings and immediately unmount.
         * record.isLoading is computed synchronously from the store, so it is
         * correct on the very first render; the draft flag then keeps the
         * gate closed until the hydrated value is actually in the snapshot.
         */
        isScriptSettingsHydrated: !record.isLoading && draft.isHydrated,
        resolvedScriptSettings,
        scriptSettingsDraftStatus: draft.status,
        scriptSettingsDraftError: draft.error ?? record.error,
        retryScriptSettings: draft.retry,
        flushScriptSettings: draft.flush,
        updateBlockSettings,
        resetBlockSettings,
        updateCharacterDecoration,
        updateStructureSettings,
        updatePageSettings,
        updateHeaderFooterSettings,
        updateInitialPagesSettings,
    };
};
