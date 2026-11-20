import {PGliteWorker} from '@electric-sql/pglite/worker';
import pgliteDataUrl from '@pglite-data?url';
import pgliteWasmUrl from '@pglite-wasm?url';
import {
    createPgliteBootstrap,
    type DbBootstrapUpdate,
    type DbGeneration,
} from '@stagistic/db/pglite';
import {
    afterEach,
    describe,
    expect,
    it,
    vi,
} from 'vite-plus/test';

/*
 * Two generations in one origin: each "tab" is a bootstrap with its own real
 * worker over the same IndexedDB. The generation override stands in for
 * two deployed builds; everything below it (locks, channel, workers) is real.
 */
const OLD: DbGeneration = {
    migrationCount: 100,
    latestMigrationId: '20261101000000_old',
    pgliteVersion: '0.3.15',
};
const NEW: DbGeneration = {
    migrationCount: 101,
    latestMigrationId: '20261102000000_new',
    pgliteVersion: '0.3.15',
};
const HANDOVER_TIMEOUT_MS = 400;
// A real worker has to start first, and the suite shares the machine; nothing here claims a start time.
const WORKER_START_POLL = {timeout: 10_000};

interface Tab {
    bootstrap: ReturnType<typeof createPgliteBootstrap>,
    updates: DbBootstrapUpdate[],
    started: Promise<void>,
    workers: Worker[],
    /** The tab disappears without saving, as when the browser closes it. */
    crash: () => void,
}

const cleanups: (() => void)[] = [];

const openTab = (dataDir: string, generation: DbGeneration, options: {handoverSaveTimeoutMs?: number} = {}): Tab => {
    const workers: Worker[] = [];
    const updates: DbBootstrapUpdate[] = [];
    const bootstrap = createPgliteBootstrap({
        fsBundleUrl: pgliteDataUrl,
        wasmUrl: pgliteWasmUrl,
        dataDir,
        generation,
        handoverTimeoutMs: HANDOVER_TIMEOUT_MS,
        ...options,
        workerFactory: () => {
            const worker = new Worker(new URL('./pglite.worker.ts', import.meta.url), {type: 'module'});

            workers.push(worker);

            return worker;
        },
    });
    const started = bootstrap.prepareLocalDbWithProgress(update => updates.push(update));

    // Assertions on `started` come later; a rejection must not count as unhandled in between.
    started.catch(() => {});

    const crash = () => {
        void bootstrap.close();
        workers.forEach(worker => worker.terminate());
    };

    cleanups.push(crash);

    return {
        bootstrap,
        updates,
        started,
        workers,
        crash,
    };
};

/** Holds a lock like a tab of a build that knows nothing about handover. */
const holdLock = (name: string) => {
    let release = () => {};
    const held = new Promise<void>(resolve => {
        void navigator.locks.request(name, () => new Promise<void>(done => {
            release = done;
            resolve();
        }));
    });

    cleanups.push(() => release());

    return held.then(() => () => release());
};

const legacyLockName = (dataDir: string) => {
    return `pglite-election-lock:https://app.stagistic.com/assets/pglite.worker-Ab12cd.js:${dataDir}`;
};

const newDataDir = () => `idb://stagistic-handover-${crypto.randomUUID()}`;

afterEach(() => {
    cleanups.splice(0).forEach(cleanup => cleanup());
    vi.restoreAllMocks();
});

const isBlocked = (tab: Tab) => tab.updates.at(-1)?.blocked?.kind === 'older-version-running';
const handoverStatus = (tab: Tab) => tab.bootstrap.handover.getState().status;

const insertRow = async (tab: Tab, id: string) => {
    const db = await tab.bootstrap.getLocalDb();

    await db.execute('CREATE TABLE IF NOT EXISTS handover_rows (id text PRIMARY KEY)');
    await db.execute(`INSERT INTO handover_rows (id) VALUES ('${id}')`);
};

const readRows = async (tab: Tab) => {
    const db = await tab.bootstrap.getLocalDb();
    const result = await db.execute<{id: string}>('SELECT id FROM handover_rows ORDER BY id');

    return result.rows.map(row => row.id);
};

const lockNames = async () => {
    const {held = [], pending = []} = await navigator.locks.query();

    return {
        held: held.map(lock => lock.name ?? ''),
        pending: pending.map(lock => lock.name ?? ''),
    };
};

