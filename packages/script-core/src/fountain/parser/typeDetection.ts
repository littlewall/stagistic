import {isAllCaps} from '../sharedText';
import {
    ELEMENT_ACT,
    ELEMENT_ACTION,
    ELEMENT_CHARACTER,
    ELEMENT_DIALOGUE,
    ELEMENT_DUAL_DIALOGUE,
    ELEMENT_DUAL_DIALOGUE_CHARACTER,
    ELEMENT_LYRICS,
    ELEMENT_NOTE,
    ELEMENT_PARENTHETICAL,
    ELEMENT_SCENE_HEADING,
    ELEMENT_TRANSITION,
    type FountainElementType,
} from '../types';

const SCENE_HEADING_PATTERN = /^(INT\.|EXT\.|EST\.|INT\/EXT\.|I\/E\.)/;
const TRANSITION_PATTERN = /(TO:|FADE OUT\.|FADE TO BLACK\.)$/;
const LEGACY_CENTERED_PATTERN = /^>.*<$/;
const NOTE_PATTERN = /^\[\[.*\]\]$/;
const ACT_PATTERN = /^#\s*ACT:\s*/i;

const isDualCharacterLine = (line: string) => (/\^\s*$/).test(line);
const stripCharacterExtensions = (line: string) => line.replace(/\^\s*$/, '').replace(/\s*\(.*?\)\s*/g, ' ').trim();
const isCharacterLine = (line: string) => {
    const stripped = stripCharacterExtensions(line);

    if (stripped.length === 0) {
        return false;
    }

    return isAllCaps(stripped);
};

export const hasHardLineBreak = (line: string) => (/[ \t]{2}$/).test(line);

export const stripHardLineBreak = (line: string) => line.replace(/[ \t]{2}$/, '');

export const detectType = (
    line: string,
    previousType: FountainElementType | null,
): FountainElementType => {
    const trimmed = line.trim();

    if (trimmed.startsWith('!')) {
        return ELEMENT_ACTION;
    }

    if (trimmed.length === 0) {
        return ELEMENT_ACTION;
    }

    if (SCENE_HEADING_PATTERN.test(trimmed)) {
        return ELEMENT_SCENE_HEADING;
    }

    if (ACT_PATTERN.test(trimmed)) {
        return ELEMENT_ACT;
    }

    if (LEGACY_CENTERED_PATTERN.test(trimmed)) {
        return ELEMENT_ACTION;
    }

    if (trimmed.startsWith('>')) {
        return ELEMENT_TRANSITION;
    }

    if (TRANSITION_PATTERN.test(trimmed) && isAllCaps(trimmed)) {
        return ELEMENT_TRANSITION;
    }

    if (trimmed.startsWith('(') && trimmed.endsWith(')')) {
        return ELEMENT_PARENTHETICAL;
    }

    if (trimmed.startsWith('~')) {
        return ELEMENT_LYRICS;
    }

    if (NOTE_PATTERN.test(trimmed)) {
        return ELEMENT_NOTE;
    }

    if (isDualCharacterLine(trimmed)) {
        return ELEMENT_DUAL_DIALOGUE_CHARACTER;
    }

    if (isCharacterLine(trimmed)) {
        return ELEMENT_CHARACTER;
    }

    if (
        previousType === ELEMENT_CHARACTER
        || previousType === ELEMENT_DUAL_DIALOGUE_CHARACTER
        || previousType === ELEMENT_PARENTHETICAL
        || previousType === ELEMENT_DIALOGUE
        || previousType === ELEMENT_DUAL_DIALOGUE
    ) {
        return ELEMENT_DIALOGUE;
    }

    return ELEMENT_ACTION;
};
