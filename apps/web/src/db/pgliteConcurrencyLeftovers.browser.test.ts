import type {PGliteWorker} from '@electric-sql/pglite/worker';
import pgliteDataUrl from '@pglite-data?url';
import pgliteWasmUrl from '@pglite-wasm?url';
import {
    createPgliteReactiveQuerySource,
} from '@stagistic/db';
import {
    createPgliteBootstrap,
    type DbBootstrapUpdate,
    type DbGeneration,
    type LocalDb,
} from '@stagistic/db/pglite';
import {
    afterEach,
    describe,
    expect,
    it,
    vi,
} from 'vite-plus/test';

/*
 * The leftovers from ticket 11, each reproduced with real workers: a closing
 * tab's half transaction, live queries across a leader change, a failed
 * subscribe recovered by "Try again", and reads against a leader that hangs.
 */
const GENERATION: DbGeneration = {
    migrationCount: 100,
    latestMigrationId: '20261101000000_leader',
    pgliteVersion: '0.3.15',
};
// Far longer than a promotion takes; only a call that will never return gets here.
const SETTLE_TIMEOUT_MS = 12_000;
const NEVER_SETTLED = 'never settled';

const startWorker = () => new Worker(new URL('./pglite.worker.ts', import.meta.url), {type: 'module'});
const startHangingWorker = () => new Worker(new URL('./pgliteHangingStart.worker.ts', import.meta.url), {type: 'module'});

interface Tab {
    bootstrap: ReturnType<typeof createPgliteBootstrap>,
    started: Promise<void>,
    workers: Worker[],
    closeTab: () => void,
}

const cleanups: (() => void)[] = [];

const openTab = (dataDir: string, workerFactory = startWorker): Tab => {
    const workers: Worker[] = [];
    const bootstrap = createPgliteBootstrap({
        fsBundleUrl: pgliteDataUrl,
        wasmUrl: pgliteWasmUrl,
        dataDir,
        generation: GENERATION,
        workerFactory: () => {
            const worker = workerFactory();

            workers.push(worker);

            return worker;
        },
    });
    const started = bootstrap.prepareLocalDbWithProgress(() => {});

    started.catch(() => {});

    const closeTab = () => {
        void bootstrap.close();
        workers.forEach(worker => worker.terminate());
    };

    cleanups.push(closeTab);

    return {
        bootstrap,
        started,
        workers,
        closeTab,
    };
};

const openTabWithUpdates = (dataDir: string, onUpdate: (update: DbBootstrapUpdate) => void): Tab => {
    const workers: Worker[] = [];
    const bootstrap = createPgliteBootstrap({
        fsBundleUrl: pgliteDataUrl,
        wasmUrl: pgliteWasmUrl,
        dataDir,
        generation: GENERATION,
        workerFactory: () => {
            const worker = startWorker();

            workers.push(worker);

            return worker;
        },
    });
    const started = bootstrap.prepareLocalDbWithProgress(onUpdate);

    started.catch(() => {});

    const closeTab = () => {
        void bootstrap.close();
        workers.forEach(worker => worker.terminate());
    };

    cleanups.push(closeTab);

    return {
        bootstrap,
        started,
        workers,
        closeTab,
    };
};

const newDataDir = () => `idb://stagistic-leftovers-${crypto.randomUUID()}`;

afterEach(() => {
    cleanups.splice(0).forEach(cleanup => cleanup());
    vi.restoreAllMocks();
});

const pause = (ms: number) => new Promise(resolve => {
    setTimeout(resolve, ms);
});

const settlement = (promise: Promise<unknown>) => Promise.race([
    promise.then(() => 'resolved', (error: Error) => `rejected: ${error.message}`),
    pause(SETTLE_TIMEOUT_MS).then(() => NEVER_SETTLED),
]);

const clientOf = (db: LocalDb) => (db as unknown as {$client: PGliteWorker}).$client;

const leaderChanged = (client: PGliteWorker) => new Promise<void>(resolve => {
    const stop = client.onLeaderChange(() => {
        stop();
        resolve();
    });
});

const createRows = async (tab: Tab) => {
    const db = await tab.bootstrap.getLocalDb();

    await db.execute('CREATE TABLE IF NOT EXISTS leader_rows (id text PRIMARY KEY)');
    await tab.bootstrap.syncToFs();
};

const insertRow = async (tab: Tab, id: string) => {
    const db = await tab.bootstrap.getLocalDb();

    await db.execute(`INSERT INTO leader_rows (id) VALUES ('${id}')`);
};

const readRows = async (tab: Tab) => {
    const db = await tab.bootstrap.getLocalDb();
    const result = await db.execute<{id: string}>('SELECT id FROM leader_rows ORDER BY id');

    return result.rows.map(row => row.id);
};

// Reads that were under way when the leader went may fail; a working leader answers the next one.
const answerFromNextLeader = async (tab: Tab) => {
    const deadline = Date.now() + SETTLE_TIMEOUT_MS;

    while (Date.now() < deadline) {
        const attempt = readRows(tab);

        if (await settlement(attempt) === 'resolved') {
            return attempt;
        }

        await pause(100);
    }

    throw new Error('No leader answered.');
};

const openLeaderAndFollower = async () => {
    const dataDir = newDataDir();
    const leader = openTab(dataDir);

    await leader.started;

    const follower = openTab(dataDir);

    await follower.started;
    await createRows(leader);

    return {
        dataDir,
        leader,
        follower,
    };
};

