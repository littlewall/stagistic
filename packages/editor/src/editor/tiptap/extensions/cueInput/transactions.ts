import {
    createNodeId,
    CUE_ID_ATTR,
    CUE_KIND_ATTR,
    CUE_MODE_ATTR,
    CUE_OUT_NODE_NAME,
    CUE_START_NODE_NAME,
    CUE_TITLE_ATTR,
} from '@stagistic/script';
import {
    type EditorState,
    TextSelection,
    type Transaction,
} from '@tiptap/pm/state';

import type {ActiveScriptBlock} from '../../scriptCore';
import type {CueComposeState} from './composeState';
import {
    CUE_COMPOSE_CLOSE_META,
    CUE_COMPOSE_OPEN_META,
    CUE_COMPOSE_PLACEHOLDER,
    CUE_OUT_KEYWORD,
} from './constants';

export interface CueStartCommitOptions {
    cueId?: string,
    kind?: string | null,
    title?: string,
}

/**
 * `#` trigger: anchor a cue-title compose at the end of the stage-direction
 * block (the '#' itself is swallowed, not inserted).
 */
export const buildOpenCueCompose = (
    state: EditorState,
    block: ActiveScriptBlock,
): Transaction => {
    const blockEnd = block.to;
    const tr = state.tr.insertText(CUE_COMPOSE_PLACEHOLDER, blockEnd);

    tr.setSelection(TextSelection.create(tr.doc, blockEnd + 1));
    tr.setMeta(CUE_COMPOSE_OPEN_META, blockEnd);

    return tr.scrollIntoView();
};

export const buildAbandonCue = (state: EditorState, compose: CueComposeState): Transaction => {
    return state.tr
        .delete(compose.from, compose.to)
        .setMeta(CUE_COMPOSE_CLOSE_META, true);
};

/**
 * Commit: replace the placeholder + typed title with a cue atom. Empty title →
 * abandon. The literal title "out" (case-insensitive) commits a `cueOut`;
 * anything else a `cueStart` carrying the title. The caret lands before the
 * pill so further prose stays ahead of the cue (§4.1).
 */
export const buildCommitCue = (
    state: EditorState,
    compose: CueComposeState,
    options: CueStartCommitOptions = {},
): Transaction => {
    const title = (options.title ?? compose.query).trim();

    if (title.length === 0) {
        return buildAbandonCue(state, compose);
    }

    const shouldCommitOut = options.cueId === undefined
        && options.title === undefined
        && title.toLowerCase() === CUE_OUT_KEYWORD;
    const node = shouldCommitOut
        ? state.schema.nodes[CUE_OUT_NODE_NAME].create()
        : state.schema.nodes[CUE_START_NODE_NAME].create({
            [CUE_ID_ATTR]: options.cueId ?? createNodeId(),
            [CUE_MODE_ATTR]: 'open',
            [CUE_TITLE_ATTR]: title,
            [CUE_KIND_ATTR]: options.kind ?? null,
        });
    const tr = state.tr.replaceWith(compose.from, compose.to, node);

    return tr
        .setSelection(TextSelection.create(tr.doc, compose.from))
        .setMeta(CUE_COMPOSE_CLOSE_META, true)
        .scrollIntoView();
};
