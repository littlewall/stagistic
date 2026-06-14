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
    SCRIPT_BLOCK_NODE_NAMES,
    getActiveScriptBlockFromState,
} from '../../tiptap/scriptCore';
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

const toTargetNode = (target: EventTarget | null) => {
    return target instanceof Node ? target : null;
};

const toTargetElement = (target: Node | null) => {
    if (!target) {
        return null;
    }

    return target instanceof Element ? target : target.parentElement;
};

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
    const getSafeEditorElement = useCallback(() => {
        if (!editor) {
            return null;
        }

        try {
            return editor.view.dom;
        } catch {
            return null;
        }
    }, [editor]);
    const dismissOverlayForCurrentSelection = useCallback(() => {
        if (!editor) {
            closeOverlay();

            return;
        }

        const block = getActiveScriptBlockFromState(editor.state, SCRIPT_BLOCK_NODE_NAMES);

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
        const editorElement = getSafeEditorElement();

        if (!editor || !editorElement) {
            return;
        }

        let clearPointerIntentTimerId: number | null = null;
        const clearPointerIntentTimer = () => {
            if (clearPointerIntentTimerId === null) {
                return;
            }

            window.clearTimeout(clearPointerIntentTimerId);
            clearPointerIntentTimerId = null;
        };

        const handleEditorPointerDown = (event: PointerEvent) => {
            const targetNode = toTargetNode(event.target);

            if (!targetNode || !editorElement.contains(targetNode)) {
                return;
            }

            clearPointerIntentTimer();
            suppressedSelectionRef.current = null;
            pointerSelectionIntentRef.current = true;
            setActiveSuggestionIndex(null);

            window.requestAnimationFrame(() => {
                runOverlayUpdateNow();
            });
            clearPointerIntentTimerId = window.setTimeout(() => {
                pointerSelectionIntentRef.current = false;
                clearPointerIntentTimerId = null;
            }, 250);
        };

        editorElement.addEventListener('pointerdown', handleEditorPointerDown, true);

        return () => {
            clearPointerIntentTimer();
            editorElement.removeEventListener('pointerdown', handleEditorPointerDown, true);
        };
    }, [
        editor,
        getSafeEditorElement,
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
            const targetNode = toTargetNode(event.target);
            const targetElement = toTargetElement(targetNode);

            if (!targetNode) {
                dismissOverlayForCurrentSelection();

                return;
            }

            if (targetElement?.closest('[data-block-actions-trigger="true"]')) {
                dismissOverlayForCurrentSelection();

                return;
            }

            if (overlayRef.current?.contains(targetNode)) {
                return;
            }

            if (canvasRef.current?.contains(targetNode)) {
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
