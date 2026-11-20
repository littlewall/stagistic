import {ReleaseNotesError} from './errors';

export const RELEASE_BUMPS = ['minor', 'patch'] as const;
export type ReleaseBump = (typeof RELEASE_BUMPS)[number];

/** The Release before the first `releases/<n>.md` file; `release-revert` may go back to it. */
export const INITIAL_RELEASE = '0.1.0';

const RELEASE_NUMBER = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/;

export const isReleaseNumber = (value: string): boolean => RELEASE_NUMBER.test(value);

const parts = (value: string): [number, number, number] => {
    const match = RELEASE_NUMBER.exec(value);

    if (!match) {
        throw new ReleaseNotesError(`Invalid Release number "${value}" (expected major.minor.patch, for example 0.2.0)`);
    }

    return [
        Number(match[1]),
        Number(match[2]),
        Number(match[3]),
    ];
};

/** Negative when `a` is older than `b`, positive when newer, zero when equal. */
export const compareReleaseNumbers = (a: string, b: string): number => {
    const left = parts(a);
    const right = parts(b);

    for (let index = 0; index < 3; index++) {
        const difference = left[index] - right[index];

        if (difference !== 0) {
            return difference;
        }
    }

    return 0;
};

export const bumpRelease = (current: string, bump: ReleaseBump): string => {
    const [
        major,
        minor,
        patch,
    ] = parts(current);

    return bump === 'minor' ? `${major}.${minor + 1}.0` : `${major}.${minor}.${patch + 1}`;
};

export const highestBump = (bumps: readonly ReleaseBump[]): ReleaseBump => (bumps.includes('minor') ? 'minor' : 'patch');

/** A patch Release (`0.2.1`); minor and major Releases end in `.0`. */
export const isPatchRelease = (value: string): boolean => parts(value)[2] > 0;

/**
 * Patch Releases are hidden outside git (app and marketing): they keep their
 * `releases/<n>.md` file, but no screen or feed lists them. This predicate is
 * the one place both the app and the marketing site filter them.
 */
export const isNonPatchRelease = (value: string): boolean => !isPatchRelease(value);
