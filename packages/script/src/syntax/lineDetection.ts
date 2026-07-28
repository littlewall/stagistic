const QUOTED_NAME = '"(?:\\\\.|[^"\\\\])*"';
const BARE_NAME = '[^\\s./@]+';
const NAME = `(?:${QUOTED_NAME}|${BARE_NAME})`;
const QUOTED_CHARACTER_PATTERN = new RegExp(
    `^${QUOTED_NAME}(?:\\s*/\\s*@?${NAME})*(?:\\s+\\([^\\n)]*\\))?$`,
    'u',
);
const FORCED_CHARACTER_PATTERN = new RegExp(
    `^@${NAME}(?:\\s*/\\s*@?${NAME})*(?:\\s+\\([^\\n)]*\\))?$`,
    'u',
);

export const isUppercaseSyntaxLine = (value: string): boolean => {
    const trimmed = value.trim();

    if (!(/\p{L}/u).test(trimmed)) {
        return false;
    }

    return trimmed === trimmed.toLocaleUpperCase();
};

export const isForcedCharacterCueLine = (value: string): boolean => {
    return FORCED_CHARACTER_PATTERN.test(value.trim());
};

export const isQuotedCharacterCueLine = (value: string): boolean => {
    return QUOTED_CHARACTER_PATTERN.test(value.trim());
};

export const shouldForceStageDirection = (value: string): boolean => {
    const trimmed = value.trimStart();

    return trimmed.startsWith('!')
        || trimmed.startsWith('#')
        || (/^\[\[[\s\S]*\]\]$/u).test(trimmed)
        || isUppercaseSyntaxLine(trimmed)
        || isForcedCharacterCueLine(trimmed)
        || isQuotedCharacterCueLine(trimmed);
};
