import {
    type Editor as TiptapEditor,
} from '@tiptap/react';
import {
    type CSSProperties,
    type MouseEvent as ReactMouseEvent,
    type RefObject,
    useCallback,
    useEffect,
    useLayoutEffect,
    useMemo,
    useRef,
    useState,
} from 'react';

import {
    FOUNTAIN_BLOCK_NODE_NAME,
    getActiveFountainBlockFromState,
    isSelectionAcrossBlocks,
} from '../../tiptap/fountainCore';
import {
    applyCharacterSuggestion,
    computeCharacterSuggestions,
    normalizePersistentCharacters,
    type PersistentCharacterRef,
    type SuggestionEntry,
    type SuppressedSelection,
} from './model';

type OverlayState = {
    style: CSSProperties,
    suggestions: SuggestionEntry[],
};

type UseCharacterSuggestionsArgs = {
    editor: TiptapEditor | null,
    canvasRef: RefObject<HTMLElement | null>,
    overlayRef: RefObject<HTMLDivElement | null>,
    persistentCharacters?: readonly PersistentCharacterRef[],
    characterColorSaturation?: number,
};

export const useCharacterSuggestions = ({
    editor,
    canvasRef,
    overlayRef,
    persistentCharacters = [],
    characterColorSaturation,
}: UseCharacterSuggestionsArgs) => {
    const [overlayState, setOverlayState] = useState<OverlayState | null>(null);
    const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(0);
    const rafIdRef = useRef<number | null>(null);
    const suppressedSelectionRef = useRef<SuppressedSelection | null>(null);
    const normalizedPersistentCharacters = useMemo(() => {
        return normalizePersistentCharacters(persistentCharacters);
    }, [persistentCharacters]);
    const dismissOverlayForCurrentSelection = useCallback(() => {
        if (!editor) {
            setOverlayState(null);

            return;
        }

        const block = getActiveFountainBlockFromState(editor.state, FOUNTAIN_BLOCK_NODE_NAME);

        if (!block || !editor.state.selection.empty) {
            suppressedSelectionRef.current = null;

            setOverlayState(null);

            return;
        }

        suppressedSelectionRef.current = {
            blockId: block.id,
            position: editor.state.selection.from,
        };

        setOverlayState(null);
    }, [editor]);

    const updateOverlay = useCallback(() => {
        const canvas = canvasRef.current;

        if (!editor || !canvas) {
            setOverlayState(null);

            return;
        }

        if (!editor.isFocused) {
            setOverlayState(null);

            return;
        }

        if (isSelectionAcrossBlocks(editor.state, FOUNTAIN_BLOCK_NODE_NAME)) {
            setOverlayState(null);

            return;
        }

        const overlay = computeCharacterSuggestions({
            editor,
            canvas,
            normalizedPersistentCharacters,
            suppressedSelection: suppressedSelectionRef.current,
            characterColorSaturation,
        });

        if (!overlay) {
            setOverlayState(null);

            return;
        }

        if (overlay.shouldKeepSuppressedSelection) {
            setOverlayState(null);

            return;
        }

        if (!overlay.style || !overlay.suggestions) {
            setOverlayState(null);

            return;
        }

        suppressedSelectionRef.current = null;
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
        editor,
        normalizedPersistentCharacters,
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

    useLayoutEffect(() => {
        runOverlayUpdateNow();
    }, [runOverlayUpdateNow]);

    useEffect(() => {
        if (!editor) {
            return;
        }

        const handleSelectionUpdate = () => runOverlayUpdateNow();
        const handleTransaction = () => scheduleOverlayUpdate();
        const handleFocus = () => runOverlayUpdateNow();
        const handleBlur = () => {
            cancelScheduledOverlayUpdate();
            setOverlayState(null);
        };

        editor.on('selectionUpdate', handleSelectionUpdate);
        editor.on('transaction', handleTransaction);
        editor.on('focus', handleFocus);
        editor.on('blur', handleBlur);

        return () => {
            editor.off('selectionUpdate', handleSelectionUpdate);
            editor.off('transaction', handleTransaction);
            editor.off('focus', handleFocus);
            editor.off('blur', handleBlur);
        };
    }, [
        cancelScheduledOverlayUpdate,
        editor,
        runOverlayUpdateNow,
        scheduleOverlayUpdate,
    ]);

    useEffect(() => {
        const canvas = canvasRef.current;

        if (!canvas) {
            return;
        }

        const handleScroll = () => scheduleOverlayUpdate();

        canvas.addEventListener('scroll', handleScroll);
        window.addEventListener('resize', handleScroll);

        return () => {
            canvas.removeEventListener('scroll', handleScroll);
            window.removeEventListener('resize', handleScroll);
        };
    }, [canvasRef, scheduleOverlayUpdate]);

    useEffect(() => {
        if (!overlayState) {
            return;
        }

        const handlePointerDown = (event: PointerEvent) => {
            const target = event.target as Node;
            const targetElement = target instanceof Element
                ? target
                : target.parentElement;

            if (targetElement?.closest('[data-block-actions-trigger="true"]')) {
                dismissOverlayForCurrentSelection();

                return;
            }

            if (overlayRef.current?.contains(target)) {
                return;
            }

            if (canvasRef.current?.contains(target)) {
                return;
            }

            dismissOverlayForCurrentSelection();
        };

        document.addEventListener('pointerdown', handlePointerDown);

        return () => {
            document.removeEventListener('pointerdown', handlePointerDown);
        };
    }, [
        canvasRef,
        dismissOverlayForCurrentSelection,
        overlayRef,
        overlayState,
    ]);

    useEffect(() => {
        return () => {
            cancelScheduledOverlayUpdate();
        };
    }, [cancelScheduledOverlayUpdate]);

    const suggestionEntries = useMemo(
        () => overlayState?.suggestions ?? [],
        [overlayState],
    );

    useEffect(() => {
        if (suggestionEntries.length === 0) {
            setActiveSuggestionIndex(0);

            return;
        }

        setActiveSuggestionIndex(previous => {
            if (previous < 0) {
                return 0;
            }

            if (previous >= suggestionEntries.length) {
                return suggestionEntries.length - 1;
            }

            return previous;
        });
    }, [suggestionEntries]);

    const selectSuggestion = useCallback((suggestion: string) => {
        if (!editor) {
            return;
        }

        suppressedSelectionRef.current = applyCharacterSuggestion(editor, suggestion);
        setOverlayState(null);
    }, [editor]);

    const handleSuggestionMouseDown = useCallback((suggestion: string, event: ReactMouseEvent<HTMLButtonElement>) => {
        event.preventDefault();
        event.stopPropagation();

        selectSuggestion(suggestion);
    }, [selectSuggestion]);

    useEffect(() => {
        if (!overlayState || suggestionEntries.length === 0) {
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
                    return (previous + 1) % suggestionEntries.length;
                });

                return;
            }

            if (event.key === 'ArrowUp') {
                event.preventDefault();
                event.stopPropagation();
                setActiveSuggestionIndex(previous => {
                    return (previous + suggestionEntries.length - 1) % suggestionEntries.length;
                });

                return;
            }

            if (event.key !== 'Enter') {
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
        overlayState,
        selectSuggestion,
        suggestionEntries,
    ]);

    const handleSuggestionMouseEnter = useCallback((index: number) => {
        setActiveSuggestionIndex(index);
    }, []);

    return {
        overlayState,
        suggestionEntries,
        activeSuggestionIndex,
        handleSuggestionMouseDown,
        handleSuggestionMouseEnter,
    };
};
