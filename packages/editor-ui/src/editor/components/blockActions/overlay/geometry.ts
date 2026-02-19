import {FOUNTAIN_BLOCK_NODE_NAME} from '@stagistic/script-core';
import type {Editor as TiptapEditor} from '@tiptap/react';

import {findFountainBlockByIdFromState} from '../../../tiptap/fountainCore';
import type {
    OverlayAnchorStyle,
    TopLevelBlockMetrics,
} from './types';

export const toNumericStyleValue = (value: unknown): number | null => {
    if (typeof value === 'number' && Number.isFinite(value)) {
        return value;
    }

    if (typeof value === 'string') {
        const parsed = Number.parseFloat(value);

        return Number.isFinite(parsed) ? parsed : null;
    }

    return null;
};

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

export const findBlockLayoutById = (
    editor: TiptapEditor,
    blockId: string,
): {element: HTMLElement, from: number} | null => {
    const block = findFountainBlockByIdFromState(editor.state, blockId, FOUNTAIN_BLOCK_NODE_NAME);

    if (!block) {
        return null;
    }

    const nodeDom = editor.view.nodeDOM(block.pos);
    const element = asFountainBlockElement(nodeDom);

    if (!element) {
        return null;
    }

    return {
        element,
        from: block.from,
    };
};

export const resolveOverlayStyleForBlockId = (
    editor: TiptapEditor,
    canvas: HTMLElement,
    blockId: string,
): OverlayAnchorStyle | null => {
    const blockLayout = findBlockLayoutById(editor, blockId);

    if (!blockLayout) {
        return null;
    }

    const blockElement = blockLayout.element;
    const canvasRect = canvas.getBoundingClientRect();
    const targetRect = blockElement.getBoundingClientRect();
    const computed = window.getComputedStyle(blockElement);
    const paddingTop = Number.parseFloat(computed.paddingTop) || 0;
    const lineHeightValue = Number.parseFloat(computed.lineHeight);
    let top = targetRect.top - canvasRect.top + canvas.scrollTop + paddingTop;
    const hasFiniteLineHeight = Number.isFinite(lineHeightValue) && lineHeightValue > 0;

    if (hasFiniteLineHeight) {
        top += lineHeightValue / 2;
    }

    if (!hasFiniteLineHeight) {
        try {
            const caretCoords = editor.view.coordsAtPos(blockLayout.from);

            top = ((caretCoords.top + caretCoords.bottom) / 2) - canvasRect.top + canvas.scrollTop;
        } catch {
            // Fallback keeps computed first-line approximation.
        }
    }

    return {
        top,
        left: targetRect.left - canvasRect.left + canvas.scrollLeft,
        width: targetRect.width,
    };
};

type ResolveDropLocationArgs = {
    sourceBlockId: string,
    pointerClientY: number,
    editor: TiptapEditor,
    canvas: HTMLElement,
    dragDisabledBlockTypes: Set<unknown>,
};

export const resolveDropLocation = ({
    sourceBlockId,
    pointerClientY,
    editor,
    canvas,
    dragDisabledBlockTypes,
}: ResolveDropLocationArgs): string | null | undefined => {
    const metrics = collectTopLevelBlockMetrics(editor, canvas);

    if (metrics.length === 0) {
        return undefined;
    }

    const sourceMetric = metrics.find(metric => metric.id === sourceBlockId);

    if (!sourceMetric || dragDisabledBlockTypes.has(sourceMetric.blockType)) {
        return undefined;
    }

    const metricsWithoutSource = metrics.filter(metric => metric.id !== sourceBlockId);

    if (metricsWithoutSource.length === 0) {
        return undefined;
    }

    const canvasRect = canvas.getBoundingClientRect();
    const pointerY = pointerClientY - canvasRect.top + canvas.scrollTop;
    const destinationIndex = metricsWithoutSource.findIndex(metric => pointerY < metric.midpoint);

    if (destinationIndex < 0) {
        return null;
    }

    return metricsWithoutSource[destinationIndex]?.id ?? null;
};
