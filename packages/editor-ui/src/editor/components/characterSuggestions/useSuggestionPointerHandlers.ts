import type {Editor as TiptapEditor} from '@tiptap/react';
import {
    type Dispatch,
    type MutableRefObject,
    type RefObject,
    type SetStateAction,
    useCallback,
    useEffect,
} from 'react';

import {
    FOUNTAIN_BLOCK_NODE_NAME,
    getActiveFountainBlockFromState,
} from '../../tiptap/fountainCore';
import type {SuppressedSelection} from './types';
import type {OverlayState} from './useSuggestionInteractionState';

interface UseSuggestionPointerHandlersArgs {
    editor: TiptapEditor | null,
    canvasRef: RefObject<HTMLElement | null>,
    overlayRef: RefObject<HTMLDivElement | null>,
    overlayState: OverlayState | null,
    suppressedSelectionRef: MutableRefObject<SuppressedSelection | null>,
    pointerSelectionIntentRef: MutableRefObject<boolean>,
    setActiveSuggestionIndex: Dispatch<SetStateAction<number | null>>,
    runOverlayUpdateNow: () => void,
    closeOverlay: () => void,
}

export const useSuggestionPointerHandlers = ({
    editor,
    canvasRef,
    overlayRef,
    overlayState,
    suppressedSelectionRef,
    pointerSelectionIntentRef,
    setActiveSuggestionIndex,
    runOverlayUpdateNow,
    closeOverlay,
}: UseSuggestionPointerHandlersArgs) => {
    const dismissOverlayForCurrentSelection = useCallback(() => {
        if (!editor) {
            closeOverlay();

            return;
        }

        const block = getActiveFountainBlockFromState(editor.state, FOUNTAIN_BLOCK_NODE_NAME);

        if (!block || !editor.state.selection.empty) {
            suppressedSelectionRef.current = null;
            closeOverlay();

            return;
        }

        suppressedSelectionRef.current = {
            blockId: block.id,
            position: editor.state.selection.from,
        };

        closeOverlay();
    }, [
        closeOverlay,
        editor,
        suppressedSelectionRef,
    ]);

    useEffect(() => {
        if (!editor) {
            return;
        }

        const editorElement = editor.view.dom;
        const handleEditorPointerDown = (event: PointerEvent) => {
            const target = event.target as Node | null;

            if (!target || !editorElement.contains(target)) {
                return;
            }

            suppressedSelectionRef.current = null;
            pointerSelectionIntentRef.current = true;
            setActiveSuggestionIndex(null);

            window.requestAnimationFrame(() => {
                if (!pointerSelectionIntentRef.current) {
                    return;
                }

                pointerSelectionIntentRef.current = false;
                runOverlayUpdateNow();
            });
        };

        editorElement.addEventListener('pointerdown', handleEditorPointerDown, true);

        return () => {
            editorElement.removeEventListener('pointerdown', handleEditorPointerDown, true);
        };
    }, [
        editor,
        pointerSelectionIntentRef,
        runOverlayUpdateNow,
        setActiveSuggestionIndex,
        suppressedSelectionRef,
    ]);

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
};
