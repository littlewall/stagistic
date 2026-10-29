import {
    type ScriptRepository,
    usePersistedDraft,
    useScriptEditorSettingsRecord,
} from '@stagistic/app-core';
import {
    applyFormatTemplate,
    type CharacterDecoration,
    type EditorSettings,
    type EditorSettingsOverride,
    type FormatTemplateId,
    type HeaderFooterAlignment,
    type HeaderFooterSettingsPatch,
    type InitialPagesSettingsPatch,
    materializeLegacyTemplateSettings,
    type PageSettings,
    type PdfFlowPreset,
    resolveScriptEditorSettings,
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
        () => normalizeSettingsOverride(materializeLegacyTemplateSettings(record.record?.formatTemplateId ?? null, record.record?.settings ?? EMPTY_SETTINGS)),
        [record.record?.settings, record.record?.formatTemplateId],
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
    const formatTemplateId = record.record?.formatTemplateId ?? null;
    const resolvedScriptSettings = useMemo<EditorSettings>(
        () => resolveScriptEditorSettings({formatTemplateId, override: scriptSettingsDraft}),
        [scriptSettingsDraft, formatTemplateId],
    );

    const applyTemplate = useCallback(async (id: FormatTemplateId, {lock}: {lock: boolean}) => {
        if (!currentScriptId) return;

        await draft.flush();

        const next = applyFormatTemplate({templateId: id, lock}, resolvedScriptSettings);

        await save(normalizeSettingsOverride(next.settings), next.formatTemplateId);
    }, [
        currentScriptId,
        draft,
        save,
        resolvedScriptSettings,
    ]);

    const unlockTemplate = useCallback(async () => {
        if (!formatTemplateId) return;

        await draft.flush();
        await save(normalizeSettingsOverride(resolvedScriptSettings), null);
    }, [
        draft,
        formatTemplateId,
        resolvedScriptSettings,
        save,
    ]);

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

    const updatePdfFlowSettings = useCallback((patch: Partial<PdfFlowPreset>) => {
        setDraft(previous => ({...previous, pdfFlow: {...previous.pdfFlow, ...patch}}));
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
        formatTemplateId,
        applyTemplate,
        unlockTemplate,
        updatePdfFlowSettings,
        scriptSettingsDraft,
        effectiveScriptSettingsDraft: resolvedScriptSettings,
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
