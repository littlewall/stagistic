import {
    useCallback,
    useEffect,
    useRef,
    useState,
} from 'react';

const SCRIPT_TITLE_SAVE_DEBOUNCE_MS = 450;

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
    const [scriptTitleDraft, setScriptTitleDraft] = useState(currentScriptTitle);
    const loadedScriptIdRef = useRef<string | null>(null);
    const persistedTitleRef = useRef(currentScriptTitle);
    const saveTimerRef = useRef<number | null>(null);

    const clearSaveTimer = useCallback(() => {
        if (saveTimerRef.current === null) {
            return;
        }

        window.clearTimeout(saveTimerRef.current);
        saveTimerRef.current = null;
    }, []);

    useEffect(() => {
        if (loadedScriptIdRef.current !== currentScriptId) {
            loadedScriptIdRef.current = currentScriptId;
            persistedTitleRef.current = currentScriptTitle;
            setScriptTitleDraft(currentScriptTitle);

            return;
        }

        if (scriptTitleDraft !== persistedTitleRef.current) {
            return;
        }

        persistedTitleRef.current = currentScriptTitle;
        setScriptTitleDraft(currentScriptTitle);
    }, [
        currentScriptId,
        currentScriptTitle,
        scriptTitleDraft,
    ]);

    useEffect(() => {
        if (!currentScriptId || scriptTitleDraft === persistedTitleRef.current) {
            return;
        }

        clearSaveTimer();

        const snapshot = scriptTitleDraft;

        saveTimerRef.current = window.setTimeout(() => {
            persistedTitleRef.current = snapshot;
            void renameScriptTitle(currentScriptId, snapshot);
        }, SCRIPT_TITLE_SAVE_DEBOUNCE_MS);

        return clearSaveTimer;
    }, [
        clearSaveTimer,
        currentScriptId,
        renameScriptTitle,
        scriptTitleDraft,
    ]);

    useEffect(() => clearSaveTimer, [clearSaveTimer]);

    return {
        scriptTitleDraft,
        updateScriptTitle: setScriptTitleDraft,
    };
};
