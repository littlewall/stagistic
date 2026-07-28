import {
    type EditorState,
    PluginKey,
} from '@tiptap/pm/state';

import {getActiveScriptBlockFromState} from '../../scriptCore';
import {
    MUSIC_COMPOSE_PLACEHOLDER,
    STAGE_DIRECTION_NODE_TYPE,
} from './constants';

export interface MusicComposeRawState {
    from: number,
}

export interface MusicComposeState {
    from: number,
    to: number,
    query: string,
}

export const musicComposeKey = new PluginKey<MusicComposeRawState | null>('music-compose');

const stripPlaceholder = (text: string) => text.split(MUSIC_COMPOSE_PLACEHOLDER).join('');

export const getMusicComposeFromState = (state: EditorState): MusicComposeState | null => {
    const raw = musicComposeKey.getState(state);

    if (!raw) {
        return null;
    }

    const {selection} = state;

    if (!selection.empty) {
        return null;
    }

    const to = selection.from;

    if (to < raw.from) {
        return null;
    }

    const text = state.doc.textBetween(raw.from, to, '\n', '\n');

    return {
        from: raw.from,
        to,
        query: stripPlaceholder(text),
    };
};

export const isMusicComposeValid = (state: EditorState, from: number): boolean => {
    const {selection} = state;

    if (!selection.empty || selection.from < from) {
        return false;
    }

    const block = getActiveScriptBlockFromState(state);

    return Boolean(
        block
        && block.blockType === STAGE_DIRECTION_NODE_TYPE
        && from >= block.from
        && from <= block.to,
    );
};
