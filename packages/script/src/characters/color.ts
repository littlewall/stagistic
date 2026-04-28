export const normalizeCharacterColorHex = (value: string | null | undefined): string | null => {
    if (!value) {
        return null;
    }

    const trimmed = value.trim();

    if ((/^#[\da-f]{6}$/iu).test(trimmed)) {
        return trimmed.toUpperCase();
    }

    const shortHexMatch = trimmed.match(/^#([\da-f])([\da-f])([\da-f])$/iu);

    if (!shortHexMatch) {
        return null;
    }

    return `#${shortHexMatch[1]}${shortHexMatch[1]}${shortHexMatch[2]}${shortHexMatch[2]}${shortHexMatch[3]}${shortHexMatch[3]}`
        .toUpperCase();
};
