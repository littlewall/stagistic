import {compiledMigrations, compiledPgliteVersion} from './migrations.compiled';

/*
 * A generation is what must match for two builds to share one database: the
 * schema and the PGlite that reads it. Builds of one generation elect a single
 * leader, whatever their worker file is called.
 *
 * `migrationCount` orders generations. Migrations are never removed, so it only
 * grows, including when a merge adds a migration with an earlier timestamp,
 * which leaves the latest id unchanged. Equal counts fall back to the PGlite
 * version: a data directory written by a newer PGlite must not be opened by an
 * older one, and upgrades ship forward. Any remaining difference is two
 * unrelated branches on one origin, ordered by id only so that exactly one of
 * them yields.
 */
export interface DbGeneration {
    migrationCount: number,
    latestMigrationId: string,
    pgliteVersion: string,
}

export const currentDbGeneration: DbGeneration = {
    migrationCount: compiledMigrations.length,
    latestMigrationId: compiledMigrations.at(-1)?.id ?? '',
    pgliteVersion: compiledPgliteVersion,
};

export const compareDbGenerations = (left: DbGeneration, right: DbGeneration) => {
    return left.migrationCount - right.migrationCount
        || left.pgliteVersion.localeCompare(right.pgliteVersion, 'en', {numeric: true})
        || left.latestMigrationId.localeCompare(right.latestMigrationId, 'en');
};

// These names are read by other builds: keep them stable, a change makes every older build a stranger.
const ELECTION_LOCK_PREFIX = 'pglite-election-lock:';
const WORKER_ID_PREFIX = 'stagistic-db:';
const TAB_LOCK_PREFIX = 'stagistic-db-tab:';

export const formatDbGeneration = ({
    migrationCount,
    latestMigrationId,
    pgliteVersion,
}: DbGeneration) => `${migrationCount}/${latestMigrationId}/${pgliteVersion}`;

export const parseDbGeneration = (value: unknown): DbGeneration | null => {
    const [
        migrationCount,
        latestMigrationId,
        pgliteVersion,
        ...rest
    ] = String(value).split('/');

    if (!(/^\d+$/u).test(migrationCount ?? '') || !latestMigrationId || !pgliteVersion || rest.length > 0) {
        return null;
    }

    return {
        migrationCount: Number(migrationCount),
        latestMigrationId,
        pgliteVersion,
    };
};

export const dbWorkerId = (generation: DbGeneration, dataDir: string) => {
    return `${WORKER_ID_PREFIX}${formatDbGeneration(generation)}:${dataDir}`;
};

export const dbElectionLockName = (generation: DbGeneration, dataDir: string) => {
    return `${ELECTION_LOCK_PREFIX}${dbWorkerId(generation, dataDir)}`;
};

/** Held in shared mode by every tab of a generation from before its worker exists until it has left. */
export const dbTabLockName = (generation: DbGeneration, dataDir: string) => {
    return `${TAB_LOCK_PREFIX}${formatDbGeneration(generation)}:${dataDir}`;
};

type LockRank = 'same' | 'older' | 'newer' | null;

const rankGeneration = (formatted: string, mine: DbGeneration): LockRank => {
    const generation = parseDbGeneration(formatted);

    if (!generation) {
        // A format this build cannot read came later. Older builds cannot ask a newer one to hand over.
        return 'newer';
    }

    const order = compareDbGenerations(generation, mine);

    if (order === 0) {
        return 'same';
    }

    return order < 0 ? 'older' : 'newer';
};

const rankLock = (name: string, dataDir: string, mine: DbGeneration): LockRank => {
    const suffix = `:${dataDir}`;

    if (!name.endsWith(suffix)) {
        return null;
    }

    if (name.startsWith(TAB_LOCK_PREFIX)) {
        return rankGeneration(name.slice(TAB_LOCK_PREFIX.length, -suffix.length), mine);
    }

    if (!name.startsWith(ELECTION_LOCK_PREFIX)) {
        return null;
    }

    const workerId = name.slice(ELECTION_LOCK_PREFIX.length);

    // Builds before generations used the worker URL as id; they are always older.
    return workerId.startsWith(WORKER_ID_PREFIX)
        ? rankGeneration(workerId.slice(WORKER_ID_PREFIX.length, -suffix.length), mine)
        : 'older';
};

export const inspectDbLocks = (
    {held = [], pending = []}: LockManagerSnapshot,
    {dataDir, generation}: {dataDir: string, generation: DbGeneration},
) => {
    const ranks = [...held, ...pending].map(({name = ''}) => rankLock(name, dataDir, generation));

    return {
        older: ranks.includes('older'),
        newer: ranks.includes('newer'),
    };
};
