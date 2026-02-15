import {normalizeCharacterEditorDelimiters} from '../characterNames';
import {uppercaseOutsideParentheses} from '../sharedText';
import {
    ELEMENT_ACTION,
    ELEMENT_CENTERED,
    ELEMENT_CHARACTER,
    ELEMENT_DUAL_DIALOGUE_CHARACTER,
    ELEMENT_LYRICS,
    ELEMENT_PARENTHETICAL,
    ELEMENT_TRANSITION,
    type FountainElementType,
} from '../types';

export const normalizeParsedLineText = (type: FountainElementType, line: string) => {
    let text = type === ELEMENT_LYRICS ? line.trim().replace(/^~\s?/, '') : line;

    if (type === ELEMENT_ACTION) {
        text = text.replace(/^\s*!\s*/, '');
    }

    if (type === ELEMENT_PARENTHETICAL) {
        text = text.trim().replace(/^\(/, '').replace(/\)$/, '')
            .trim();
    }

    if (type === ELEMENT_CENTERED) {
        text = text.trim().replace(/^>/, '').replace(/<$/, '')
            .trim();
    }

    if (type === ELEMENT_DUAL_DIALOGUE_CHARACTER) {
        text = text.trim().replace(/\^\s*$/, '').trim();
        text = uppercaseOutsideParentheses(text);
        text = normalizeCharacterEditorDelimiters(text);
    }

    if (type === ELEMENT_CHARACTER) {
        text = uppercaseOutsideParentheses(text);
        text = normalizeCharacterEditorDelimiters(text);
    }

    if (type === ELEMENT_TRANSITION) {
        text = text.trim().replace(/^>\s*/, '').trim()
            .toUpperCase();
    }

    return text;
};
