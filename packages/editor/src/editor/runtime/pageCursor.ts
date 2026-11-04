import type {PaginationState} from '../tiptap/extensions/pagination/types';

export interface PageCursor {
    /** 1-based page a block starting at `pos` begins on (continuation pages of that very block are skipped). */
    startPage: (pos: number) => number,
    /** 1-based page of position `pos`. */
    endPage: (pos: number) => number,
}

/*
 * Forward-only page lookup. Document walks are ascending, so one pointer moves
 * through the pages once instead of rescanning them for every block.
 */
export const createPageCursor = (pages: PaginationState['pages']): PageCursor => {
    let index = 0;

    const advance = (pos: number, skipContinuationAtPos: boolean) => {
        while (index + 1 < pages.length) {
            const next = pages[index + 1];

            if (next.startPos > pos || (skipContinuationAtPos && next.continuesBlock && next.startPos === pos)) {
                break;
            }

            index += 1;
        }

        return index + 1;
    };

    return {
        startPage: pos => advance(pos, true),
        endPage: pos => advance(pos, false),
    };
};
