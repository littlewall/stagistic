import {FOUNTAIN_BLOCK_NODE_NAME} from '@stagistic/script-core';
import type {Editor as TiptapEditor} from '@tiptap/react';

import {findFountainBlockByIdFromState} from '../../../tiptap/fountainCore';
import type {TopLevelBlockMetrics} from './types';

export const clamp = (value: number, min: number, max: number) => {
    return Math.max(min, Math.min(max, value));
};

export const asFountainBlockElement = (value: Node | null): HTMLElement | null => {
    if (!(value instanceof HTMLElement)) {
        return null;
    }

    if (value.matches('p[data-fountain-block]')) {
        return value;
    }

    return value.closest<HTMLElement>('p[data-fountain-block]');
};

export const resolveFountainBlockElementById = (
    editor: TiptapEditor,
    blockId: string,
): HTMLElement | null => {
    const block = findFountainBlockByIdFromState(editor.state, blockId, FOUNTAIN_BLOCK_NODE_NAME);

    if (!block) {
        return null;
    }

    const nodeDom = editor.view.nodeDOM(block.pos);

    return asFountainBlockElement(nodeDom);
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
    editor: TiptapEditor,
    canvas: HTMLElement,
): TopLevelBlockMetrics[] => {
    const canvasRect = canvas.getBoundingClientRect();
    const metrics: TopLevelBlockMetrics[] = [];

    editor.state.doc.forEach((node, pos) => {
        if (node.type.name !== FOUNTAIN_BLOCK_NODE_NAME) {
            return;
        }

        const blockId = typeof node.attrs?.id === 'string' ? node.attrs.id : null;

        if (!blockId) {
            return;
        }

        const nodeDom = editor.view.nodeDOM(pos);
        const element = asFountainBlockElement(nodeDom);

        if (!element) {
            return;
        }

        const blockRect = element.getBoundingClientRect();
        const top = blockRect.top - canvasRect.top + canvas.scrollTop;
        const bottom = blockRect.bottom - canvasRect.top + canvas.scrollTop;

        metrics.push({
            id: blockId,
            blockType: node.attrs?.blockType,
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
