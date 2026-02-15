import {
    useCallback,
    useEffect,
    useState,
} from 'react';

const OVERLAY_BREAKPOINT_QUERY = '(max-width: 1100px)';

const getIsOverlayViewport = () => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
        return false;
    }

    return window.matchMedia(OVERLAY_BREAKPOINT_QUERY).matches;
};

export const useScriptEditorLayoutState = () => {
    const [isLeftSidebarOpen, setIsLeftSidebarOpen] = useState(false);
    const [isRightSidebarOpen, setIsRightSidebarOpen] = useState(false);
    const [isOverlayViewport, setIsOverlayViewport] = useState(getIsOverlayViewport);

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
        if (!isOverlayViewport) {
            return;
        }

        if (isLeftSidebarOpen && isRightSidebarOpen) {
            setIsLeftSidebarOpen(false);
        }
    }, [
        isLeftSidebarOpen,
        isOverlayViewport,
        isRightSidebarOpen,
    ]);

    const handleToggleLeftSidebar = useCallback(() => {
        setIsLeftSidebarOpen(previous => {
            const next = !previous;

            if (isOverlayViewport && next) {
                setIsRightSidebarOpen(false);
            }

            return next;
        });
    }, [isOverlayViewport]);
    const handleToggleRightSidebar = useCallback(() => {
        setIsRightSidebarOpen(previous => {
            const next = !previous;

            if (isOverlayViewport && next) {
                setIsLeftSidebarOpen(false);
            }

            return next;
        });
    }, [isOverlayViewport]);

    return {
        isLeftSidebarOpen,
        isRightSidebarOpen,
        handleToggleLeftSidebar,
        handleToggleRightSidebar,
    };
};
