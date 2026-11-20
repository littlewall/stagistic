import type {EditorView} from '@tiptap/pm/view';

import type {BlockPages} from '../contracts';
import type {PaginationState} from '../tiptap/extensions/pagination/types';
import {isScriptBlockNodeName} from '../tiptap/scriptCore';
import {createPageCursor} from './pageCursor';

export interface BlockPagesResult {
    byBlockId: Map<string, BlockPages>,
    /** Cheap identity key — unchanged fingerprint means the pages are unchanged. */
    fingerprint: string,
}

const EMPTY_RESULT: BlockPagesResult = {
    byBlockId: new Map(),
    fingerprint: '',
};

/** Page position as a float: the page's 0-based index plus how far `offset` is down it (0 for an empty span or unknown offset). */
const pagePosition = (page: PaginationState['pages'][number] | undefined, pageNumber: number, offset: number | undefined) => {
    if (!page || offset === undefined) return pageNumber - 1;

    const span = page.endOffset - page.startOffset;

    if (span <= 0) return pageNumber - 1;

    return pageNumber - 1 + Math.min(1, Math.max(0, (offset - page.startOffset) / span));
};

/*
 * Maps every script block to the 1-based pages it starts and ends on. A block
 * split across a page break starts where it begins and ends on the page that
 * holds its last position.
 */
export const buildBlockPages = (
    view: EditorView,
    pagination: PaginationState,
): BlockPagesResult => {
    const {pages} = pagination;

    if (pages.length === 0) {
        return EMPTY_RESULT;
    }

    const cursor = createPageCursor(pages);
    const offsetsByKey = new Map(pagination.blockOffsets.map(item => [item.key, item]));
    const byBlockId = new Map<string, BlockPages>();
    const fingerprintParts: string[] = [];

    view.state.doc.forEach((node, offset) => {
        if (!isScriptBlockNodeName(node.type.name)) {
            return;
        }

        const blockId = typeof node.attrs.id === 'string' ? node.attrs.id.trim() : '';

        if (!blockId) {
            return;
        }

        const startPage = cursor.startPage(offset);
        const endPage = cursor.endPage(offset + node.nodeSize - 1);

        const offsets = offsetsByKey.get(String(offset));
        const startAt = pagePosition(pages[startPage - 1], startPage, offsets?.startOffset);
        const endAt = pagePosition(pages[endPage - 1], endPage, offsets?.endOffset);

        const isHidden = offsets !== undefined && offsets.startOffset === offsets.endOffset;

        byBlockId.set(blockId, {
            startPage,
            endPage,
            startAt,
            endAt,
            isHidden,
        });
        fingerprintParts.push(`${blockId}:${startPage}:${endPage}:${startAt.toFixed(2)}:${endAt.toFixed(2)}:${isHidden ? 1 : 0}`);
    });

    if (byBlockId.size === 0) {
        return EMPTY_RESULT;
    }

    return {byBlockId, fingerprint: fingerprintParts.join('|')};
};
