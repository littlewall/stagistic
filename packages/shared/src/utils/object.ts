export const isObjectRecord = (value: unknown): value is Record<string, unknown> => Boolean(value)
    && typeof value === 'object'
    && !Array.isArray(value);
