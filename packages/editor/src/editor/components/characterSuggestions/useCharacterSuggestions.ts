import {type Editor as TiptapEditor} from '@tiptap/react';
import {
    type MouseEvent as ReactMouseEvent,
    type RefObject,
    useCallback,
    useEffect,
    useMemo,
    useRef,
} from 'react';

import {useEditorLiveCharacters} from '../../live';
import {getEmptyEnterChooserFromState} from '../../tiptap/extensions/EmptyEnterChooserExtension';
import {
    applyCharacterSuggestion,
    normalizePersistentCharacters,
    type PersistentCharacterRef,
    type SuppressedSelection,
} from './model';
import {useSuggestionInteractionState} from './useSuggestionInteractionState';
import {useSuggestionKeyboardHandlers} from './useSuggestionKeyboardHandlers';
import {useSuggestionOverlayComputation} from './useSuggestionOverlayComputation';
import {useSuggestionPointerHandlers} from './useSuggestionPointerHandlers';

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
    const liveCharacters = useEditorLiveCharacters();
    const suppressedSelectionRef = useRef<SuppressedSelection | null>(null);
    const pointerSelectionIntentRef = useRef(false);
    const normalizedPersistentCharacters = useMemo(
        () => normalizePersistentCharacters(persistentCharacters),
        [persistentCharacters],
    );
    const {
        overlayState,
        setOverlayState,
        suggestionEntries,
        activeSuggestionIndex,
        setActiveSuggestionIndex,
        suggestionOrderByKeyRef,
        closeOverlay,
        interactionState,
    } = useSuggestionInteractionState();
    const {
        cancelScheduledOverlayUpdate,
        scheduleOverlayUpdate,
        runOverlayUpdateNow,
    } = useSuggestionOverlayComputation({
        editor,
        canvasRef,
        normalizedPersistentCharacters,
        liveCountsByKey: liveCharacters.countsByKey,
        characterColorSaturation,
        suppressedSelectionRef,
        suggestionOrderByKeyRef,
        closeOverlay,
        setOverlayState,
    });

    useEffect(() => {
        if (normalizedPersistentCharacters.length > 0) {
            return;
        }

        closeOverlay();
    }, [closeOverlay, normalizedPersistentCharacters]);

    useEffect(() => {
        if (!editor) {
            return;
        }

        const handleTransaction = ({transaction}: {transaction: {docChanged: boolean, selectionSet: boolean}}) => {
            if (interactionState === 'open_no_selection') {
                const chooserState = getEmptyEnterChooserFromState(editor.state);

                if (chooserState.isOpen) {
                    closeOverlay();

                    return;
                }
            }

            if (transaction.docChanged) {
                pointerSelectionIntentRef.current = false;
                runOverlayUpdateNow();

                return;
            }

            if (!transaction.selectionSet) {
                return;
            }

            if (pointerSelectionIntentRef.current) {
                pointerSelectionIntentRef.current = false;
                runOverlayUpdateNow();

                return;
            }

            closeOverlay();
        };
        const handleFocus = () => {
            if (pointerSelectionIntentRef.current) {
                return;
            }

            closeOverlay();
        };
        const handleBlur = () => {
            cancelScheduledOverlayUpdate();
            pointerSelectionIntentRef.current = false;
            closeOverlay();
        };

        editor.on('transaction', handleTransaction);
        editor.on('focus', handleFocus);
        editor.on('blur', handleBlur);

        return () => {
            editor.off('transaction', handleTransaction);
            editor.off('focus', handleFocus);
            editor.off('blur', handleBlur);
        };
    }, [
        cancelScheduledOverlayUpdate,
        closeOverlay,
        editor,
        interactionState,
        runOverlayUpdateNow,
    ]);

    useSuggestionPointerHandlers({
        editor,
        canvasRef,
        overlayRef,
        overlayState,
        suppressedSelectionRef,
        pointerSelectionIntentRef,
        setActiveSuggestionIndex,
        runOverlayUpdateNow,
        closeOverlay,
    });

    useEffect(() => {
        const canvas = canvasRef.current;

        if (!canvas) {
            return;
        }

        const handleScroll = () => {
            if (!overlayState) {
                return;
            }

            scheduleOverlayUpdate();
        };

        canvas.addEventListener('scroll', handleScroll);
        window.addEventListener('resize', handleScroll);

        return () => {
            canvas.removeEventListener('scroll', handleScroll);
            window.removeEventListener('resize', handleScroll);
        };
    }, [
        canvasRef,
        overlayState,
        scheduleOverlayUpdate,
    ]);

    const selectSuggestion = useCallback((suggestion: string) => {
        if (!editor) {
            return;
        }

        suppressedSelectionRef.current = applyCharacterSuggestion(editor, suggestion);
        closeOverlay();
    }, [closeOverlay, editor]);
    const handleSuggestionMouseDown = useCallback((suggestion: string, event: ReactMouseEvent<HTMLButtonElement>) => {
        event.preventDefault();
        event.stopPropagation();

        selectSuggestion(suggestion);
    }, [selectSuggestion]);

    useSuggestionKeyboardHandlers({
        editor,
        interactionState,
        suggestionEntries,
        activeSuggestionIndex,
        setActiveSuggestionIndex,
        selectSuggestion,
    });

    return {
        overlayState,
        suggestionEntries,
        activeSuggestionIndex,
        handleSuggestionMouseDown,
    };
};
