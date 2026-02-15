import {
    useCallback,
    useState,
} from 'react';

export const useScriptEditorLayoutState = () => {
    const [isLeftSidebarOpen, setIsLeftSidebarOpen] = useState(false);
    const [isRightSidebarOpen, setIsRightSidebarOpen] = useState(false);

    const handleToggleLeftSidebar = useCallback(() => {
        setIsLeftSidebarOpen(previous => !previous);
    }, []);
    const handleToggleRightSidebar = useCallback(() => {
        setIsRightSidebarOpen(previous => !previous);
    }, []);

    return {
        isLeftSidebarOpen,
        isRightSidebarOpen,
        handleToggleLeftSidebar,
        handleToggleRightSidebar,
    };
};
