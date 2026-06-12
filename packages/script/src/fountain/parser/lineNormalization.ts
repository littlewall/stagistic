import {normalizeCharacterEditorDelimiters} from '../characterNames';
import {uppercaseOutsideParentheses} from '../sharedText';
import {
    ELEMENT_ACT,
    ELEMENT_ACTION,
    ELEMENT_CHARACTER,
    ELEMENT_LYRICS,
    ELEMENT_NOTE,
    ELEMENT_PARENTHETICAL,
    ELEMENT_SCENE_HEADING,
    ELEMENT_TRANSITION,
    type FountainElementType,
} from '../types';

const LEGACY_CENTERED_PATTERN = /^>.*<$/;

export const normalizeParsedLineText = (type: FountainElementType, line: string) => {
    let text = type === ELEMENT_LYRICS ? line.trim().replace(/^~\s?/, '') : line;

    if (type === ELEMENT_ACTION) {
        text = text.replace(/^\s*!\s*/, '');

        if (LEGACY_CENTERED_PATTERN.test(text.trim())) {
            text = text.trim().replace(/^>/, '').replace(/<$/, '')
                .trim();
        }
    }

    if (type === ELEMENT_ACT) {
        text = text.trim()
            .replace(/^#\s*/i, '')
            .replace(/^ACT:\s*/i, '')
            .trim();
    }

    if (type === ELEMENT_PARENTHETICAL) {
        text = text.trim().replace(/^\(/, '').replace(/\)$/, '')
            .trim();
    }

    if (type === ELEMENT_CHARACTER) {
        text = text.trim().replace(/^@\s*/, '');
        text = uppercaseOutsideParentheses(text);
        text = normalizeCharacterEditorDelimiters(text);
    }

    if (type === ELEMENT_SCENE_HEADING) {
        text = text.trim().replace(/^\.\s*/, '').trim();
    }

    if (type === ELEMENT_TRANSITION) {
        text = text.trim().replace(/^>\s*/, '').trim()
            .toUpperCase();
    }

    if (type === ELEMENT_NOTE) {
        text = text.trim().replace(/^\[\[/, '').replace(/\]\]$/, '')
            .trim();
    }

    return text;
};
