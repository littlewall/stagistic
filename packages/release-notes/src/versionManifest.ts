import {isReleaseNumber} from './version';

/*
 * `version.json`, emitted next to the build. A running tab fetches it to learn
 * whether a newer Release is deployed. The host answers a missing file with an
 * HTML page, so everything read from it is validated.
 */
export interface VersionManifest {
    /** The Release number the build was made as. */
    release: string,
    /** The database generation the build needs (`migrationCount/latestMigrationId/pgliteVersion`). */
    dbGeneration: string,
}

const DB_GENERATION = /^\d+\/[^/]+\/[^/]+$/;

/** The manifest in `text`, or null for anything else (HTML, wrong shape, bad values). */
export const parseVersionManifest = (text: string): VersionManifest | null => {
    let value: unknown;

    try {
        value = JSON.parse(text);
    } catch {
        return null;
    }

    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
        return null;
    }

    const {release, dbGeneration} = value as Record<string, unknown>;

    if (typeof release !== 'string' || !isReleaseNumber(release)) {
        return null;
    }

    if (typeof dbGeneration !== 'string' || !DB_GENERATION.test(dbGeneration)) {
        return null;
    }

    return {release, dbGeneration};
};
