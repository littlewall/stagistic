import {PLACEHOLDER_CHARACTER} from './constants';

export const isPlaceholderText = (value: string): boolean => {
    return value === PLACEHOLDER_CHARACTER || value === ' ';
};

export const isTagSpaceText = (value: string): boolean => {
    return (/^[\u00a0 ]+$/).test(value);
};

export const isPendingTagSpaceGap = (value: string): boolean => {
    return value === PLACEHOLDER_CHARACTER;
};

export const stripLeadingPlaceholder = (value: string): string => {
    const firstCharacter = value.slice(0, 1);

    return isPlaceholderText(firstCharacter) ? value.slice(1) : value;
};

export const normalizeTagTextSpaces = (value: string): string => {
    return value.replace(/\u00a0/g, ' ');
};

export const renderPendingTagText = (value: string): string => {
    return value.endsWith(' ')
        ? `${value.slice(0, -1)}${PLACEHOLDER_CHARACTER}`
        : value;
};

/**
 * Returns the name to commit when the compose query was ended by a double
 * space, or null otherwise. Handles plain spaces, NBSPs that browsers may use
 * for trailing inline whitespace, and the macOS "double-space -> '. '"
 * substitution (a trailing `". "`).
 */
export const resolveDoubleSpaceCommitName = (query: string): string | null => {
    if ((/[\u00a0 ]{2}$/).test(query)) {
        return query.trim() || null;
    }

    if ((/\S\.[\u00a0 ]$/).test(query)) {
        return query.replace(/\.[\u00a0 ]$/, '').trim() || null;
    }

    return null;
};
