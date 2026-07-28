import type {Editor as TiptapEditor} from '@tiptap/react';
import {
    type MutableRefObject,
    type RefObject,
    useEffect,
} from 'react';

import {
    getActiveScriptBlockFromState,
    SCRIPT_BLOCK_NODE_NAMES,
} from '../../tiptap/scriptCore';
import type {SuppressedSelection} from './types';
import type {OverlayState} from './useSuggestionInteractionState';

interface UseSuggestionPointerHandlersArgs {
    editor: TiptapEditor | null,
    canvasRef: RefObject<HTMLElement | null>,
    overlayRef: RefObject<HTMLDivElement | null>,
    overlayState: OverlayState | null,
    suppressedSelectionRef: MutableRefObject<SuppressedSelection | null>,
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
    closeOverlay,
}: UseSuggestionPointerHandlersArgs) => {
    const dismissOverlayForCurrentSelection = () => {
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
    };

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