const heldElectionLocks = async (dataDir: string) => {
    const {held} = await lockNames();

    return held.filter(name => name.startsWith('pglite-election-lock:') && name.endsWith(`:${dataDir}`));
};

const pause = (ms: number) => new Promise(resolve => {
    setTimeout(resolve, ms);
});

describe('a tab of a newer generation', () => {
    it('leaves the database closed while today\'s URL-based leader holds it, then starts on release', async () => {
        const dataDir = newDataDir();
        const releaseLegacy = await holdLock(legacyLockName(dataDir));
        const tab = openTab(dataDir, NEW);

        await expect.poll(() => isBlocked(tab)).toBe(true);
        expect(tab.workers).toHaveLength(0);

        releaseLegacy();
        await tab.started;

        expect(tab.workers).toHaveLength(1);
        expect(tab.updates.at(-1)?.blocked).toBeUndefined();

        const db = await tab.bootstrap.getLocalDb();

        await expect(db.execute('SELECT 1 AS one')).resolves.toMatchObject({rows: [{one: 1}]});
    });

    it('also waits for followers of today\'s build queued behind that leader', async () => {
        const dataDir = newDataDir();
        const releaseLeader = await holdLock(legacyLockName(dataDir));
        const follower = holdLock(legacyLockName(dataDir));
        const tab = openTab(dataDir, NEW);

        await expect.poll(() => isBlocked(tab)).toBe(true);
        releaseLeader();

        const releaseFollower = await follower;

        await pause(HANDOVER_TIMEOUT_MS);
        expect(tab.workers).toHaveLength(0);
        expect(isBlocked(tab)).toBe(true);

        releaseFollower();
        await tab.started;
        expect(tab.workers).toHaveLength(1);
    });

    it('stays blocked by a frozen tab that holds its lock and never answers, and starts when it goes', async () => {
        const dataDir = newDataDir();
        const frozenLeader = `pglite-election-lock:stagistic-db:100/20261101000000_old/0.3.15:${dataDir}`;
        const release = await holdLock(frozenLeader);
        const tab = openTab(dataDir, NEW);

        await expect.poll(() => isBlocked(tab)).toBe(true);
        await pause(HANDOVER_TIMEOUT_MS * 3);
        expect(tab.workers).toHaveLength(0);
        expect(isBlocked(tab)).toBe(true);

        release();
        await tab.started;
        expect(tab.workers).toHaveLength(1);
    });

    it('does not count waiting for an older tab as a stall', async () => {
        const dataDir = newDataDir();
        const release = await holdLock(legacyLockName(dataDir));
        const tab = openTab(dataDir, NEW);

        await expect.poll(() => isBlocked(tab)).toBe(true);
        expect(tab.updates.filter(update => update.label.includes('older version')).every(update => update.longRunning)).toBe(true);

        release();
        await tab.started;
    });

    it('ignores a private snapshot view and a database in another location', async () => {
        const dataDir = newDataDir();
        const releaseSnapshot = await holdLock('pglite-election-lock:stagistic-snapshot-view:0192-abc');
        const releaseMemory = await holdLock('pglite-election-lock:https://x.test/pglite.worker-a.js:memory://');
        const releaseOther = await holdLock(legacyLockName(newDataDir()));
        const tab = openTab(dataDir, NEW);

        await tab.started;
        expect(tab.workers).toHaveLength(1);
        releaseSnapshot();
        releaseMemory();
        releaseOther();
    });
});

describe('a tab finding a newer generation', () => {
    it('shows the reload state and never asks the newer tab to hand over', async () => {
        const dataDir = newDataDir();
        const newer = openTab(dataDir, NEW);

        await newer.started;
        await insertRow(newer, 'kept');

        const older = openTab(dataDir, OLD);

        await expect(older.started).rejects.toMatchObject({kind: 'database-newer-than-app'});
        await pause(HANDOVER_TIMEOUT_MS);

        expect(older.workers).toHaveLength(0);
        expect(handoverStatus(newer)).toBe('idle');
        await expect(readRows(newer)).resolves.toEqual(['kept']);
    });
});

describe('a handover request', () => {
    it('is ignored when it comes from an older or equal generation', async () => {
        const dataDir = newDataDir();
        const tab = openTab(dataDir, NEW);

        await tab.started;

        const channel = new BroadcastChannel(`stagistic-db-handover:${dataDir}`);

        for (const generation of [
            '100/20261101000000_old/0.3.15',
            '101/20261102000000_new/0.3.15',
            'unreadable',
        ]) {
            channel.postMessage({type: 'stagistic-db-handover-request', generation});
        }

        await pause(HANDOVER_TIMEOUT_MS);
        channel.close();

        expect(handoverStatus(tab)).toBe('idle');
    });
});

