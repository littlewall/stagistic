import {type Editor as TiptapEditor} from '@tiptap/react';
import {
    type Dispatch,
    type MutableRefObject,
    type RefObject,
    type SetStateAction,
    useCallback,
    useEffect,
    useRef,
} from 'react';

import {
    computeCharacterSuggestions,
    type PersistentCharacterRef,
    type SuppressedSelection,
} from './model';
import type {OverlayState} from './useSuggestionInteractionState';

interface UseSuggestionOverlayComputationArgs {
    editor: TiptapEditor | null,
    canvasRef: RefObject<HTMLElement | null>,
    normalizedPersistentCharacters: readonly PersistentCharacterRef[],
    characterColorSaturation?: number,
    suppressedSelectionRef: MutableRefObject<SuppressedSelection | null>,
    suggestionOrderByKeyRef: MutableRefObject<ReadonlyMap<string, number>>,
    closeOverlay: () => void,
    setOverlayState: Dispatch<SetStateAction<OverlayState | null>>,
}

export const useSuggestionOverlayComputation = ({
    editor,
    canvasRef,
    normalizedPersistentCharacters,
    characterColorSaturation,
    suppressedSelectionRef,
    suggestionOrderByKeyRef,
    closeOverlay,
    setOverlayState,
}: UseSuggestionOverlayComputationArgs) => {
    const rafIdRef = useRef<number | null>(null);
    const updateOverlay = useCallback(() => {
        const canvas = canvasRef.current;

        if (!editor || !canvas) {
            closeOverlay();

            return;
        }

        if (normalizedPersistentCharacters.length === 0) {
            closeOverlay();

            return;
        }

        if (!editor.isFocused) {
            closeOverlay();

            return;
        }

        const overlay = computeCharacterSuggestions({
            editor,
            canvas,
            normalizedPersistentCharacters,
            suppressedSelection: suppressedSelectionRef.current,
            previousOrderByKey: suggestionOrderByKeyRef.current,
            characterColorSaturation,
        });

        if (!overlay || overlay.shouldKeepSuppressedSelection || !overlay.style || !overlay.suggestions || overlay.suggestions.length === 0) {
            closeOverlay();

            return;
        }

        suppressedSelectionRef.current = null;

        const nextSuggestionOrderByKey = new Map<string, number>();

        overlay.suggestions.forEach((entry, index) => {
            nextSuggestionOrderByKey.set(entry.key, index);
        });

        suggestionOrderByKeyRef.current = nextSuggestionOrderByKey;
        setOverlayState(previous => {
            if (
                previous
                && previous.style.top === overlay.style.top
                && previous.style.left === overlay.style.left
                && previous.suggestions.length === overlay.suggestions.length
                && previous.suggestions.every((entry, index) => {
                    const nextEntry = overlay.suggestions[index];

                    return nextEntry !== undefined
                        && entry.key === nextEntry.key
                        && entry.color === nextEntry.color;
                })
            ) {
                return previous;
            }

            return {
                style: overlay.style,
                suggestions: overlay.suggestions,
            };
        });
    }, [
        canvasRef,
        characterColorSaturation,
        closeOverlay,
        editor,
        normalizedPersistentCharacters,
        setOverlayState,
        suggestionOrderByKeyRef,
        suppressedSelectionRef,
    ]);
    const cancelScheduledOverlayUpdate = useCallback(() => {
        if (rafIdRef.current === null) {
            return;
        }

        window.cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
    }, []);
    const scheduleOverlayUpdate = useCallback(() => {
        if (rafIdRef.current !== null) {
            return;
        }

        rafIdRef.current = window.requestAnimationFrame(() => {
            rafIdRef.current = null;
            updateOverlay();
        });
    }, [updateOverlay]);
    const runOverlayUpdateNow = useCallback(() => {
        cancelScheduledOverlayUpdate();
        updateOverlay();
    }, [cancelScheduledOverlayUpdate, updateOverlay]);

    useEffect(() => {
        return () => {
            cancelScheduledOverlayUpdate();
        };
    }, [cancelScheduledOverlayUpdate]);

    return {
        updateOverlay,
        cancelScheduledOverlayUpdate,
        scheduleOverlayUpdate,
        runOverlayUpdateNow,
    };
};
