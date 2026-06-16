import {CHARACTER_TAG_MARK_NAME} from '@stagistic/script';
import type {EditorState} from '@tiptap/pm/state';
import {PluginKey} from '@tiptap/pm/state';

import {getActiveScriptBlockFromState} from '../../scriptCore';
import {STAGE_DIRECTION_BLOCK_TYPE} from './constants';
import {
    charAt,
    isCharacterTagMarkedAt,
} from './markRanges';
import {stripLeadingPlaceholder} from './text';
import type {
    CharacterTagComposeRawState,
    CharacterTagComposeState,
} from './types';

export const characterTagComposeKey = new PluginKey<CharacterTagComposeRawState | null>('character-tag-compose');

export const getCharacterTagComposeFromState = (state: EditorState): CharacterTagComposeState | null => {
    const raw = characterTagComposeKey.getState(state);

    if (!raw) {
        return null;
    }

    const {selection} = state;

    if (!selection.empty) {
        return null;
    }

    const {from} = raw;
    const to = selection.from;

    if (to <= from) {
        return null;
    }

    const text = state.doc.textBetween(from, to, '\n', '\n');
    const query = stripLeadingPlaceholder(text);

    return {
        from, to, query,
    };
};

export const isComposeValid = (state: EditorState, from: number): boolean => {
    const markType = state.schema.marks[CHARACTER_TAG_MARK_NAME];

    if (!markType || !isCharacterTagMarkedAt(state, from, markType)) {
        return false;
    }

    const block = getActiveScriptBlockFromState(state);

    if (!block || block.blockType !== STAGE_DIRECTION_BLOCK_TYPE || from < block.from) {
        return false;
    }

    const {selection} = state;

    return selection.empty && selection.from > from && selection.from <= block.to;
};

export const detectCompose = (state: EditorState): CharacterTagComposeRawState | null => {
    const {selection} = state;

    if (!selection.empty) {
        return null;
    }

    const block = getActiveScriptBlockFromState(state);

    if (!block || block.blockType !== STAGE_DIRECTION_BLOCK_TYPE) {
        return null;
    }

    const from = selection.from - 1;
    const markType = state.schema.marks[CHARACTER_TAG_MARK_NAME];

    if (!markType || from < block.from || !isCharacterTagMarkedAt(state, from, markType)) {
        return null;
    }

    const charBefore = from > block.from ? charAt(state, from - 1) : '';

    if (charBefore.length > 0 && !(/\s/).test(charBefore)) {
        return null;
    }

    return {from};
};

export const canOpenCompose = (state: EditorState, from: number): boolean => {
    if (!state.selection.empty) {
        return false;
    }

    const block = getActiveScriptBlockFromState(state);

    if (!block || block.blockType !== STAGE_DIRECTION_BLOCK_TYPE || from < block.from) {
        return false;
    }

    const charBefore = from > block.from ? charAt(state, from - 1) : '';

    return charBefore.length === 0 || (/\s/).test(charBefore);
};
