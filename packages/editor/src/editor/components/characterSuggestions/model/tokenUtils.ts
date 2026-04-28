import {
    splitCharacterTokens,
    splitTrailingParentheticalSuffix,
} from '@stagistic/script';

export const splitBaseAndSuffix = (value: string) => splitTrailingParentheticalSuffix(value);

export const getActiveTokenIndex = (line: string, offset: number) => {
    const tokens = splitCharacterTokens(line);

    if (tokens.length === 0) {
        return -1;
    }

    const clampedOffset = Math.max(0, offset);

    for (let index = 0; index < tokens.length; index += 1) {
        const token = tokens[index];

        if (clampedOffset === token.end && index < tokens.length - 1) {
            return index + 1;
        }

        if (clampedOffset >= token.start && clampedOffset < token.end) {
            return index;
        }
    }

    return tokens.length - 1;
};
