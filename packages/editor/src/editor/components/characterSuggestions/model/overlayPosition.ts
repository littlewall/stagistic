import type {Editor as TiptapEditor} from '@tiptap/react';

const getSafeCoordsAtPos = (editor: TiptapEditor, pos: number, fallbackPos: number) => {
    try {
        return editor.view.coordsAtPos(pos);
    } catch {
        try {
            return editor.view.coordsAtPos(fallbackPos);
        } catch {
            return null;
        }
    }
};

const getSizeScale = (element: HTMLElement) => {
    const raw = window.getComputedStyle(element).getPropertyValue('--size-scale');
    const parsed = Number.parseFloat(raw);

    return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
};

type ComputeOverlayStyleArgs = {
    editor: TiptapEditor,
    canvas: HTMLElement,
    blockFrom: number,
    blockTo: number,
    valueStart: number,
    valueEnd: number,
    overlayWidthPx: number,
    horizontalPaddingPx: number,
};

export const computeOverlayStyle = ({
    editor,
    canvas,
    blockFrom,
    blockTo,
    valueStart,
    valueEnd,
    overlayWidthPx,
    horizontalPaddingPx,
}: ComputeOverlayStyleArgs) => {
    const anchorStartPos = blockFrom + valueStart;
    const safeAnchorStartPos = Math.max(blockFrom, Math.min(anchorStartPos, blockTo));
    const anchorEndPos = blockFrom + Math.max(valueEnd, valueStart + 1);
    const safeAnchorEndPos = Math.max(safeAnchorStartPos, Math.min(anchorEndPos, blockTo));
    const cursorPos = editor.state.selection.from;
    const anchorStartCoords = getSafeCoordsAtPos(editor, safeAnchorStartPos, cursorPos);
    const anchorEndCoords = getSafeCoordsAtPos(editor, safeAnchorEndPos, cursorPos);

    if (!anchorStartCoords || !anchorEndCoords) {
        return null;
    }

    const canvasRect = canvas.getBoundingClientRect();
    const sizeScale = getSizeScale(canvas);
    const tagPadding = horizontalPaddingPx * sizeScale;
    const rawLeft = anchorStartCoords.left - canvasRect.left + canvas.scrollLeft - tagPadding;
    const minLeft = canvas.scrollLeft;
    const maxLeft = canvas.scrollLeft + canvas.clientWidth - overlayWidthPx;
    const left = Math.max(minLeft, Math.min(rawLeft, Math.max(minLeft, maxLeft)));
    const top = anchorEndCoords.bottom - canvasRect.top + canvas.scrollTop;

    return {
        top,
        left,
    };
};