describe('tabs of one generation', () => {
    it('keep sharing one leader, with no handover', async () => {
        const dataDir = newDataDir();
        const first = openTab(dataDir, NEW);

        await first.started;

        const second = openTab(dataDir, {...NEW});

        await second.started;
        await insertRow(first, 'from-first');
        await insertRow(second, 'from-second');

        await expect(readRows(first)).resolves.toEqual(['from-first', 'from-second']);
        await expect(heldElectionLocks(dataDir)).resolves.toHaveLength(1);
        expect(handoverStatus(first)).toBe('idle');
        expect(handoverStatus(second)).toBe('idle');
    });

    it('wait for a leader in another tab without counting it as a stall', async () => {
        const dataDir = newDataDir();
        const leaderLock = `pglite-election-lock:stagistic-db:101/20261102000000_new/0.3.15:${dataDir}`;
        const release = await holdLock(leaderLock);
        const tab = openTab(dataDir, NEW);

        await expect.poll(() => tab.updates.at(-1), WORKER_START_POLL).toMatchObject({longRunning: true, label: 'Waiting for another Stagistic tab'});
        expect(tab.updates.some(update => update.blocked)).toBe(false);

        release();
        await tab.started;
    });

    it('stop without an unhandled rejection while no leader answers', async () => {
        const dataDir = newDataDir();

        await holdLock(`pglite-election-lock:stagistic-db:101/20261102000000_new/0.3.15:${dataDir}`);

        const tab = openTab(dataDir, NEW);
        const rejections: unknown[] = [];
        const onRejection = (event: PromiseRejectionEvent) => rejections.push(event.reason);

        await expect.poll(() => tab.updates.at(-1), WORKER_START_POLL).toMatchObject({label: 'Waiting for another Stagistic tab'});
        window.addEventListener('unhandledrejection', onRejection);

        try {
            await tab.bootstrap.close();
            // PGliteWorker calls for a leader every 16 ms until one answers.
            await pause(200);
            expect(rejections).toEqual([]);
        } finally {
            window.removeEventListener('unhandledrejection', onRejection);
        }
    });
});

