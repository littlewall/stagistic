import type {Node as ProseMirrorNode} from '@tiptap/pm/model';
import type {EditorView} from '@tiptap/pm/view';

import {
    type BlockLine,
    type BlockLineMap,
} from '../types';

/** tops within this distance are treated as the same visual line */
const LINE_TOP_TOLERANCE_PX = 1.5;

const findScrollContainer = (start: HTMLElement): HTMLElement | null => {
    let element: HTMLElement | null = start;

    while (element) {
        const {overflowY} = window.getComputedStyle(element);
        const scrolls = overflowY === 'auto' || overflowY === 'scroll' || overflowY === 'overlay';

        if (scrolls && element.scrollHeight > element.clientHeight) {
            return element;
        }

        element = element.parentElement;
    }

    return null;
};

/*
 * Enumerates the visual lines of a block from geometry that is clean of
 * pagination spacers: existing inline-break spacers force a wrap at the old
 * break position, which would otherwise masquerade as a genuine line
 * boundary and perpetuate a bad break. All reads happen synchronously while
 * the spacers are hidden, so no intermediate state is ever painted.
 */
export const buildLineMap = (
    view: EditorView,
    blockPos: number,
    blockNode: ProseMirrorNode,
    blockDom: HTMLElement,
): BlockLineMap => {
    const spacers = Array.from(
        blockDom.querySelectorAll<HTMLElement>('[data-pagination-inline-break]'),
    );
    const savedDisplays = spacers.map(spacer => spacer.style.display);
    const scrollContainer = findScrollContainer(view.dom);
    const savedScrollTop = scrollContainer?.scrollTop ?? 0;
    const savedWindowScrollY = window.scrollY;

    spacers.forEach(spacer => {
        spacer.style.display = 'none';
    });

    try {
        const blockRect = blockDom.getBoundingClientRect();
        const from = blockPos + 1;
        const to = blockPos + blockNode.nodeSize - 1;

        /*
         * Top of the character AT a position, probed as "the thing before
         * pos + 1". Probing forward (side 1) would resolve to a widget when
         * a previous break sits exactly at the probed position — and the
         * widget is display:none right now, so its rect is degenerate and
         * shifts the detected boundary by one character.
         */
        const charTopAt = (pos: number) => view.coordsAtPos(pos + 1, -1).top;

        if (to <= from) {
            return {
                lines: [
                    {
                        startPos: from,
                        topRel: 0,
                    },
                ],
                cleanHeight: blockRect.height,
            };
        }

        const lastChar = to - 1;
        const lines: BlockLine[] = [];
        let lineStart = from;
        let lineTop = charTopAt(from);

        lines.push({
            startPos: lineStart,
            topRel: lineTop - blockRect.top,
        });

        while (lineStart < lastChar) {
            // smallest character position whose glyph sits below the current line
            let low = lineStart + 1;
            let high = lastChar;
            let nextStart: number | null = null;

            while (low <= high) {
                const mid = Math.floor((low + high) / 2);

                if (charTopAt(mid) > lineTop + LINE_TOP_TOLERANCE_PX) {
                    nextStart = mid;
                    high = mid - 1;
                } else {
                    low = mid + 1;
                }
            }

            if (nextStart === null) {
                break;
            }

            lineStart = nextStart;
            lineTop = charTopAt(nextStart);
            lines.push({
                startPos: lineStart,
                topRel: lineTop - blockRect.top,
            });
        }

        return {
            lines,
            cleanHeight: blockRect.height,
        };
    } finally {
        spacers.forEach((spacer, index) => {
            spacer.style.display = savedDisplays[index];
        });

        /*
         * Hiding spacers shrinks the document; the browser clamps scroll
         * offsets immediately and does not restore them on its own.
         */
        if (scrollContainer) {
            scrollContainer.scrollTop = savedScrollTop;
        }

        if (window.scrollY !== savedWindowScrollY) {
            window.scrollTo(window.scrollX, savedWindowScrollY);
        }
    }
};
