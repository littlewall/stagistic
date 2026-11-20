import type {EditorView} from '@tiptap/pm/view';

import type {ScenePlacement} from '../contracts';
import type {PaginationState} from '../tiptap/extensions/pagination/types';
import {
    isScriptBlockNodeName,
    normalizeBlockNodeType,
} from '../tiptap/scriptCore';
import {createPageCursor} from './pageCursor';

export interface ScenePlacementResult {
    byBlockId: Map<string, ScenePlacement>,
    /** Cheap identity key — unchanged fingerprint means the rendered numbers are unchanged. */
    fingerprint: string,
}

const EMPTY_RESULT: ScenePlacementResult = {
    byBlockId: new Map(),
    fingerprint: '',
};

/*
 * Maps each scene heading to the 1-based page it starts on.
 *
 * Positions come from the last measured pagination pass, so between a keystroke
 * and the next recalc the numbers can lag by one layout — acceptable for a
 * sidebar readout.
 */
export const buildScenePlacements = (
    view: EditorView,
    pagination: PaginationState,
): ScenePlacementResult => {
    const {pages} = pagination;

    if (pages.length === 0) {
        return EMPTY_RESULT;
    }

    const cursor = createPageCursor(pages);
    const byBlockId = new Map<string, ScenePlacement>();
    const fingerprintParts: string[] = [];

    view.state.doc.forEach((node, offset) => {
        if (!isScriptBlockNodeName(node.type.name)) {
            return;
        }

        if (normalizeBlockNodeType(node.attrs.blockType) !== 'scene') {
            return;
        }

        const blockId = typeof node.attrs.id === 'string' ? node.attrs.id.trim() : '';

        if (!blockId) {
            return;
        }

        const startPage = cursor.startPage(offset);

        byBlockId.set(blockId, {startPage});
        fingerprintParts.push(`${blockId}:${startPage}`);
    });

    if (byBlockId.size === 0) {
        return EMPTY_RESULT;
    }

    return {byBlockId, fingerprint: fingerprintParts.join('|')};
};
