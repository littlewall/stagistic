import type {Editor as TiptapEditor} from '@tiptap/react';

import {
    SCRIPT_BLOCK_DOM_ID_ATTRIBUTE,
    SCRIPT_BLOCK_DOM_SELECTOR,
    SCRIPT_BLOCK_DOM_TYPE_ATTRIBUTE,
} from '../../../tiptap/scriptCore';
import type {TopLevelBlockMetrics} from './types';

export const clamp = (value: number, min: number, max: number) => {
    return Math.max(min, Math.min(max, value));
};

const escapeCssAttributeValue = (value: string) => {
    if (typeof CSS !== 'undefined' && typeof CSS.escape === 'function') {
        return CSS.escape(value);
    }

    return value.replace(/["\\]/g, '\\$&');
};

export const asScriptBlockElement = (value: Node | null): HTMLElement | null => {
    if (!(value instanceof HTMLElement)) {
        return null;
    }

    if (value.matches(SCRIPT_BLOCK_DOM_SELECTOR)) {
        return value;
    }

    return value.closest<HTMLElement>(SCRIPT_BLOCK_DOM_SELECTOR);
};

export const resolveScriptBlockElementById = (
    editor: TiptapEditor,
    blockId: string,
    blockPos?: number | null,
): HTMLElement | null => {
    if (typeof blockPos === 'number') {
        const blockElementFromPos = asScriptBlockElement(editor.view.nodeDOM(blockPos));

        if (blockElementFromPos) {
            return blockElementFromPos;
        }
    }

    const escapedBlockId = escapeCssAttributeValue(blockId);

    return editor.view.dom.querySelector<HTMLElement>(
        `${SCRIPT_BLOCK_DOM_SELECTOR}[${SCRIPT_BLOCK_DOM_ID_ATTRIBUTE}="${escapedBlockId}"]`,
    );
};

export const resolveElementOffsetWithinAncestor = (
    element: HTMLElement,
    ancestor: HTMLElement,
): {top: number, left: number} | null => {
    let top = 0;
    let left = 0;
    let current: HTMLElement | null = element;

    while (current && current !== ancestor) {
        top += current.offsetTop;
        left += current.offsetLeft;

        const nextParent: Element | null = current.offsetParent;

        if (!(nextParent instanceof HTMLElement)) {
            return null;
        }

        current = nextParent;
    }

    if (current !== ancestor) {
        return null;
    }

    return {
        top,
        left,
    };
};

export const collectTopLevelBlockMetrics = (
    _editor: TiptapEditor,
    canvas: HTMLElement,
): TopLevelBlockMetrics[] => {
    const canvasRect = canvas.getBoundingClientRect();
    const metrics: TopLevelBlockMetrics[] = [];

    canvas.querySelectorAll<HTMLElement>(SCRIPT_BLOCK_DOM_SELECTOR).forEach(element => {
        const blockId = element.getAttribute(SCRIPT_BLOCK_DOM_ID_ATTRIBUTE)?.trim() ?? '';

        if (!blockId) {
            return;
        }

        const blockRect = element.getBoundingClientRect();
        const top = blockRect.top - canvasRect.top + canvas.scrollTop;
        const bottom = blockRect.bottom - canvasRect.top + canvas.scrollTop;

        metrics.push({
            id: blockId,
            blockType: element.getAttribute(SCRIPT_BLOCK_DOM_TYPE_ATTRIBUTE),
            top,
            bottom,
            midpoint: (top + bottom) / 2,
        });
    });

    return metrics;
};

interface ResolveDropLocationArgs {
    sourceBlockId: string,
    pointerClientY: number,
    editor: TiptapEditor,
    canvas: HTMLElement,
    dragDisabledBlockTypes: Set<unknown>,
}

interface ResolveDropLocationFromMetricsArgs {
    sourceBlockId: string,
    pointerClientY: number,
    canvas: HTMLElement,
    dragDisabledBlockTypes: Set<unknown>,
    metrics: readonly TopLevelBlockMetrics[],
}

export const resolveDropLocationFromMetrics = ({
    sourceBlockId,
    pointerClientY,
    canvas,
    dragDisabledBlockTypes,
    metrics,
}: ResolveDropLocationFromMetricsArgs): string | null | undefined => {
    if (metrics.length < 2) {
        return undefined;
    }

    const sourceMetric = metrics.find(metric => metric.id === sourceBlockId);

    if (!sourceMetric || dragDisabledBlockTypes.has(sourceMetric.blockType)) {
        return undefined;
    }

    const canvasRect = canvas.getBoundingClientRect();
    const pointerY = pointerClientY - canvasRect.top + canvas.scrollTop;

    for (let index = 0; index < metrics.length; index += 1) {
        const metric = metrics[index];

        if (!metric || metric.id === sourceBlockId) {
            continue;
        }

        if (pointerY < metric.midpoint) {
            return metric.id;
        }
    }

    return null;
};

export const resolveDropLocation = ({
    sourceBlockId,
    pointerClientY,
    editor,
    canvas,
    dragDisabledBlockTypes,
}: ResolveDropLocationArgs): string | null | undefined => {
    const metrics = collectTopLevelBlockMetrics(editor, canvas);

    return resolveDropLocationFromMetrics({
        sourceBlockId,
        pointerClientY,
        canvas,
        dragDisabledBlockTypes,
        metrics,
    });
};
