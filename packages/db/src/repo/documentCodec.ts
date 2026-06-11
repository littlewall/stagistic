export const toMillis = (value?: number) => {
    if (typeof value === 'number') {
        return Math.round(value * 1000);
    }

    return null;
};

export const fromMillis = (value?: number | null) => {
    if (typeof value === 'number') {
        return value / 1000;
    }

    return undefined;
};

export const parseJson = (value: string): unknown => {
    try {
        return JSON.parse(value) as unknown;
    } catch {
        return null;
    }
};
