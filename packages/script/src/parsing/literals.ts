import {StagisticParseError} from './types';

export interface QuotedLiteralResult {
    value: string,
    end: number,
}

export const readQuotedLiteral = (
    source: string,
    start: number,
    line: number,
): QuotedLiteralResult => {
    if (source[start] !== '"') {
        throw new StagisticParseError('Expected a quoted literal.', line);
    }

    let value = '';

    for (let index = start + 1; index < source.length; index += 1) {
        const character = source[index];

        if (character === '"') {
            return {value, end: index + 1};
        }

        if (character !== '\\') {
            value += character;
            continue;
        }

        const escaped = source[index + 1];

        if (escaped !== '"' && escaped !== '\\') {
            throw new StagisticParseError('Only \\" and \\\\ are valid quoted-literal escapes.', line);
        }

        value += escaped;
        index += 1;
    }

    throw new StagisticParseError('Unterminated quoted literal.', line);
};

export const splitOutsideQuotes = (source: string, separator: string): string[] => {
    const parts: string[] = [];
    let partStart = 0;
    let inQuotes = false;
    let escaped = false;

    for (let index = 0; index < source.length; index += 1) {
        const character = source[index];

        if (escaped) {
            escaped = false;
            continue;
        }

        if (character === '\\' && inQuotes) {
            escaped = true;
            continue;
        }

        if (character === '"') {
            inQuotes = !inQuotes;
            continue;
        }

        if (character === separator && !inQuotes) {
            parts.push(source.slice(partStart, index));
            partStart = index + 1;
        }
    }

    parts.push(source.slice(partStart));

    return parts;
};

export const decodeNameLiteral = (source: string, line: number): string => {
    const trimmed = source.trim().replace(/^@/u, '');

    if (!trimmed.startsWith('"')) {
        return trimmed;
    }

    const literal = readQuotedLiteral(trimmed, 0, line);

    if (literal.end !== trimmed.length) {
        throw new StagisticParseError('Unexpected text after a quoted character name.', line);
    }

    return literal.value;
};
