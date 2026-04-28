import type {Editor as TiptapEditor} from '@tiptap/react';
import {
    type Dispatch,
    type SetStateAction,
    useEffect,
} from 'react';

import type {SuggestionEntry} from './types';
import type {SuggestionInteractionState} from './useSuggestionInteractionState';

interface UseSuggestionKeyboardHandlersArgs {
    editor: TiptapEditor | null,
    interactionState: SuggestionInteractionState,
    suggestionEntries: SuggestionEntry[],
    activeSuggestionIndex: number | null,
    setActiveSuggestionIndex: Dispatch<SetStateAction<number | null>>,
    selectSuggestion: (suggestion: string) => void,
}

export const useSuggestionKeyboardHandlers = ({
    editor,
    interactionState,
    suggestionEntries,
    activeSuggestionIndex,
    setActiveSuggestionIndex,
    selectSuggestion,
}: UseSuggestionKeyboardHandlersArgs) => {
    useEffect(() => {
        if (interactionState === 'closed' || suggestionEntries.length === 0) {
            return;
        }

        const handleKeyDown = (event: KeyboardEvent) => {
            if (!editor?.isFocused) {
                return;
            }

            if (event.key === 'ArrowDown') {
                event.preventDefault();
                event.stopPropagation();
                setActiveSuggestionIndex(previous => {
                    if (previous === null) {
                        return 0;
                    }

                    return (previous + 1) % suggestionEntries.length;
                });

                return;
            }

            if (event.key === 'ArrowUp') {
                event.preventDefault();
                event.stopPropagation();
                setActiveSuggestionIndex(previous => {
                    if (previous === null) {
                        return suggestionEntries.length - 1;
                    }

                    return (previous + suggestionEntries.length - 1) % suggestionEntries.length;
                });

                return;
            }

            if (event.key !== 'Enter' || interactionState !== 'open_keyboard_selected') {
                return;
            }

            if (activeSuggestionIndex === null) {
                return;
            }

            const activeSuggestion = suggestionEntries[activeSuggestionIndex];

            if (!activeSuggestion) {
                return;
            }

            event.preventDefault();
            event.stopPropagation();
            selectSuggestion(activeSuggestion.key);
        };

        document.addEventListener('keydown', handleKeyDown, true);

        return () => {
            document.removeEventListener('keydown', handleKeyDown, true);
        };
    }, [
        activeSuggestionIndex,
        editor,
        interactionState,
        selectSuggestion,
        setActiveSuggestionIndex,
        suggestionEntries,
    ]);
};