describe('an older tab', () => {
    it('keeps working until a newer generation needs the database', async () => {
        const dataDir = newDataDir();
        const old = openTab(dataDir, OLD);

        await old.started;
        await insertRow(old, 'first');
        await pause(HANDOVER_TIMEOUT_MS);
        await insertRow(old, 'second');

        expect(handoverStatus(old)).toBe('idle');
        await expect(readRows(old)).resolves.toEqual(['first', 'second']);
    });

    it('stops edits, saves, waits for a durable write and leaves before the newer tab opens', async () => {
        const dataDir = newDataDir();
        const old = openTab(dataDir, OLD);
        const events: string[] = [];

        await old.started;
        old.bootstrap.handover.addParticipant({
            stopEditing: () => events.push('stop-editing'),
            flush: async () => {
                events.push('flush');
                await insertRow(old, 'unsaved-edit');
                await pause(100);
                events.push(`new tab has ${newer.workers.length} workers`);

                return true;
            },
        });

        const newer = openTab(dataDir, NEW);

        await newer.started;

        expect(events).toEqual([
            'stop-editing',
            'flush',
            'new tab has 0 workers',
        ]);
        expect(handoverStatus(old)).toBe('saved');
        await expect(heldElectionLocks(dataDir)).resolves.toHaveLength(1);
        await expect(readRows(newer)).resolves.toEqual(['unsaved-edit']);
    });

    it('reports saved only after a durable flush that started behind the last edit', async () => {
        const dataDir = newDataDir();
        const old = openTab(dataDir, OLD);

        await old.started;

        // `syncToFs` resolves on the IndexedDB commit (see pgliteDurability.browser.test.ts).
        const syncToFs = vi.spyOn(PGliteWorker.prototype, 'syncToFs');
        const flushesFinished = () => syncToFs.mock.settledResults.filter(result => result.type === 'fulfilled').length;
        let flushesFinishedAtLastEdit = 0;
        let flushesBehindLastEdit = -1;

        old.bootstrap.handover.addParticipant({
            flush: async () => {
                await insertRow(old, 'last-edit');
                flushesFinishedAtLastEdit = flushesFinished();

                return true;
            },
        });
        old.bootstrap.handover.subscribe(() => {
            if (handoverStatus(old) === 'saved') {
                flushesBehindLastEdit = flushesFinished() - flushesFinishedAtLastEdit;
            }
        });

        const newer = openTab(dataDir, NEW);

        await newer.started;

        expect(flushesBehindLastEdit).toBeGreaterThan(0);
        await expect(readRows(newer)).resolves.toEqual(['last-edit']);
    });

    it('keeps its worker and text when saving fails, and holds the newer tab back until it is closed', async () => {
        const dataDir = newDataDir();
        const old = openTab(dataDir, OLD, {handoverSaveTimeoutMs: 300});

        await old.started;
        await insertRow(old, 'saved-before');
        old.bootstrap.handover.addParticipant({
            flush: () => Promise.resolve(false),
            getText: () => 'INT. THE TEXT THAT COULD NOT BE SAVED',
        });

        const newer = openTab(dataDir, NEW);

        await expect.poll(() => old.bootstrap.handover.getState()).toEqual({
            status: 'save-failed',
            text: 'INT. THE TEXT THAT COULD NOT BE SAVED',
        });
        await expect.poll(() => isBlocked(newer)).toBe(true);
        expect(newer.workers).toHaveLength(0);
        await expect(readRows(old)).resolves.toEqual(['saved-before']);

        await old.bootstrap.close();
        await newer.started;
        await expect(readRows(newer)).resolves.toEqual(['saved-before']);
    });

    it('gives up on a save that never returns and offers the text', async () => {
        const dataDir = newDataDir();
        const old = openTab(dataDir, OLD, {handoverSaveTimeoutMs: 300});

        await old.started;
        old.bootstrap.handover.addParticipant({
            flush: () => new Promise(() => {}),
            getText: () => 'hanging',
        });
        openTab(dataDir, NEW);

        await expect.poll(() => old.bootstrap.handover.getState()).toEqual({status: 'save-failed', text: 'hanging'});
    });

    it('saves a follower\'s edits through its leader before the leader leaves', async () => {
        const dataDir = newDataDir();
        const leader = openTab(dataDir, OLD);

        await leader.started;

        const follower = openTab(dataDir, OLD);

        await follower.started;

        let wasElected = false;

        follower.workers[0]?.addEventListener('message', ({data}: MessageEvent<{type?: string}>) => {
            wasElected ||= data.type === 'leader-now';
        });
        await insertRow(leader, 'leader-row');
        leader.bootstrap.handover.addParticipant({flush: () => Promise.resolve(true)});
        follower.bootstrap.handover.addParticipant({
            flush: async () => {
                // The leader has long finished its own save by the time this one lands.
                await pause(600);
                await insertRow(follower, 'follower-edit');

                return true;
            },
        });

        const newer = openTab(dataDir, NEW);

        await expect.poll(() => handoverStatus(leader)).toBe('saved');
        await insertRow(leader, 'still-in-flight-on-the-leader');
        await newer.started;

        expect(handoverStatus(follower)).toBe('saved');
        expect(wasElected).toBe(false);
        await expect(readRows(newer)).resolves.toEqual([
            'follower-edit',
            'leader-row',
            'still-in-flight-on-the-leader',
        ]);
    });

    it('lets slower tabs save when a follower is done first with reads still running', async () => {
        const dataDir = newDataDir();
        const leader = openTab(dataDir, OLD, {handoverSaveTimeoutMs: 5000});

        await leader.started;

        const quickFollower = openTab(dataDir, OLD);

        await quickFollower.started;

        const slowFollower = openTab(dataDir, OLD, {handoverSaveTimeoutMs: 5000});

        await slowFollower.started;
        await insertRow(leader, 'before');

        /*
         * The app's reactive reads do not stop for a handover. A closing tab's read
         * queued behind another tab's is granted after PGlite has cleaned up
         * after that tab, and nothing ever releases it.
         */
        const keepReading = async (tab: Tab) => {
            const db = await tab.bootstrap.getLocalDb();

            for (;;) {
                await db.execute('SELECT 1');
            }
        };

        [
            leader,
            quickFollower,
            slowFollower,
        ].forEach(tab => {
            keepReading(tab).catch(() => {});
        });

        const saveLate = (tab: Tab, id: string) => async () => {
            await pause(800);
            await insertRow(tab, id);

            return true;
        };

        leader.bootstrap.handover.addParticipant({flush: saveLate(leader, 'slow-leader-edit')});
        slowFollower.bootstrap.handover.addParticipant({flush: saveLate(slowFollower, 'slow-follower-edit')});

        const newer = openTab(dataDir, NEW);

        await newer.started;

        expect(handoverStatus(leader)).toBe('saved');
        expect(handoverStatus(slowFollower)).toBe('saved');
        await expect(readRows(newer)).resolves.toEqual([
            'before',
            'slow-follower-edit',
            'slow-leader-edit',
        ]);
    });

    it('saves a follower\'s edits after its leader\'s tab is closed mid-handover', async () => {
        const dataDir = newDataDir();
        const leader = openTab(dataDir, OLD);

        await leader.started;

        const follower = openTab(dataDir, OLD);

        await follower.started;
        await insertRow(leader, 'leader-row');
        await leader.bootstrap.syncToFs();

        let attempts = 0;

        follower.bootstrap.handover.addParticipant({
            flush: async () => {
                attempts += 1;

                if (attempts === 1) {
                    // The save is on its way to the leader when the leader disappears.
                    leader.crash();
                }

                await insertRow(follower, 'follower-edit');

                return true;
            },
        });

        const newer = openTab(dataDir, NEW);

        await newer.started;

        expect(attempts).toBeGreaterThan(1);
        expect(handoverStatus(follower)).toBe('saved');
        await expect(readRows(newer)).resolves.toEqual(['follower-edit', 'leader-row']);
    });

    it('hands over even when asked right after its own start', async () => {
        const dataDir = newDataDir();
        const old = openTab(dataDir, OLD);
        const newer = openTab(dataDir, NEW);

        await Promise.all([old.started, newer.started]);
        expect(handoverStatus(old)).toBe('saved');
    });
});

