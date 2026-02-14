export type CharacterToken = {
    raw: string,
    value: string,
    start: number,
    end: number,
    valueStart: number,
    valueEnd: number,
};

type CharacterDelimiter = '+' | ' + ';

const collapseWhitespace = (value: string) => value.replace(/\s+/g, ' ').trim();

export const splitCharacterTokens = (line: string): CharacterToken[] => {
    const source = typeof line === 'string' ? line : '';
    const tokens: CharacterToken[] = [];
    let depth = 0;
    let segmentStart = 0;

    const pushToken = (segmentEnd: number) => {
        let valueStart = segmentStart;
        let valueEnd = segmentEnd;

        while (valueStart < valueEnd && (/\s/).test(source[valueStart])) {
            valueStart += 1;
        }

        while (valueEnd > valueStart && (/\s/).test(source[valueEnd - 1])) {
            valueEnd -= 1;
        }

        tokens.push({
            raw: source.slice(segmentStart, segmentEnd),
            value: source.slice(valueStart, valueEnd),
            start: segmentStart,
            end: segmentEnd,
            valueStart,
            valueEnd,
        });
    };

    for (let index = 0; index < source.length; index += 1) {
        const char = source[index];

        if (char === '(') {
            depth += 1;
            continue;
        }

        if (char === ')') {
            depth = Math.max(0, depth - 1);
            continue;
        }

        if (char === '+' && depth === 0) {
            pushToken(index);
            segmentStart = index + 1;
        }
    }

    pushToken(source.length);

    return tokens;
};

export const normalizeCharacterKey = (token: string): string => {
    const collapsed = collapseWhitespace(token);

    if (collapsed.length === 0) {
        return '';
    }

    let base = collapsed;

    while (true) {
        const next = base.replace(/\s*\([^()]*\)\s*$/, '').trimEnd();

        if (next === base) {
            break;
        }

        base = next;
    }

    return collapseWhitespace(base).toUpperCase();
};

export const normalizeCharacterDelimiters = (line: string, delimiter: CharacterDelimiter = ' + '): string => {
    const parts = splitCharacterTokens(line)
        .map(token => token.value)
        .filter(value => value.length > 0);

    return parts.join(delimiter);
};

export const normalizeCharacterEditorDelimiters = (line: string): string => {
    const parts = splitCharacterTokens(line).map(token => token.value);

    if (parts.length === 0) {
        return '';
    }

    let result = parts[0] ?? '';

    for (let index = 1; index < parts.length; index += 1) {
        result += '+';
        result += parts[index] ?? '';
    }

    return result;
};

export const extractCharacterKeys = (line: string): string[] => {
    const keys: string[] = [];
    const seen = new Set<string>();

    splitCharacterTokens(line).forEach(token => {
        const key = normalizeCharacterKey(token.value);

        if (key.length === 0 || seen.has(key)) {
            return;
        }

        seen.add(key);
        keys.push(key);
    });

    return keys;
};
