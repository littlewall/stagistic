import {
    type MouseEvent as ReactMouseEvent,
    type ReactNode,
    useCallback,
    useMemo,
} from 'react';

import type {EditorProps} from '../contracts';
import {extractSidebarSlots} from '../editorSlots';

interface UseEditorSidebarLayoutArgs {
    children: ReactNode | undefined,
    layout: EditorProps['layout'],
}

export const useEditorSidebarLayout = ({
    children,
    layout,
}: UseEditorSidebarLayoutArgs) => {
    const {left: slotLeft, right: slotRight} = extractSidebarSlots(children);
    const leftSidebar = slotLeft ?? layout?.leftSidebar;
    const rightSidebar = slotRight ?? layout?.rightSidebar;

    const handleLeftToggle = layout?.leftSidebarToggle?.onToggle;
    const handleRightToggle = layout?.rightSidebarToggle?.onToggle;

    const handleLeftSidebarToggleMouseDown = useCallback((event: ReactMouseEvent<HTMLButtonElement>) => {
        event.preventDefault();
        handleLeftToggle?.();
    }, [handleLeftToggle]);

    const handleRightSidebarToggleMouseDown = useCallback((event: ReactMouseEvent<HTMLButtonElement>) => {
        event.preventDefault();
        handleRightToggle?.();
    }, [handleRightToggle]);

    const resolvedLayout = useMemo(() => ({
        ...layout,
        leftSidebar,
        rightSidebar,
    }), [
        layout,
        leftSidebar,
        rightSidebar,
    ]);

    return {
        resolvedLayout,
        handleLeftSidebarToggleMouseDown,
        handleRightSidebarToggleMouseDown,
    };
};