describe('two generations starting at the same moment', () => {
    it.each([
        ['older first', [OLD, NEW]],
        ['newer first', [NEW, OLD]],
    ] as const)('never have the database open together (%s)', async (_label, [firstGeneration, secondGeneration]) => {
        // The stagger lands the second tab between the first tab's check and its worker asking for the lock.
        for (const stagger of [
            0,
            5,
            15,
            40,
            80,
        ]) {
            const dataDir = newDataDir();
            const first = openTab(dataDir, firstGeneration);

            await pause(stagger);

            const tabs = [first, openTab(dataDir, secondGeneration)];
            let isSettled = false;
            const samples: number[] = [];
            const results = Promise.allSettled(tabs.map(tab => tab.started)).finally(() => {
                isSettled = true;
            });

            while (!isSettled) {
                samples.push((await heldElectionLocks(dataDir)).length);
                await pause(10);
            }

            const outcomes = await results;

            // Whichever order the guard saw, the newer tab ends up with the database.
            expect(Math.max(...samples)).toBeLessThanOrEqual(1);
            expect(outcomes[firstGeneration === NEW ? 0 : 1]?.status).toBe('fulfilled');
            await expect(heldElectionLocks(dataDir)).resolves.toEqual([expect.stringContaining('101/')]);
        }
    });
});

describe('the spike scenario: an old tab and a new tab with a migration', () => {
    it('keeps every row and the migrated column after both close', async () => {
        const dataDir = newDataDir();
        const old = openTab(dataDir, OLD);

        await old.started;
        await insertRow(old, 'old-1');

        const newer = openTab(dataDir, NEW);

        await newer.started;

        const db = await newer.bootstrap.getLocalDb();

        await db.execute('ALTER TABLE handover_rows ADD COLUMN note text');
        await insertRow(newer, 'new-1');
        await insertRow(newer, 'new-2');
        await newer.bootstrap.syncToFs();

        // The old tab has stopped: nothing it still tries reaches the database.
        await expect(insertRow(old, 'old-2')).rejects.toThrow();

        await newer.bootstrap.close();

        const reopened = openTab(dataDir, NEW);

        await reopened.started;

        const reopenedDb = await reopened.bootstrap.getLocalDb();
        const columns = await reopenedDb.execute<{column_name: string}>(
            'SELECT column_name FROM information_schema.columns WHERE table_name = \'handover_rows\' ORDER BY 1',
        );

        expect(columns.rows.map(row => row.column_name)).toEqual(['id', 'note']);
        await expect(readRows(reopened)).resolves.toEqual([
            'new-1',
            'new-2',
            'old-1',
        ]);
    });
});
