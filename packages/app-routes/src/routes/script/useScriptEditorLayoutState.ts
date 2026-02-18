import {
    useCallback,
    useEffect,
    useState,
} from 'react';

const OVERLAY_BREAKPOINT_QUERY = '(max-width: 1100px)';
const EDITOR_SIDEBAR_STATE_STORAGE_KEY = 'stagistic.editor.sidebar-state';

type StoredEditorSidebarState = {
    leftSidebarOpen?: boolean,
    rightSidebarOpen?: boolean,
};

type EditorSidebarState = {
    leftSidebarOpen: boolean,
    rightSidebarOpen: boolean,
};

const DEFAULT_EDITOR_SIDEBAR_STATE: EditorSidebarState = {
    leftSidebarOpen: false,
    rightSidebarOpen: false,
};

const isStoredEditorSidebarState = (value: unknown): value is StoredEditorSidebarState => {
    if (!value || typeof value !== 'object') {
        return false;
    }

    const candidate = value as Record<string, unknown>;

    return (
        (candidate.leftSidebarOpen === undefined || typeof candidate.leftSidebarOpen === 'boolean')
        && (candidate.rightSidebarOpen === undefined || typeof candidate.rightSidebarOpen === 'boolean')
    );
};

const readStoredEditorSidebarState = (): EditorSidebarState => {
    if (typeof window === 'undefined') {
        return DEFAULT_EDITOR_SIDEBAR_STATE;
    }

    try {
        const storedState = window.localStorage.getItem(EDITOR_SIDEBAR_STATE_STORAGE_KEY);

        if (!storedState) {
            return DEFAULT_EDITOR_SIDEBAR_STATE;
        }

        const parsedState = JSON.parse(storedState) as unknown;

        if (!isStoredEditorSidebarState(parsedState)) {
            return DEFAULT_EDITOR_SIDEBAR_STATE;
        }

        return {
            leftSidebarOpen: parsedState.leftSidebarOpen ?? false,
            rightSidebarOpen: parsedState.rightSidebarOpen ?? false,
        };
    } catch {
        return DEFAULT_EDITOR_SIDEBAR_STATE;
    }
};

const getIsOverlayViewport = () => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
        return false;
    }

    return window.matchMedia(OVERLAY_BREAKPOINT_QUERY).matches;
};

export const useScriptEditorLayoutState = () => {
    const [sidebarState, setSidebarState] = useState(readStoredEditorSidebarState);
    const [isOverlayViewport, setIsOverlayViewport] = useState(getIsOverlayViewport);
    const isLeftSidebarOpen = sidebarState.leftSidebarOpen;
    const isRightSidebarOpen = sidebarState.rightSidebarOpen;

    useEffect(() => {
        if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
            return;
        }

        const mediaQueryList = window.matchMedia(OVERLAY_BREAKPOINT_QUERY);
        const syncOverlayMode = () => {
            setIsOverlayViewport(mediaQueryList.matches);
        };

        syncOverlayMode();

        if (typeof mediaQueryList.addEventListener === 'function') {
            mediaQueryList.addEventListener('change', syncOverlayMode);

            return () => {
                mediaQueryList.removeEventListener('change', syncOverlayMode);
            };
        }

        mediaQueryList.addListener(syncOverlayMode);

        return () => {
            mediaQueryList.removeListener(syncOverlayMode);
        };
    }, []);

    useEffect(() => {
        if (typeof window === 'undefined') {
            return;
        }

        try {
            window.localStorage.setItem(EDITOR_SIDEBAR_STATE_STORAGE_KEY, JSON.stringify({
                leftSidebarOpen: isLeftSidebarOpen,
                rightSidebarOpen: isRightSidebarOpen,
            }));
        } catch {
            // Ignore storage write failures in constrained environments.
        }
    }, [isLeftSidebarOpen, isRightSidebarOpen]);

    useEffect(() => {
        if (!isOverlayViewport) {
            return;
        }

        if (isLeftSidebarOpen && isRightSidebarOpen) {
            setSidebarState(previous => ({
                ...previous,
                leftSidebarOpen: false,
            }));
        }
    }, [
        isLeftSidebarOpen,
        isOverlayViewport,
        isRightSidebarOpen,
    ]);

    const handleToggleLeftSidebar = useCallback(() => {
        setSidebarState(previous => {
            const nextLeftSidebarOpen = !previous.leftSidebarOpen;

            return {
                leftSidebarOpen: nextLeftSidebarOpen,
                rightSidebarOpen: isOverlayViewport && nextLeftSidebarOpen
                    ? false
                    : previous.rightSidebarOpen,
            };
        });
    }, [isOverlayViewport]);
    const handleToggleRightSidebar = useCallback(() => {
        setSidebarState(previous => {
            const nextRightSidebarOpen = !previous.rightSidebarOpen;

            return {
                leftSidebarOpen: isOverlayViewport && nextRightSidebarOpen
                    ? false
                    : previous.leftSidebarOpen,
                rightSidebarOpen: nextRightSidebarOpen,
            };
        });
    }, [isOverlayViewport]);

    return {
        isLeftSidebarOpen,
        isRightSidebarOpen,
        handleToggleLeftSidebar,
        handleToggleRightSidebar,
    };
};
