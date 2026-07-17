import {usePersistedDraft} from '@stagistic/app-core';
import {useCallback} from 'react';

interface UseScriptTitleDraftArgs {
    currentScriptId: string | null,
    currentScriptTitle: string,
    renameScriptTitle: (scriptId: string, title: string) => Promise<void>,
}

export const useScriptTitleDraft = ({
    currentScriptId,
    currentScriptTitle,
    renameScriptTitle,
}: UseScriptTitleDraftArgs) => {
    const persist = useCallback((scriptId: string, title: string) => {
        return renameScriptTitle(scriptId, title);
    }, [renameScriptTitle]);
    const draft = usePersistedDraft({
        entityKey: currentScriptId,
        confirmedValue: currentScriptTitle,
        isHydrated: currentScriptId !== null,
        defaultValue: '',
        persist,
    });

    return {
        scriptTitleDraft: draft.draft,
        scriptTitleDraftStatus: draft.status,
        scriptTitleDraftError: draft.error,
        isScriptTitleHydrated: draft.isHydrated,
        updateScriptTitle: draft.setDraft,
        flushScriptTitle: draft.flush,
        retryScriptTitle: draft.retry,
    };
};
