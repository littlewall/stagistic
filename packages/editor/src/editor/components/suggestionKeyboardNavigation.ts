import type {Dispatch, SetStateAction} from 'react';

interface SuggestionKeyboardNavigationOptions<T> {
    event: KeyboardEvent,
    suggestions: readonly T[],
    activeSuggestionIndex: number | null,
    setActiveSuggestionIndex: Dispatch<SetStateAction<number | null>>,
    onSelect: (suggestion: T) => void,
}

export const handleSuggestionKeyDown = <T>({
    event,
    suggestions,
    activeSuggestionIndex,
    setActiveSuggestionIndex,
    onSelect,
}: SuggestionKeyboardNavigationOptions<T>) => {
    if (suggestions.length === 0) {
        return;
    }

    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault();
        event.stopPropagation();
        setActiveSuggestionIndex(previous => {
            const isNext = event.key === 'ArrowDown';

            if (previous === null) {
                return isNext ? 0 : suggestions.length - 1;
            }

            return (previous + (isNext ? 1 : suggestions.length - 1)) % suggestions.length;
        });

        return;
    }

    if (event.key !== 'Enter' || activeSuggestionIndex === null) {
        return;
    }

    const suggestion = suggestions[activeSuggestionIndex];

    if (suggestion === undefined) {
        return;
    }

    event.preventDefault();
    event.stopPropagation();
    onSelect(suggestion);
};
