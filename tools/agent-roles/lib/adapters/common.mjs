const PATTERNS = [
    {cause: 'not logged in', pattern: /not logged in|authenticat|unauthori[sz]ed|\b401\b|login required/i},
    {cause: 'quota', pattern: /quota|rate.?limit|\b429\b|usage limit/i},
];

/** Cause of an unavailable provider found in CLI output, or null. */
export const matchUnavailable = text => PATTERNS.find(({pattern}) => pattern.test(text ?? ''))?.cause ?? null;

export const classify = ({
    spawnError,
    text,
    fixes,
}) => {
    if (spawnError?.code === 'ENOENT') {
        return {
            kind: 'unavailable',
            cause: 'not installed',
            fix: fixes.install,
        };
    }

    const cause = matchUnavailable(text);

    if (cause) {
        return {
            kind: 'unavailable',
            cause,
            fix: fixes[cause],
        };
    }

    return {kind: 'failed', cause: text?.trim().split('\n').at(-1) ?? 'unknown error'};
};
