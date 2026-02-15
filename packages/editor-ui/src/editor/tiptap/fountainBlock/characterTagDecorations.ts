import {
    Plugin,
    PluginKey,
} from '@tiptap/pm/state';

import {buildDecorations} from './characterTags/buildDecorations';
import {cleanupCharacterDelimiters} from './characterTags/cleanup';

const characterTagDecorationsKey = new PluginKey('fountain-character-tag-decorations');

export const createCharacterTagDecorationsPlugin = (characterColorSaturation?: number) => new Plugin({
    key: characterTagDecorationsKey,
    appendTransaction: (transactions, oldState, newState) => cleanupCharacterDelimiters(transactions, oldState, newState),
    props: {
        decorations: state => buildDecorations(state.doc, characterColorSaturation),
    },
});
