import {
    createNodeId,
    MUSIC_ID_ATTR,
    MUSIC_KIND_ATTR,
    MUSIC_MODE_ATTR,
    MUSIC_OUT_NODE_NAME,
    MUSIC_START_NODE_NAME,
    MUSIC_TITLE_ATTR,
} from '@stagistic/script';
import {
    type EditorState,
    TextSelection,
    type Transaction,
} from '@tiptap/pm/state';

import type {ActiveScriptBlock} from '../../scriptCore';
import type {MusicComposeState} from './composeState';
import {
    MUSIC_COMPOSE_CLOSE_META,
    MUSIC_COMPOSE_OPEN_META,
    MUSIC_COMPOSE_PLACEHOLDER,
    MUSIC_OUT_KEYWORD,
} from './constants';

export interface MusicStartCommitOptions {
    musicId?: string,
    kind?: string | null,
    title?: string,
}

/**
 * `#` trigger: anchor a music-title compose at the end of the stage-direction
 * block (the '#' itself is swallowed, not inserted).
 */
export const buildOpenMusicCompose = (
    state: EditorState,
    block: ActiveScriptBlock,
): Transaction => {
    const blockEnd = block.to;
    const tr = state.tr.insertText(MUSIC_COMPOSE_PLACEHOLDER, blockEnd);

    tr.setSelection(TextSelection.create(tr.doc, blockEnd + 1));
    tr.setMeta(MUSIC_COMPOSE_OPEN_META, blockEnd);

    return tr.scrollIntoView();
};

export const buildAbandonMusic = (state: EditorState, compose: MusicComposeState): Transaction => {
    return state.tr
        .delete(compose.from, compose.to)
        .setMeta(MUSIC_COMPOSE_CLOSE_META, true);
};

/**
 * Commit: replace the placeholder + typed title with a music atom. Empty title →
 * abandon. The literal title "out" (case-insensitive) commits a `musicOut`;
 * anything else a `musicStart` carrying the title. The caret lands before the
 * pill so further prose stays ahead of the music (§4.1).
 */
export const buildCommitMusic = (
    state: EditorState,
    compose: MusicComposeState,
    options: MusicStartCommitOptions = {},
): Transaction => {
    const title = (options.title ?? compose.query).trim();

    if (title.length === 0) {
        return buildAbandonMusic(state, compose);
    }

    const shouldCommitOut = options.musicId === undefined
        && options.title === undefined
        && title.toLowerCase() === MUSIC_OUT_KEYWORD;
    const node = shouldCommitOut
        ? state.schema.nodes[MUSIC_OUT_NODE_NAME].create()
        : state.schema.nodes[MUSIC_START_NODE_NAME].create({
            [MUSIC_ID_ATTR]: options.musicId ?? createNodeId(),
            [MUSIC_MODE_ATTR]: 'open',
            [MUSIC_TITLE_ATTR]: title,
            [MUSIC_KIND_ATTR]: options.kind ?? null,
        });
    const tr = state.tr.replaceWith(compose.from, compose.to, node);

    return tr
        .setSelection(TextSelection.create(tr.doc, compose.from))
        .setMeta(MUSIC_COMPOSE_CLOSE_META, true)
        .scrollIntoView();
};
