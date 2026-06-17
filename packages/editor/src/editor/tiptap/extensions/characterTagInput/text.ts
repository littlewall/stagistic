import {
    PENDING_TAG_SPACE_CHARACTER,
    PLACEHOLDER_CHARACTER,
} from './constants';

const isTagSpaceCharacter = (value: string): boolean => {
    return value === ' ' || value === PENDING_TAG_SPACE_CHARACTER;
};

const stripPlaceholderCharacters = (value: string): string => {
    return value.replaceAll(PLACEHOLDER_CHARACTER, '');
};

export const isPlaceholderText = (value: string): boolean => {
    return value === PLACEHOLDER_CHARACTER || value === ' ';
};

export const isTagSpaceText = (value: string): boolean => {
    return value.length > 0 && Array.from(value).every(isTagSpaceCharacter);
};

export const isPendingTagSpaceGap = (value: string): boolean => {
    return value === PENDING_TAG_SPACE_CHARACTER;
};

export const stripLeadingPlaceholder = (value: string): string => {
    const firstCharacter = value.slice(0, 1);

    return isPlaceholderText(firstCharacter) ? value.slice(1) : value;
};

export const normalizeTagTextSpaces = (value: string): string => {
    return value.replaceAll(PENDING_TAG_SPACE_CHARACTER, ' ');
};

export const normalizeVisibleTagText = (value: string): string => {
    return stripPlaceholderCharacters(normalizeTagTextSpaces(value));
};

export const normalizeCommittedTagName = (value: string): string => {
    return normalizeVisibleTagText(stripLeadingPlaceholder(value)).trim();
};

export const renderPendingTagText = (value: string): string => {
    return value.endsWith(' ')
        ? `${value.slice(0, -1)}${PENDING_TAG_SPACE_CHARACTER}`
        : value;
};

export const resolveDoubleSpaceCommitName = (query: string): string | null => {
    const lastCharacter = query.at(-1) ?? '';
    const secondLastCharacter = query.at(-2) ?? '';
    const thirdLastCharacter = query.at(-3) ?? '';

    if (isTagSpaceCharacter(lastCharacter) && isTagSpaceCharacter(secondLastCharacter)) {
        return query.trim() || null;
    }

    if (
        isTagSpaceCharacter(lastCharacter)
        && secondLastCharacter === '.'
        && thirdLastCharacter.length > 0
        && !(/\s/u).test(thirdLastCharacter)
    ) {
        return query.slice(0, -2).trim() || null;
    }

    return null;
};
