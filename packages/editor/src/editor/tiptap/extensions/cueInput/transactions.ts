import {
    createNodeId,
    CUE_ID_ATTR,
    CUE_KIND_ATTR,
    CUE_MODE_ATTR,
    CUE_START_NODE_NAME,
    CUE_TITLE_ATTR,
} from '@stagistic/script';
import {
    type EditorState,
    TextSelection,
    type Transaction,
} from '@tiptap/pm/state';

import type {ActiveScriptBlock} from '../../scriptCore';
import type {CharacterTagComposeState} from '../CharacterTagInputExtension';
import type {CueComposeState} from './composeState';
import {
    CUE_COMPOSE_CLOSE_META,
    CUE_COMPOSE_OPEN_META,
    CUE_COMPOSE_PLACEHOLDER,
} from './constants';

/**
 * Escalation `@` → `@@`: drop the character-tag placeholder, move to the end
 * of the block, and anchor a cue-title compose there.
 */
export const buildOpenCueCompose = (
    state: EditorState,
    characterTagCompose: CharacterTagComposeState,
    block: ActiveScriptBlock,
): Transaction => {
    const tr = state.tr.delete(characterTagCompose.from, characterTagCompose.to);
    const blockEnd = tr.mapping.map(block.to);

    tr.insertText(CUE_COMPOSE_PLACEHOLDER, blockEnd);
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
 * Commit: replace the placeholder + typed title with a `cueStart` whose title
 * attr holds the text. Empty title → abandon. The caret lands before the pill
 * so further prose stays ahead of the cue (§4.1).
 */
export const buildCommitCue = (state: EditorState, compose: CueComposeState): Transaction => {
    const title = compose.query.trim();

    if (title.length === 0) {
        return buildAbandonCue(state, compose);
    }

    const node = state.schema.nodes[CUE_START_NODE_NAME].create({
        [CUE_ID_ATTR]: createNodeId(),
        [CUE_MODE_ATTR]: 'open',
        [CUE_TITLE_ATTR]: title,
        [CUE_KIND_ATTR]: null,
    });
    const tr = state.tr.replaceWith(compose.from, compose.to, node);

    return tr
        .setSelection(TextSelection.create(tr.doc, compose.from))
        .setMeta(CUE_COMPOSE_CLOSE_META, true)
        .scrollIntoView();
};
