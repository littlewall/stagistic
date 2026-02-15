export const collapseWhitespace = (value: string) => value
    .replace(/\s+/g, ' ')
    .trim();

export const trimOrFallback = (value: string, fallback: string) => {
    const trimmed = value.trim();

    if (trimmed.length > 0) {
        return trimmed;
    }

    return fallback;
};

export const splitTrailingParentheticalSuffix = (value: string) => {
    const trimmed = value.trim();
    const suffixMatch = trimmed.match(/\s*(\([^()]*\)\s*)+$/);

    if (!suffixMatch) {
        return {
            base: trimmed,
            suffix: '',
        };
    }

    const suffix = suffixMatch[0].trim();
    const base = trimmed.slice(0, trimmed.length - suffixMatch[0].length).trim();

    return {
        base,
        suffix,
    };
};
