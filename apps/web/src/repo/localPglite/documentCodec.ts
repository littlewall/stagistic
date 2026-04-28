import type {ScriptDocument} from '@stagistic/script';

export const serializeDocument = (value: ScriptDocument) => JSON.stringify(value);

export const parseDocument = (value: string): ScriptDocument => JSON.parse(value) as ScriptDocument;

// Fast deterministic hash for redundant write detection in local latest-content persistence.
export const computeContentHash = (value: string) => {
    let hash = 2166136261;

    for (let index = 0; index < value.length; index += 1) {
        hash ^= value.charCodeAt(index);
        hash = Math.imul(hash, 16777619);
    }

    return (hash >>> 0).toString(16).padStart(8, '0');
};

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
