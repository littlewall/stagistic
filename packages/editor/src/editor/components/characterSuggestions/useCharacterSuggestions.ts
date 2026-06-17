import {type Editor as TiptapEditor} from '@tiptap/react';
import {
    type MouseEvent as ReactMouseEvent,
    type RefObject,
    useCallback,
    useEffect,
    useMemo,
    useRef,
} from 'react';

import {useExclusiveOverlay} from '../../hooks/useExclusiveOverlay';
import {useEditorLiveCharacters} from '../../live/hooks';
import {getCharacterTagComposeFromState} from '../../tiptap/extensions/CharacterTagInputExtension';
import {getEmptyEnterChooserFromState} from '../../tiptap/extensions/EmptyEnterChooserExtension';
import {
    applyCharacterSuggestion,
    normalizePersistentCharacters,
    type PersistentCharacterRef,
    type SuppressedSelection,
} from './model';
import {resolveOverlayTransactionAction} from './transactionOverlayPolicy';
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
            const chooserState = getEmptyEnterChooserFromState(editor.state);
            const action = resolveOverlayTransactionAction({
                transaction,
                interactionState,
                isComposeActive: getCharacterTagComposeFromState(editor.state) !== null,
                isEmptyEnterChooserOpen: chooserState.isOpen,
            });

            if (action === 'schedule') {
                scheduleOverlayUpdate();

                return;
            }

            if (action === 'close') {
                closeOverlay();
            }
        };
        const handleFocus = () => {
            if (getCharacterTagComposeFromState(editor.state)) {
                scheduleOverlayUpdate();

                return;
            }

            closeOverlay();
        };
        const handleBlur = () => {
            cancelScheduledOverlayUpdate();
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
        scheduleOverlayUpdate,
    ]);

    useSuggestionPointerHandlers({
        editor,
        canvasRef,
        overlayRef,
        overlayState,
        suppressedSelectionRef,
        closeOverlay,
    });

    useEffect(() => {
        const handleResize = () => {
            if (!overlayState) {
                return;
            }

            scheduleOverlayUpdate();
        };

        window.addEventListener('resize', handleResize);

        return () => {
            window.removeEventListener('resize', handleResize);
        };
    }, [overlayState, scheduleOverlayUpdate]);

    useExclusiveOverlay(overlayState !== null, closeOverlay);

    const selectSuggestion = useCallback((suggestion: string) => {
        if (!editor) {
            return;
        }

        if (getCharacterTagComposeFromState(editor.state)) {
            editor.commands.commitCharacterTag({name: suggestion});
            closeOverlay();

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
