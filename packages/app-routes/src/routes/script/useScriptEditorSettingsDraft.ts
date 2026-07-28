import {
    type ScriptRepository,
    usePersistedDraft,
    useScriptEditorSettingsRecord,
} from '@stagistic/app-core';
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
    useMemo,
} from 'react';

import {
    type BlockSettingsPatch,
    normalizeSettingsOverride,
} from './editor/settings';

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
    const confirmedSettings = useMemo(
        () => normalizeSettingsOverride(record.record?.settings ?? EMPTY_SETTINGS),
        [record.record?.settings],
    );
    const persist = useCallback((_scriptId: string, value: EditorSettingsOverride) => {
        return record.save(normalizeSettingsOverride(value));
    }, [record.save]);
    const draft = usePersistedDraft({
        entityKey: currentScriptId,
        confirmedValue: confirmedSettings,
        isHydrated: !record.isLoading,
        defaultValue: EMPTY_SETTINGS,
        persist,
    });
    const scriptSettingsDraft = draft.draft;
    const resolvedScriptSettings = useMemo<EditorSettings>(
        () => mergeEditorSettings(DEFAULT_EDITOR_SETTINGS, scriptSettingsDraft),
        [scriptSettingsDraft],
    );

    const updateBlockSettings = useCallback((
        blockType: ScriptBlockNodeType,
        patch: BlockSettingsPatch,
    ) => {
        draft.setDraft(previous => ({
            ...previous,
            blocks: {
                ...previous.blocks,
                [blockType]: {
                    ...previous.blocks?.[blockType],
                    ...patch,
                },
            },
        }));
    }, [draft.setDraft]);

    const resetBlockSettings = useCallback((blockType: ScriptBlockNodeType) => {
        draft.setDraft(previous => {
            const nextBlocks = {...previous.blocks};

            delete nextBlocks[blockType];

            return {
                ...previous,
                blocks: Object.keys(nextBlocks).length > 0 ? nextBlocks : undefined,
            };
        });
    }, [draft.setDraft]);

    const updateCharacterColorSaturation = useCallback((value: number) => {
        const nextSaturation = clampCharacterColorSaturation(value);

        draft.setDraft(previous => ({
            ...previous,
            visual: {
                ...previous.visual,
                characterColorSaturation: nextSaturation,
            },
        }));
    }, [draft.setDraft]);

    const updateStructureSettings = useCallback((patch: StructureSettingsPatch) => {
        draft.setDraft(previous => ({
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
    }, [draft.setDraft]);

    const updatePageSettings = useCallback((patch: Partial<PageSettings>) => {
        draft.setDraft(previous => ({
            ...previous,
            page: {
                ...previous.page,
                ...patch,
            },
        }));
    }, [draft.setDraft]);

    const updateHeaderFooterSettings = useCallback((patch: HeaderFooterSettingsPatch) => {
        draft.setDraft(previous => ({
            ...previous,
            headerFooter: {
                ...previous.headerFooter,
                ...patch,
                header: mergeHeaderFooterRow(previous.headerFooter?.header, patch.header),
                footer: mergeHeaderFooterRow(previous.headerFooter?.footer, patch.footer),
            },
        }));
    }, [draft.setDraft]);

    const updateInitialPagesSettings = useCallback((patch: InitialPagesSettingsPatch) => {
        draft.setDraft(previous => ({
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
    }, [draft.setDraft]);

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
        updateCharacterColorSaturation,
        updateStructureSettings,
        updatePageSettings,
        updateHeaderFooterSettings,
        updateInitialPagesSettings,
    };
};
