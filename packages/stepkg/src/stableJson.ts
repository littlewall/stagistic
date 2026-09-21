const normalizeJson = (value: unknown): unknown => {
    if (Array.isArray(value)) {
        return value.map(normalizeJson);
    }

    if (value !== null && typeof value === 'object') {
        return Object.fromEntries(
            Object.entries(value)
                .filter(([, field]) => field !== undefined)
                .sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0))
                .map(([key, field]) => [key, normalizeJson(field)]),
        );
    }

    return value;
};

export const stableJsonStringify = (value: unknown): string => JSON.stringify(normalizeJson(value));

export const stableJsonBytes = (value: unknown): Uint8Array => new TextEncoder().encode(stableJsonStringify(value));
