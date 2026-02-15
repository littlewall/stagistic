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
    persistentCharacters?: readonly PersistentCharacterRef[],
    characterColorSaturation?: number,
};

export const useCharacterSuggestions = ({
    editor,
    canvasRef,
    persistentCharacters = [],
    characterColorSaturation,
}: UseCharacterSuggestionsArgs) => {
    const [overlayState, setOverlayState] = useState<OverlayState | null>(null);
    const rafIdRef = useRef<number | null>(null);
    const suppressedSelectionRef = useRef<SuppressedSelection | null>(null);
    const normalizedPersistentCharacters = useMemo(() => {
        return normalizePersistentCharacters(persistentCharacters);
    }, [persistentCharacters]);

    const updateOverlay = useCallback(() => {
        const canvas = canvasRef.current;

        if (!editor || !canvas) {
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
        setOverlayState({
            style: overlay.style,
            suggestions: overlay.suggestions,
        });
    }, [
        canvasRef,
        characterColorSaturation,
        editor,
        normalizedPersistentCharacters,
    ]);

    const scheduleOverlayUpdate = useCallback(() => {
        if (rafIdRef.current !== null) {
            return;
        }

        rafIdRef.current = window.requestAnimationFrame(() => {
            rafIdRef.current = null;
            updateOverlay();
        });
    }, [updateOverlay]);

    useLayoutEffect(() => {
        scheduleOverlayUpdate();
    }, [scheduleOverlayUpdate]);

    useEffect(() => {
        if (!editor) {
            return;
        }

        const handleUpdate = () => scheduleOverlayUpdate();

        editor.on('selectionUpdate', handleUpdate);
        editor.on('transaction', handleUpdate);
        editor.on('focus', handleUpdate);
        editor.on('blur', handleUpdate);

        return () => {
            editor.off('selectionUpdate', handleUpdate);
            editor.off('transaction', handleUpdate);
            editor.off('focus', handleUpdate);
            editor.off('blur', handleUpdate);
        };
    }, [editor, scheduleOverlayUpdate]);

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
        return () => {
            if (rafIdRef.current !== null) {
                window.cancelAnimationFrame(rafIdRef.current);
                rafIdRef.current = null;
            }
        };
    }, []);

    const suggestionEntries = useMemo(
        () => overlayState?.suggestions ?? [],
        [overlayState],
    );

    const handleSuggestionMouseDown = useCallback((suggestion: string, event: ReactMouseEvent<HTMLButtonElement>) => {
        event.preventDefault();
        event.stopPropagation();

        if (!editor) {
            return;
        }

        suppressedSelectionRef.current = applyCharacterSuggestion(editor, suggestion);
        setOverlayState(null);
    }, [editor]);

    return {
        overlayState,
        suggestionEntries,
        handleSuggestionMouseDown,
    };
};
