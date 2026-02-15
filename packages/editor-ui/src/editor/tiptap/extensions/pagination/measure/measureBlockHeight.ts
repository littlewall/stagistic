import {
    type EditorView,
} from '@tiptap/pm/view';

export const measureBlockHeight = (
    view: EditorView,
    pos: number,
    fallbackHeight: number,
    domOverride?: HTMLElement | null,
): {
    height: number,
    isFallback: boolean,
    hasInlineBreaks: boolean,
} => {
    const dom = domOverride ?? (view.nodeDOM(pos) as HTMLElement | null);

    if (!dom) {
        return {
            height: fallbackHeight,
            isFallback: true,
            hasInlineBreaks: false,
        };
    }

    let height = dom.offsetHeight;

    const inlineBreaks = dom.querySelectorAll('[data-pagination-inline-break]');
    const hasInlineBreaks = inlineBreaks.length > 0;

    if (hasInlineBreaks) {
        let inlineBreakHeight = 0;

        for (let i = 0; i < inlineBreaks.length; i += 1) {
            const inlineBreak = inlineBreaks[i] as HTMLElement;

            inlineBreakHeight += inlineBreak.offsetHeight || 0;
        }

        height = Math.max(0, height - inlineBreakHeight);
    }

    if (height > 0) {
        return {
            height,
            isFallback: false,
            hasInlineBreaks,
        };
    }

    return {
        height: fallbackHeight,
        isFallback: true,
        hasInlineBreaks,
    };
};