const openList = (tab: Tab, client: PGliteWorker, subscribeTimeoutMs?: number) => createPgliteReactiveQuerySource({
    getDb: tab.bootstrap.getLocalDb,
    readRows: async () => (await client.query<{id: string}>('SELECT id FROM leader_rows ORDER BY id')).rows,
    watchQuery: 'SELECT id FROM leader_rows',
    ...subscribeTimeoutMs !== undefined ? {subscribeTimeoutMs} : {},
});

describe('a closing tab with an open transaction', () => {
    it('never commits its half into another tab\'s transaction', async () => {
        const {
            dataDir,
            leader,
            follower,
        } = await openLeaderAndFollower();
        const bystander = openTab(dataDir);

        await bystander.started;
        await readRows(bystander);

        const db = await follower.bootstrap.getLocalDb();
        let releaseHalf = () => {};
        const halfDone = new Promise<void>(resolve => {
            releaseHalf = resolve;
        });
        const gate = new Promise<void>(() => {});

        // Holds the transaction lock with one uncommitted INSERT; never commits or rolls back.
        void db.transaction(async tx => {
            await tx.execute('INSERT INTO leader_rows (id) VALUES (\'half-of-a-closed-tab\')');
            releaseHalf();
            await gate;
        });

        // The first INSERT answered, so the transaction is open and holding its lock.
        await halfDone;

        const otherDb = await bystander.bootstrap.getLocalDb();
        const otherTransaction = otherDb.transaction(async tx => {
            await tx.execute('INSERT INTO leader_rows (id) VALUES (\'other-tab\')');
        });

        // The bystander's lock request reaches the leader and queues behind the follower's hold.
        await pause(150);

        follower.closeTab();

        await expect(settlement(otherTransaction)).resolves.toBe('resolved');
        await expect(answerFromNextLeader(leader)).resolves.toEqual(['other-tab']);

        leader.closeTab();

        const reopened = openTab(dataDir);

        await reopened.started;
        await expect(readRows(reopened)).resolves.toEqual(['other-tab']);
    });
});

describe('a live query across a leader change', () => {
    it('reflects rows written after promotion without a reload', async () => {
        const {leader, follower} = await openLeaderAndFollower();

        await insertRow(leader, 'before');

        const followerDb = await follower.bootstrap.getLocalDb();
        const list = openList(follower, clientOf(followerDb));
        const snapshots: string[][] = [];

        await list.subscribe(rows => snapshots.push(rows.map(row => row.id)));
        expect(snapshots.at(-1)).toEqual(['before']);

        const changed = leaderChanged(clientOf(followerDb));

        leader.closeTab();
        await changed;
        await answerFromNextLeader(follower);

        await insertRow(follower, 'after');

        await expect.poll(
            () => snapshots.at(-1),
            {timeout: SETTLE_TIMEOUT_MS},
        ).toEqual(['after', 'before']);
    });
});

describe('a failed subscribe and "Try again"', () => {
    it('recovers the list from a refresh without a reload', async () => {
        const {leader, follower} = await openLeaderAndFollower();

        await insertRow(leader, 'before');

        const followerDb = await follower.bootstrap.getLocalDb();
        const client = clientOf(followerDb);
        const list = openList(follower, client);
        const snapshots: string[][] = [];

        // The subscribe is cut off by the leader's tab closing mid-way.
        const send = client.execProtocolStream.bind(client);

        vi.spyOn(client, 'execProtocolStream').mockImplementationOnce(message => {
            leader.closeTab();

            return send(message);
        });

        await expect(settlement(list.subscribe(rows => snapshots.push(rows.map(row => row.id))))).resolves.toMatch(/^rejected: /u);

        // The leader answered after the failed subscribe: "Try again" must recover without reload.
        await answerFromNextLeader(follower);

        await expect(settlement(list.refresh())).resolves.toBe('resolved');

        await expect.poll(
            () => snapshots.at(-1),
            {timeout: SETTLE_TIMEOUT_MS},
        ).toEqual(['before']);
    });
});

describe('a follower promoted to a hanging leader', () => {
    it('a read ends in a visible error instead of waiting for good', async () => {
        const dataDir = newDataDir();
        const leader = openTab(dataDir);

        await leader.started;
        await createRows(leader);

        const stuck = openTab(dataDir, startHangingWorker);

        await stuck.started;

        const reader = openTab(dataDir);

        await reader.started;
        await readRows(reader);

        const client = clientOf(await reader.bootstrap.getLocalDb());
        const changed = leaderChanged(client);

        leader.closeTab();
        await changed;

        const list = openList(reader, client, 500);

        const unsubscribe = await list.subscribe(() => {}).then(() => null, (error: {unsubscribe?: () => void}) => error.unsubscribe ?? null);

        expect(unsubscribe).toBeTypeOf('function');
        // "Try again" and the confirmation read end by the same deadline.
        await expect(settlement(list.refresh())).resolves.toMatch(/^rejected: /u);
        unsubscribe?.();
    });
});

describe('a tab waiting for a same-generation leader', () => {
    it('reports waiting-for-leader as an unbounded wait', async () => {
        const dataDir = newDataDir();

        // Holds the election lock without ever connecting a tab: the next tab waits.
        openTab(dataDir, startHangingWorker);

        await pause(200);

        const updates: DbBootstrapUpdate[] = [];

        openTabWithUpdates(dataDir, update => updates.push(update));

        await expect.poll(
            () => updates.some(update => update.label === 'Waiting for another Stagistic tab'),
            {timeout: SETTLE_TIMEOUT_MS},
        ).toBe(true);

        const waiting = updates.find(update => update.label === 'Waiting for another Stagistic tab');

        expect(waiting?.waitsForDatabase).toBe(true);
        expect(waiting?.longRunning).toBe(true);
    });
});
