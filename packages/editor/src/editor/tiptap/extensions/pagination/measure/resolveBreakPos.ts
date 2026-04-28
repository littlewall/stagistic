import type {Node as ProseMirrorNode} from '@tiptap/pm/model';
import {type EditorView} from '@tiptap/pm/view';

import {resolveWordBoundaryPos} from './resolveWordBoundaryPos';

export const resolveBreakPos = (
    view: EditorView,
    blockPos: number,
    blockNode: ProseMirrorNode,
    blockDom: HTMLElement,
    breakY: number,
): number => {
    const editorRect = view.dom.getBoundingClientRect();
    const blockRect = blockDom.getBoundingClientRect();
    const minY = blockRect.top + 1;
    const maxY = blockRect.bottom - 1;
    const viewportY = Math.min(Math.max(editorRect.top + breakY, minY), maxY);
    const viewportX = Math.min(blockRect.left + 8, blockRect.right - 2);
    const coords = view.posAtCoords({
        left: viewportX,
        top: viewportY,
    });

    if (!coords) {
        return Math.min(blockPos + blockNode.nodeSize - 1, blockPos + 1);
    }

    const minPos = blockPos + 1;
    const maxPos = blockPos + blockNode.nodeSize - 1;

    const rawPos = Math.min(Math.max(coords.pos, minPos), maxPos);

    return resolveWordBoundaryPos(blockNode, blockPos, rawPos);
};
