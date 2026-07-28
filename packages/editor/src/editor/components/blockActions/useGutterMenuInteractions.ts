import type {Editor as TiptapEditor} from '@tiptap/react';
import {
    type KeyboardEvent as ReactKeyboardEvent,
    type PointerEvent as ReactPointerEvent,
    useCallback,
} from 'react';

import type {BlockActionCommand} from './actionTypes';

interface UseGutterMenuInteractionsArgs {
    editor: TiptapEditor | null,
    closeActionMenu: () => void,
    closeTypeMenu: () => void,
    toggleActionMenu: () => void,
    toggleTypeMenu: () => void,
}

export const useGutterMenuInteractions = ({
    editor,
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
        editor?.commands.focus();
        closeTypeMenu();
        toggleActionMenu();
    }, [
        closeTypeMenu,
        editor,
        toggleActionMenu,
    ]);
    const handleBlockAction = useCallback((command: BlockActionCommand) => {
        closeActionMenu();
        command.run();
    }, [closeActionMenu]);

    return {
        closeGutterMenus,
        toggleTypeMenuExclusively,
        handleActionTriggerPointerDown,
        handleKeyboardTypeTriggerKeyDown,
        handleKeyboardActionTriggerKeyDown,
        handleBlockAction,
    };
};
