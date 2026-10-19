import {
    type CSSProperties,
    useCallback,
    useMemo,
    useRef,
    useState,
} from 'react';

import type {SuggestionEntry} from './types';

export type OverlayState = {
    style: CSSProperties,
    suggestions: SuggestionEntry[],
};

export type SuggestionInteractionState =
    | 'closed'
    | 'open_no_selection'
    | 'open_keyboard_selected';

export const useSuggestionInteractionState = () => {
    const [overlayState, setOverlayState] = useState<OverlayState | null>(null);
    const [activeSuggestionIndex, setActiveSuggestionIndex] = useState<number | null>(null);
    const suggestionOrderByKeyRef = useRef<ReadonlyMap<string, number>>(new Map());
    const clearSuggestionOrderCache = useCallback(() => {
        suggestionOrderByKeyRef.current = new Map();
    }, []);
    const closeOverlay = useCallback(() => {
        clearSuggestionOrderCache();
        setOverlayState(null);
        setActiveSuggestionIndex(null);
    }, [clearSuggestionOrderCache]);
    const suggestionEntries = useMemo(
        () => overlayState?.suggestions ?? [],
        [overlayState],
    );
    let interactionState: SuggestionInteractionState = 'closed';

    if (overlayState !== null) {
        interactionState = activeSuggestionIndex === null
            ? 'open_no_selection'
            : 'open_keyboard_selected';
    }

    const boundedActiveIndex = activeSuggestionIndex === null || suggestionEntries.length === 0
        ? null
        : Math.max(0, Math.min(activeSuggestionIndex, suggestionEntries.length - 1));

    if (activeSuggestionIndex !== boundedActiveIndex) {
        setActiveSuggestionIndex(boundedActiveIndex);
    }

    return {
        overlayState,
        setOverlayState,
        suggestionEntries,
        activeSuggestionIndex,
        setActiveSuggestionIndex,
        suggestionOrderByKeyRef,
        closeOverlay,
        interactionState,
    };
};
