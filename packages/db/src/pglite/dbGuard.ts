import {StartFailureError} from '@stagistic/shared';

import {
    compareDbGenerations,
    dbElectionLockName,
    type DbGeneration,
    dbTabLockName,
    dbWorkerId,
    formatDbGeneration,
    inspectDbLocks,
    parseDbGeneration,
} from './dbGeneration';

/*
 * Keeps two generations off one database. Two PGlite leaders over the same
 * IndexedDB do not fail: each flush overwrites the other's files, and a reopen
 * silently loses one side's migration and rows.
 *
 * A tab opens the database only when no other generation has a lock on it, held
 * or pending: every tab of an old generation has to go, because its followers
 * queue for leadership and would open the old schema after the leader left.
 *
 * The check and taking the tab lock happen under one fixed lock, so two starting
 * tabs cannot both pass. Builds that know generations take that lock; today's
 * production build does not, so one started in the moment after the check cannot
 * be stopped. It would have to load an old page while a new one is opening.
 *
 * Only a newer tab asks, and only an older tab obeys: a tab that finds a newer
 * generation stops with a reload prompt, which keeps tabs from taking the
 * database back and forth.
 */
export type DbGuardWait = 'waiting-for-older-version' | 'blocked-by-older-version';

interface DbGuardOptions {
    dataDir: string,
    generation: DbGeneration,
    /** How long an older tab gets to hand over before the writer is told about it. */
    handoverTimeoutMs?: number,
}

const POLL_MS = 250;
const DEFAULT_HANDOVER_TIMEOUT_MS = 10_000;
const HANDOVER_REQUEST = 'stagistic-db-handover-request';

export const sleep = (ms: number) => new Promise<void>(resolve => {
    setTimeout(resolve, ms);
});

const waitUntil = async (isDone: (locks: LockManagerSnapshot) => boolean) => {
    while (!isDone(await navigator.locks.query())) {
        await sleep(POLL_MS);
    }
};

export const createDbGuard = ({
    dataDir,
    generation,
    handoverTimeoutMs = DEFAULT_HANDOVER_TIMEOUT_MS,
}: DbGuardOptions) => {
    const coordinationLockName = `stagistic-db-guard:${dataDir}`;
    const channelName = `stagistic-db-handover:${dataDir}`;
    const tabLockName = dbTabLockName(generation, dataDir);
    const electionLockName = dbElectionLockName(generation, dataDir);
    let releaseTabLock: (() => void) | null = null;

    const holdTabLock = () => new Promise<void>(resolve => {
        void navigator.locks.request(tabLockName, {mode: 'shared'}, () => new Promise<void>(release => {
            releaseTabLock = release;
            resolve();
        }));
    });

    const tryEnter = () => navigator.locks.request(coordinationLockName, {ifAvailable: true}, async lock => {
        if (!lock) {
            return 'busy' as const;
        }

        const {older, newer} = inspectDbLocks(await navigator.locks.query(), {dataDir, generation});

        if (newer) {
            return 'newer' as const;
        }

        if (older) {
            return 'older' as const;
        }

        await holdTabLock();

        return 'entered' as const;
    });

    return {
        workerId: dbWorkerId(generation, dataDir),

        /**
         * Resolves once this tab may create its worker. Waiting has no limit:
         * a tab that does not answer stays in charge of its data until it goes.
         */
        enter: async (onWait: (wait: DbGuardWait) => void) => {
            const startedAt = Date.now();
            const channel = new BroadcastChannel(channelName);

            try {
                for (;;) {
                    const outcome = await tryEnter();

                    if (outcome === 'entered') {
                        return;
                    }

                    if (outcome === 'newer') {
                        throw new StartFailureError(
                            'database-newer-than-app',
                            'A newer version of Stagistic is using your scripts in another tab or window.',
                        );
                    }

                    const isOverdue = Date.now() - startedAt >= handoverTimeoutMs;

                    if (outcome === 'older') {
                        // Sent again on every round: an older tab may start listening after the first one.
                        channel.postMessage({type: HANDOVER_REQUEST, generation: formatDbGeneration(generation)});
                    }

                    if (isOverdue) {
                        onWait('blocked-by-older-version');
                    } else if (outcome === 'older') {
                        onWait('waiting-for-older-version');
                    }

                    await sleep(POLL_MS);
                }
            } finally {
                channel.close();
            }
        },

        leave: () => {
            releaseTabLock?.();
            releaseTabLock = null;
        },

        /** Calls back when a newer generation needs the database; the returned function stops listening. */
        onHandoverRequest: (onRequest: () => void) => {
            const channel = new BroadcastChannel(channelName);

            channel.addEventListener('message', ({data}: MessageEvent<{type?: unknown, generation?: unknown}>) => {
                const requester = data.type === HANDOVER_REQUEST ? parseDbGeneration(data.generation) : null;

                if (requester && compareDbGenerations(requester, generation) > 0) {
                    onRequest();
                }
            });

            return () => channel.close();
        },

        /** Whether a tab of this generation is the leader. */
        hasLeader: async () => {
            const {held = []} = await navigator.locks.query();

            return held.some(({name}) => name === electionLockName);
        },

        /** Resolves when no tab of this generation holds the database for saving any more. */
        waitForOtherTabs: () => waitUntil(({held = [], pending = []}) => {
            return ![...held, ...pending].some(({name}) => name === tabLockName);
        }),

        /** Resolves when no follower is queued for leadership any more. */
        waitForFollowers: () => waitUntil(({pending = []}) => !pending.some(({name}) => name === electionLockName)),
    };
};

export type DbGuard = ReturnType<typeof createDbGuard>;
