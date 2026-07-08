import type {TitlePageSettings} from '@stagistic/script';
import {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from 'react';

const TITLE_PAGE_SAVE_DEBOUNCE_MS = 450;

interface UseTitlePageDraftRepository {
    loadTitlePage: (scriptId: string) => Promise<TitlePageSettings | null>,
    saveTitlePage: (scriptId: string, settings: TitlePageSettings) => Promise<void>,
}

interface UseTitlePageDraftArgs {
    currentScriptId: string | null,
    repository: UseTitlePageDraftRepository,
}

const EMPTY_TITLE_PAGE: TitlePageSettings = {
    draftDateMode: 'auto',
    dateFormat: 'mdy',
    credits: [{credit: 'Written by', authors: ['']}],
};

export const useTitlePageDraft = ({
    currentScriptId,
    repository,
}: UseTitlePageDraftArgs) => {
    const [titlePageDraft, setTitlePageDraft] = useState<TitlePageSettings>(EMPTY_TITLE_PAGE);
    const [loadedTitlePage, setLoadedTitlePage] = useState<TitlePageSettings | undefined>(undefined);
    const saveTimerRef = useRef<number | null>(null);
    const loadedScriptIdRef = useRef<string | null>(null);

    const clearSaveTimer = useCallback(() => {
        if (saveTimerRef.current !== null) {
            window.clearTimeout(saveTimerRef.current);
            saveTimerRef.current = null;
        }
    }, []);

    useEffect(() => {
        if (!currentScriptId) {
            setTitlePageDraft(EMPTY_TITLE_PAGE);
            setLoadedTitlePage(undefined);
            loadedScriptIdRef.current = null;

            return;
        }

        if (loadedScriptIdRef.current === currentScriptId) {
            return;
        }

        let isActive = true;

        setLoadedTitlePage(undefined);

        const load = async () => {
            try {
                const stored = await repository.loadTitlePage(currentScriptId);

                if (!isActive) {
                    return;
                }

                const resolved = stored ?? EMPTY_TITLE_PAGE;

                setTitlePageDraft(resolved);
                setLoadedTitlePage(resolved);

                /*
                 * Mark as loaded only after the async load actually applies its
                 * result. Setting it before the await lets React StrictMode's
                 * mount→cleanup→mount cycle skip the second load (ref already
                 * matches) while the first load's result is discarded
                 * (isActive=false) — leaving loadedTitlePage stuck at undefined,
                 * which permanently blocks the save effect.
                 */
                loadedScriptIdRef.current = currentScriptId;
            } catch {
                if (isActive) {
                    setTitlePageDraft(EMPTY_TITLE_PAGE);
                    setLoadedTitlePage(EMPTY_TITLE_PAGE);
                    loadedScriptIdRef.current = currentScriptId;
                }
            }
        };

        void load();

        return () => {
            isActive = false;
        };
    }, [currentScriptId, repository]);

    useEffect(() => {
        return () => {
            clearSaveTimer();
        };
    }, [clearSaveTimer]);

    const draftSerialized = useMemo(() => JSON.stringify(titlePageDraft), [titlePageDraft]);
    const loadedSerialized = useMemo(() => JSON.stringify(loadedTitlePage), [loadedTitlePage]);

    useEffect(() => {
        if (!currentScriptId || loadedTitlePage === undefined) {
            return;
        }

        if (draftSerialized === loadedSerialized) {
            return;
        }

        clearSaveTimer();

        const snapshot = titlePageDraft;

        saveTimerRef.current = window.setTimeout(() => {
            repository.saveTitlePage(currentScriptId, snapshot).catch((error: unknown) => {
                console.error('[title-page] save failed', error);
            });
        }, TITLE_PAGE_SAVE_DEBOUNCE_MS);

        return () => {
            clearSaveTimer();
        };
    }, [
        clearSaveTimer,
        currentScriptId,
        draftSerialized,
        loadedSerialized,
        loadedTitlePage,
        repository,
        titlePageDraft,
    ]);

    const updateTitlePage = useCallback((patch: Partial<TitlePageSettings>) => {
        setTitlePageDraft(previous => ({...previous, ...patch}));
    }, []);

    const isLoading = currentScriptId !== null && loadedTitlePage === undefined;

    return {
        titlePageDraft,
        isLoading,
        updateTitlePage,
    };
};
