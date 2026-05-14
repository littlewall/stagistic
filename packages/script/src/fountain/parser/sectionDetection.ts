export type DetectedSectionMarker =
    | {
        kind: 'act',
        name: string,
        rawLine: string,
    }
    | {
        kind: 'unknown-section',
        depth: 1 | 2,
        rawLine: string,
    };

export const detectSectionMarker = (
    line: string,
): DetectedSectionMarker | null => {
    const trimmed = line.trim();

    if (!trimmed.startsWith('#')) {
        return null;
    }

    const match = (/^(#{1,2})\s*(.+?)\s*$/).exec(trimmed);

    if (!match) {
        return null;
    }

    const depth = match[1].length as 1 | 2;
    const body = match[2].trim();

    if (depth === 1) {
        return {
            kind: 'act',
            name: body,
            rawLine: line,
        };
    }

    return {
        kind: 'unknown-section',
        depth,
        rawLine: line,
    };
};

export const buildActSectionLine = (name: string) => {
    return `# ${name.trim()}`;
};
