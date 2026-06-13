import {isAllCaps} from '../sharedText';
import {
    ELEMENT_ACT,
    ELEMENT_ASIDE,
    ELEMENT_CHARACTER,
    ELEMENT_DIALOGUE,
    ELEMENT_LYRICS,
    ELEMENT_NOTE,
    ELEMENT_SCENE_HEADING,
    ELEMENT_STAGE_DIRECTIONS,
    type FountainElementType,
} from '../types';

const SCENE_HEADING_PATTERN = /^(INT\.|EXT\.|EST\.|INT\/EXT\.|I\/E\.)/;
const FORCED_SCENE_PATTERN = /^\.(?!\.)/;
const FORCED_CHARACTER_PATTERN = /^@/;
const TRANSITION_PATTERN = /(TO:|FADE OUT\.|FADE TO BLACK\.)$/;
const LEGACY_CENTERED_PATTERN = /^>.*<$/;
const NOTE_PATTERN = /^\[\[.*\]\]$/;
const SECTION_PATTERN = /^#{1,6}\s*\S/;
const ACT_PATTERN = /^#\s*ACT:\s*/i;

const stripCharacterExtensions = (line: string) => line.replace(/^@\s*/, '').replace(/\s*\(.*?\)\s*/g, ' ')
    .trim();
const isCharacterLine = (line: string) => {
    const stripped = stripCharacterExtensions(line);

    if (stripped.length === 0) {
        return false;
    }

    return isAllCaps(stripped);
};

export type ParseTypeDetectionOptions = {
    enableLegacyCapsLyricsHeuristic?: boolean,
    legacyCapsLyricsMode?: boolean,
};

const shouldCoerceLegacyCapsLyrics = (
    trimmed: string,
    detectedType: FountainElementType,
    options?: ParseTypeDetectionOptions,
): boolean => {
    if (!options?.enableLegacyCapsLyricsHeuristic || !options.legacyCapsLyricsMode) {
        return false;
    }

    if (trimmed.length === 0 || !isAllCaps(stripCharacterExtensions(trimmed))) {
        return false;
    }

    if (
        detectedType === ELEMENT_DIALOGUE
        || detectedType === ELEMENT_ASIDE
        || detectedType === ELEMENT_LYRICS
    ) {
        return false;
    }

    if (
        detectedType === ELEMENT_SCENE_HEADING
        || detectedType === ELEMENT_ACT
        || detectedType === ELEMENT_NOTE
    ) {
        return false;
    }

    return true;
};

export const hasHardLineBreak = (line: string) => (/[ \t]{2}$/).test(line);

export const stripHardLineBreak = (line: string) => line.replace(/[ \t]{2}$/, '');

export const detectType = (
    line: string,
    previousType: FountainElementType | null,
    options?: ParseTypeDetectionOptions,
): FountainElementType => {
    const trimmed = line.trim();
    let detectedType: FountainElementType;

    if (trimmed.startsWith('!')) {
        detectedType = ELEMENT_STAGE_DIRECTIONS;

        return shouldCoerceLegacyCapsLyrics(trimmed, detectedType, options)
            ? ELEMENT_LYRICS
            : detectedType;
    }

    if (trimmed.length === 0) {
        return ELEMENT_STAGE_DIRECTIONS;
    }

    if (FORCED_SCENE_PATTERN.test(trimmed)) {
        detectedType = ELEMENT_SCENE_HEADING;

        return shouldCoerceLegacyCapsLyrics(trimmed, detectedType, options)
            ? ELEMENT_LYRICS
            : detectedType;
    }

    if (SCENE_HEADING_PATTERN.test(trimmed)) {
        detectedType = ELEMENT_SCENE_HEADING;

        return shouldCoerceLegacyCapsLyrics(trimmed, detectedType, options)
            ? ELEMENT_LYRICS
            : detectedType;
    }

    if (ACT_PATTERN.test(trimmed)) {
        detectedType = ELEMENT_ACT;

        return shouldCoerceLegacyCapsLyrics(trimmed, detectedType, options)
            ? ELEMENT_LYRICS
            : detectedType;
    }

    /*
     * Fountain '#' headings (other than acts) have no dedicated block since
     * the Section block was removed — treat them as stage directions and
     * keep the raw line text. The parser rewrite (phase 2) will revisit.
     */
    if (SECTION_PATTERN.test(trimmed)) {
        return ELEMENT_STAGE_DIRECTIONS;
    }

    if (LEGACY_CENTERED_PATTERN.test(trimmed)) {
        detectedType = ELEMENT_STAGE_DIRECTIONS;

        return shouldCoerceLegacyCapsLyrics(trimmed, detectedType, options)
            ? ELEMENT_LYRICS
            : detectedType;
    }

    if (trimmed.startsWith('>')) {
        detectedType = ELEMENT_STAGE_DIRECTIONS;

        return shouldCoerceLegacyCapsLyrics(trimmed, detectedType, options)
            ? ELEMENT_LYRICS
            : detectedType;
    }

    if (TRANSITION_PATTERN.test(trimmed) && isAllCaps(trimmed)) {
        detectedType = ELEMENT_STAGE_DIRECTIONS;

        return shouldCoerceLegacyCapsLyrics(trimmed, detectedType, options)
            ? ELEMENT_LYRICS
            : detectedType;
    }

    if (trimmed.startsWith('(') && trimmed.endsWith(')')) {
        detectedType = ELEMENT_ASIDE;

        return shouldCoerceLegacyCapsLyrics(trimmed, detectedType, options)
            ? ELEMENT_LYRICS
            : detectedType;
    }

    if (trimmed.startsWith('~')) {
        detectedType = ELEMENT_LYRICS;

        return shouldCoerceLegacyCapsLyrics(trimmed, detectedType, options)
            ? ELEMENT_LYRICS
            : detectedType;
    }

    if (NOTE_PATTERN.test(trimmed)) {
        detectedType = ELEMENT_NOTE;

        return shouldCoerceLegacyCapsLyrics(trimmed, detectedType, options)
            ? ELEMENT_LYRICS
            : detectedType;
    }

    if (FORCED_CHARACTER_PATTERN.test(trimmed)) {
        detectedType = ELEMENT_CHARACTER;

        return shouldCoerceLegacyCapsLyrics(trimmed, detectedType, options)
            ? ELEMENT_LYRICS
            : detectedType;
    }

    if (isCharacterLine(trimmed)) {
        detectedType = ELEMENT_CHARACTER;

        return shouldCoerceLegacyCapsLyrics(trimmed, detectedType, options)
            ? ELEMENT_LYRICS
            : detectedType;
    }

    if (
        previousType === ELEMENT_CHARACTER
        || previousType === ELEMENT_ASIDE
        || previousType === ELEMENT_DIALOGUE
        || (options?.legacyCapsLyricsMode && previousType === ELEMENT_LYRICS)
    ) {
        detectedType = ELEMENT_DIALOGUE;

        return shouldCoerceLegacyCapsLyrics(trimmed, detectedType, options)
            ? ELEMENT_LYRICS
            : detectedType;
    }

    detectedType = ELEMENT_STAGE_DIRECTIONS;

    return shouldCoerceLegacyCapsLyrics(trimmed, detectedType, options)
        ? ELEMENT_LYRICS
        : detectedType;
};
