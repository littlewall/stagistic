import {
    useCallback,
    useEffect,
    useRef,
} from 'react';

import {
    FOUNTAIN_BLOCK_DOM_ID_ATTRIBUTE,
    FOUNTAIN_BLOCK_DOM_SELECTOR,
} from '../../../tiptap/fountainCore';

const escapeCssAttributeValue = (value: string) => {
    if (typeof CSS !== 'undefined' && typeof CSS.escape === 'function') {
        return CSS.escape(value);
    }

    return value.replace(/["\\]/g, '\\$&');
};

export const useDragSourceHighlight = () => {
    const dragSourceHighlightStyleRef = useRef<HTMLStyleElement | null>(null);
    const highlightedDragSourceIdRef = useRef<string | null>(null);

    const clearDraggedSourceHighlight = useCallback(() => {
        const styleElement = dragSourceHighlightStyleRef.current;

        if (styleElement) {
            styleElement.remove();
            dragSourceHighlightStyleRef.current = null;
        }

        highlightedDragSourceIdRef.current = null;
    }, []);

    const applyDraggedSourceHighlight = useCallback((blockId: string) => {
        if (highlightedDragSourceIdRef.current === blockId) {
            return;
        }

        let styleElement = dragSourceHighlightStyleRef.current;

        if (!styleElement) {
            styleElement = document.createElement('style');
            styleElement.setAttribute('data-drag-source-highlight', 'true');
            document.head.appendChild(styleElement);
            dragSourceHighlightStyleRef.current = styleElement;
        }

        const escapedBlockId = escapeCssAttributeValue(blockId);

        styleElement.textContent = [
            `[data-fountain-editor="true"] ${FOUNTAIN_BLOCK_DOM_SELECTOR}[${FOUNTAIN_BLOCK_DOM_ID_ATTRIBUTE}="${escapedBlockId}"] {`,
            'background: color-mix(in srgb, var(--color-accent) 22%, transparent) !important;',
            'box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--color-accent) 38%, transparent) !important;',
            'outline: 1px solid color-mix(in srgb, var(--color-accent) 65%, transparent) !important;',
            'border-radius: calc(4px * var(--size-scale)) !important;',
            '}',
        ].join('');

        highlightedDragSourceIdRef.current = blockId;
    }, []);

    useEffect(() => {
        return () => {
            clearDraggedSourceHighlight();
        };
    }, [clearDraggedSourceHighlight]);

    return {
        applyDraggedSourceHighlight,
        clearDraggedSourceHighlight,
    };
};
