import {normalizeCharacterEditorDelimiters} from '../characterNames';
import {uppercaseOutsideParentheses} from '../sharedText';
import {
    ELEMENT_ACT,
    ELEMENT_ASIDE,
    ELEMENT_CHARACTER,
    ELEMENT_LYRICS,
    ELEMENT_NOTE,
    ELEMENT_SCENE_HEADING,
    ELEMENT_STAGE_DIRECTIONS,
    type FountainElementType,
} from '../types';

export const normalizeParsedLineText = (type: FountainElementType, line: string) => {
    let text = type === ELEMENT_LYRICS ? line.trim().replace(/^~\s?/, '') : line;

    if (type === ELEMENT_STAGE_DIRECTIONS) {
        text = text.replace(/^\s*!\s*/, '');

        const trimmedText = text.trim();

        if (trimmedText.startsWith('>')) {
            text = trimmedText.replace(/^>\s*/, '').replace(/<$/, '')
                .trim();
        }
    }

    if (type === ELEMENT_ACT) {
        text = text.trim()
            .replace(/^#\s*/i, '')
            .replace(/^ACT:\s*/i, '')
            .trim();
    }

    if (type === ELEMENT_ASIDE) {
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

    if (type === ELEMENT_NOTE) {
        text = text.trim().replace(/^\[\[/, '').replace(/\]\]$/, '')
            .trim();
    }

    return text;
};
