import {
    type ScriptRepository,
    usePersistedDraft,
    useScriptTitlePageRecord,
} from '@stagistic/app-core';
import type {TitlePageSettings} from '@stagistic/script';
import {useCallback} from 'react';

interface UseTitlePageDraftArgs {
    currentScriptId: string | null,
    repository: ScriptRepository,
}

export const EMPTY_TITLE_PAGE: TitlePageSettings = {
    draftDateMode: 'auto',
    dateFormat: 'mdy',
    credits: [{credit: 'Written by', authors: ['']}],
};

export const useTitlePageDraft = ({
    currentScriptId,
    repository,
}: UseTitlePageDraftArgs) => {
    const record = useScriptTitlePageRecord(currentScriptId, repository);
    const persist = useCallback((_scriptId: string, value: TitlePageSettings) => {
        return record.save(value);
    }, [record.save]);
    const draft = usePersistedDraft({
        entityKey: currentScriptId,
        confirmedValue: record.record?.settings ?? EMPTY_TITLE_PAGE,
        isHydrated: !record.isLoading,
        defaultValue: EMPTY_TITLE_PAGE,
        persist,
    });
    const updateTitlePage = useCallback((patch: Partial<TitlePageSettings>) => {
        draft.setDraft(previous => ({...previous, ...patch}));
    }, [draft.setDraft]);

    return {
        titlePageDraft: draft.draft,
        titlePageDraftStatus: draft.status,
        titlePageDraftError: draft.error ?? record.error,
        isLoading: !draft.isHydrated,
        updateTitlePage,
        flushTitlePage: draft.flush,
        retryTitlePage: draft.retry,
    };
};
