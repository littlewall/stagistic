import type {Editor as TiptapEditor} from '@tiptap/react';
import {
    type KeyboardEvent as ReactKeyboardEvent,
    type PointerEvent as ReactPointerEvent,
    type RefObject,
    useCallback,
} from 'react';

import type {BlockActionCommand} from './actionTypes';

interface UseGutterMenuInteractionsArgs {
    editor: TiptapEditor | null,
    actionTriggerRef: RefObject<HTMLButtonElement | null>,
    closeActionMenu: () => void,
    closeTypeMenu: () => void,
    toggleActionMenu: () => void,
    toggleTypeMenu: () => void,
}

export const useGutterMenuInteractions = ({
    editor,
    actionTriggerRef,
    closeActionMenu,
    closeTypeMenu,
    toggleActionMenu,
    toggleTypeMenu,
}: UseGutterMenuInteractionsArgs) => {
    const closeGutterMenus = useCallback(() => {
        closeTypeMenu();
        closeActionMenu();
    }, [closeActionMenu, closeTypeMenu]);
    const toggleTypeMenuExclusively = useCallback(() => {
        closeActionMenu();
        toggleTypeMenu();
    }, [closeActionMenu, toggleTypeMenu]);
    const handleActionTriggerPointerDown = useCallback((
        event: ReactPointerEvent<HTMLButtonElement>,
    ) => {
        event.preventDefault();
        event.stopPropagation();
        editor?.commands.focus();
        closeTypeMenu();
        toggleActionMenu();
    }, [
        closeTypeMenu,
        editor,
        toggleActionMenu,
    ]);
    const handleKeyboardTypeTriggerKeyDown = useCallback((
        event: ReactKeyboardEvent<HTMLButtonElement>,
    ) => {
        if (event.key !== 'Enter' && event.key !== ' ') {
            return;
        }

        event.preventDefault();
        event.stopPropagation();
        editor?.commands.focus();
        toggleTypeMenuExclusively();
    }, [editor, toggleTypeMenuExclusively]);
    const handleKeyboardActionTriggerKeyDown = useCallback((
        event: ReactKeyboardEvent<HTMLButtonElement>,
    ) => {
        if (event.key !== 'Enter' && event.key !== ' ') {
            return;
        }

        event.preventDefault();
        event.stopPropagation();
        closeTypeMenu();
        toggleActionMenu();
    }, [closeTypeMenu, toggleActionMenu]);
    const handleBlockAction = useCallback((command: BlockActionCommand) => {
        closeActionMenu();
        command.run();
    }, [closeActionMenu]);
    const closeActionMenuAndRestoreFocus = useCallback(() => {
        closeActionMenu();
        window.requestAnimationFrame(() => actionTriggerRef.current?.focus());
    }, [actionTriggerRef, closeActionMenu]);

    return {
        closeGutterMenus,
        toggleTypeMenuExclusively,
        handleActionTriggerPointerDown,
        handleKeyboardTypeTriggerKeyDown,
        handleKeyboardActionTriggerKeyDown,
        handleBlockAction,
        closeActionMenuAndRestoreFocus,
    };
};
