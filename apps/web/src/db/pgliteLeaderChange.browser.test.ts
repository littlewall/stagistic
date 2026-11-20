import type {PGliteWorker} from '@electric-sql/pglite/worker';
import pgliteDataUrl from '@pglite-data?url';
import pgliteWasmUrl from '@pglite-wasm?url';
import {
    createLocalPgliteRepository,
    createPgliteReactiveQuerySource,
    InMemoryFileStorage,
} from '@stagistic/db';
import {
    createPgliteBootstrap,
    type DbGeneration,
    type LocalDb,
} from '@stagistic/db/pglite';
import {createEditorSnapshotStore, createScriptDocumentSession} from '@stagistic/editor';
import {
    afterEach,
    describe,
    expect,
    it,
    vi,
} from 'vite-plus/test';

/*
 * Tabs of one generation sharing a leader: each "tab" is a bootstrap with its
 * own real worker over the same IndexedDB. Closing a tab stops its worker,
 * which frees the election lock the way closing a browser tab does.
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
const startFailingWorker = () => new Worker(new URL('./pgliteFailingStart.worker.ts', import.meta.url), {type: 'module'});

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

const newDataDir = () => `idb://stagistic-leader-${crypto.randomUUID()}`;

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

/* Closes a tab at the moment a query of `client` holds its locks and its first message is on the way. */
const closeTabDuringNextCall = (client: PGliteWorker, tab: Tab) => {
    const send = client.execProtocolStream.bind(client);

    vi.spyOn(client, 'execProtocolStream').mockImplementationOnce(message => {
        tab.closeTab();

        return send(message);
    });
};

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

// A call made in the instant the change is announced is refused; the next one reaches the new leader.
const saveOnNextLeader = async (tab: Tab, id: string) => {
    const deadline = Date.now() + SETTLE_TIMEOUT_MS;

    while (await settlement(insertRow(tab, id)) !== 'resolved') {
        if (Date.now() > deadline) {
            throw new Error('Nothing could be saved.');
        }

        await pause(100);
    }
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

describe('closing the leader\'s tab', () => {
    it('settles a follower\'s transaction that was running', async () => {
        const {leader, follower} = await openLeaderAndFollower();
        const db = await follower.bootstrap.getLocalDb();
        const transaction = db.transaction(async tx => {
            await tx.execute('INSERT INTO leader_rows (id) VALUES (\'first\')');
            leader.closeTab();
            await tx.execute('INSERT INTO leader_rows (id) VALUES (\'second\')');
        });

        await expect(settlement(transaction)).resolves.toMatch(/^rejected: /u);
    });

    it('settles a read running on the tab that becomes the leader', async () => {
        const {leader, follower} = await openLeaderAndFollower();

        await readRows(follower);

        const db = await follower.bootstrap.getLocalDb();

        closeTabDuringNextCall(clientOf(db), leader);

        await expect(settlement(db.execute('SELECT 1'))).resolves.not.toBe(NEVER_SETTLED);
    });

    it('settles a read running on a tab that stays a follower', async () => {
        const {dataDir, leader} = await openLeaderAndFollower();
        const bystander = openTab(dataDir);

        await bystander.started;
        // A tab's own start-up queries must be over, or one of them would take the close below.
        await readRows(bystander);

        const db = await bystander.bootstrap.getLocalDb();

        closeTabDuringNextCall(clientOf(db), leader);

        await expect(settlement(db.execute('SELECT 1'))).resolves.not.toBe(NEVER_SETTLED);
    });

    it('settles a flush asked for while the next leader is starting', async () => {
        const {dataDir, leader} = await openLeaderAndFollower();
        // The first follower becomes the leader; this one only hears about it.
        const bystander = openTab(dataDir);

        await bystander.started;
        await readRows(bystander);

        const client = clientOf(await bystander.bootstrap.getLocalDb());
        const changed = leaderChanged(client);

        leader.closeTab();
        await changed;

        await expect(settlement(client.syncToFs())).resolves.toBe('resolved');
    });

    it('never runs the rest of a cut-off transaction on the next leader', async () => {
        const {
            dataDir,
            leader,
            follower,
        } = await openLeaderAndFollower();
        const bystander = openTab(dataDir);

        await bystander.started;
        await readRows(bystander);

        const db = await bystander.bootstrap.getLocalDb();
        const transaction = db.transaction(async tx => {
            await tx.execute('INSERT INTO leader_rows (id) VALUES (\'first-half\')');
            leader.closeTab();
            await answerFromNextLeader(follower);
            await tx.execute('INSERT INTO leader_rows (id) VALUES (\'second-half\')');
        });

        await expect(settlement(transaction)).resolves.toMatch(/^rejected: /u);
        await expect(answerFromNextLeader(follower)).resolves.toEqual([]);
    });

    it('finishes the start-up of a tab that was just opening', async () => {
        const {dataDir, leader} = await openLeaderAndFollower();
        const opening = openTab(dataDir);

        await opening.started;

        const client = clientOf(await opening.bootstrap.getLocalDb());

        // Its first query reads the array types; without them arrays arrive as plain text.
        closeTabDuringNextCall(client, leader);

        await expect.poll(
            () => client.query<{numbers: number[]}>('SELECT ARRAY[1, 2] AS numbers').then(result => result.rows[0]?.numbers, () => null),
            {timeout: SETTLE_TIMEOUT_MS},
        ).toEqual([1, 2]);
    });

    it('leaves the follower saving durably after its transaction was cut off', async () => {
        const {
            dataDir,
            leader,
            follower,
        } = await openLeaderAndFollower();
        const db = await follower.bootstrap.getLocalDb();
        const transaction = db.transaction(async tx => {
            await tx.execute('INSERT INTO leader_rows (id) VALUES (\'cut-off\')');
            leader.closeTab();
            await tx.execute('INSERT INTO leader_rows (id) VALUES (\'cut-off-too\')');
        });

        await settlement(transaction);
        await saveOnNextLeader(follower, 'saved-after');

        // Answered means flushed: a plain write has to survive its tab closing at once.
        follower.closeTab();

        const reopened = openTab(dataDir);

        await reopened.started;
        await expect(readRows(reopened)).resolves.toEqual(['saved-after']);
    });
});

type ScriptDocument = Parameters<ReturnType<typeof createLocalPgliteRepository>['saveLatest']>[1];

const scriptWith = (text: string): ScriptDocument => ({
    type: 'doc' as const,
    content: [
        {
            type: 'stageDirection' as const,
            attrs: {id: 'only-block'},
            content: [{type: 'text' as const, text}],
        },
    ],
});

const textOf = (document: ScriptDocument | null) => JSON.stringify(document?.content[0]?.content);

const repositoryOf = (tab: Tab, syncToFs = tab.bootstrap.syncToFs) => createLocalPgliteRepository({
    getLocalDb: tab.bootstrap.getLocalDb,
    syncToFs,
    fileStorage: new InMemoryFileStorage(),
});

describe('a save cut off by the leader\'s tab closing', () => {
    it('is stored by its retry when the commit went with the leader', async () => {
        const {
            dataDir,
            leader,
            follower,
        } = await openLeaderAndFollower();
        const scriptId = `leader-save-${crypto.randomUUID()}`;
        let isCutOff = false;
        const repository = repositoryOf(follower, async () => {
            if (!isCutOff) {
                await follower.bootstrap.syncToFs();

                return;
            }

            // Committed on the leader, not yet in storage: its tab closes before the flush lands.
            isCutOff = false;
            leader.closeTab();
            await clientOf(await follower.bootstrap.getLocalDb()).syncToFs();
        });

        await repository.createScriptWithId({id: scriptId, title: 'Cut off'});
        await repository.saveLatest(scriptId, scriptWith('stored before'));

        isCutOff = true;
        await expect(repository.saveLatest(scriptId, scriptWith('the only copy'))).rejects.toThrow();

        await expect.poll(
            () => repository.saveLatest(scriptId, scriptWith('the only copy')).then(() => true, () => false),
            {timeout: SETTLE_TIMEOUT_MS},
        ).toBe(true);

        follower.closeTab();

        const reopened = openTab(dataDir);

        await reopened.started;
        await expect(repositoryOf(reopened).loadLatest(scriptId).then(textOf)).resolves.toContain('the only copy');
    });
});

describe('a save whose answer went with the leader\'s tab', () => {
    it('is not applied twice by its retry', async () => {
        const {
            dataDir,
            leader,
            follower,
        } = await openLeaderAndFollower();
        const scriptId = `leader-save-${crypto.randomUUID()}`;
        let isCutOff = false;
        const repository = repositoryOf(follower, async () => {
            await follower.bootstrap.syncToFs();

            if (isCutOff) {
                // Stored in full; only the confirmation never arrives.
                isCutOff = false;
                leader.closeTab();
                throw new Error('Leader changed');
            }
        });
        const twoBlocks: ScriptDocument = {
            type: 'doc',
            content: [...scriptWith('first').content, ...scriptWith('second').content.map(block => ({...block, attrs: {id: 'added-block'}}))],
        };

        await repository.createScriptWithId({id: scriptId, title: 'Answer lost'});
        await repository.saveLatest(scriptId, scriptWith('first'));

        isCutOff = true;
        await expect(repository.saveLatest(scriptId, twoBlocks)).rejects.toThrow();
        await expect.poll(
            () => repository.saveLatest(scriptId, twoBlocks).then(() => true, () => false),
            {timeout: SETTLE_TIMEOUT_MS},
        ).toBe(true);

        follower.closeTab();

        const reopened = openTab(dataDir);

        await reopened.started;

        const stored = await repositoryOf(reopened).loadLatest(scriptId);

        expect(stored?.content.map(block => block.attrs?.id)).toEqual(['only-block', 'added-block']);
    });
});

describe('a list opening while the leader\'s tab closes', () => {
    const openList = (tab: Tab, client: PGliteWorker) => createPgliteReactiveQuerySource({
        getDb: tab.bootstrap.getLocalDb,
        readRows: async () => (await client.query<{id: string}>('SELECT id FROM leader_rows ORDER BY id')).rows,
        watchQuery: 'SELECT id FROM leader_rows',
    });

    it('settles instead of loading for good, and the next read is answered', async () => {
        const {dataDir, leader} = await openLeaderAndFollower();
        const bystander = openTab(dataDir);

        await bystander.started;
        await readRows(bystander);

        const client = clientOf(await bystander.bootstrap.getLocalDb());
        const list = openList(bystander, client);

        closeTabDuringNextCall(client, leader);

        await expect(settlement(list.subscribe(() => {}))).resolves.not.toBe(NEVER_SETTLED);
        await expect.poll(() => list.read().then(rows => rows.length, () => -1), {timeout: SETTLE_TIMEOUT_MS}).toBe(0);
    });
});

describe('closing a tab', () => {
    it('does not wedge the leader when queries of that tab are still queued', async () => {
        const {leader, follower} = await openLeaderAndFollower();

        await readRows(follower);

        const db = await follower.bootstrap.getLocalDb();

        closeTabDuringNextCall(clientOf(db), follower);
        // The first holds the locks when the tab closes; the others wait behind it on the leader.
        for (let query = 0; query < 5; query += 1) {
            void db.execute('SELECT 1').catch(() => {});
        }

        await expect(settlement(readRows(leader))).resolves.toBe('resolved');
    });
});

describe('a save while the next leader never finishes opening', () => {
    it('becomes a failed save, so the writer is told', async () => {
        const dataDir = newDataDir();
        const leader = openTab(dataDir);

        await leader.started;

        const stuckNextLeader = openTab(dataDir, startHangingWorker);

        await stuckNextLeader.started;

        const writer = openTab(dataDir);

        await writer.started;

        const scriptId = `leader-save-${crypto.randomUUID()}`;
        const repository = repositoryOf(writer);

        await repository.createScriptWithId({id: scriptId, title: 'Stuck'});

        const session = createScriptDocumentSession({
            initialValue: scriptWith('typed'),
            isReadOnly: false,
            liveStore: createEditorSnapshotStore(),
            saveDeadlineMs: 500,
        });
        const changed = leaderChanged(clientOf(await writer.bootstrap.getLocalDb()));

        leader.closeTab();
        await changed;

        const saved = session.saveManual(async value => {
            await repository.saveLatest(scriptId, value);

            return true;
        });

        await expect(settlement(saved)).resolves.toBe('resolved');
        await expect(saved).resolves.toBe(false);
    });
});

describe('a follower promoted after its start', () => {
    it('frees the leadership when it cannot open the database', async () => {
        const dataDir = newDataDir();
        const leader = openTab(dataDir);

        await leader.started;

        const failing = openTab(dataDir, startFailingWorker);

        await failing.started;

        const healthy = openTab(dataDir);

        await healthy.started;
        await createRows(leader);

        let isEditingStopped = false;

        failing.bootstrap.handover.addParticipant({
            flush: () => Promise.resolve(false),
            stopEditing: () => {
                isEditingStopped = true;
            },
            getText: () => 'INT. THE TEXT ONLY THIS TAB HAS',
        });
        leader.closeTab();

        await expect(answerFromNextLeader(healthy)).resolves.toEqual([]);
        expect(failing.bootstrap.handover.getState()).toEqual({
            status: 'database-lost',
            text: 'INT. THE TEXT ONLY THIS TAB HAS',
        });
        expect(isEditingStopped).toBe(true);
    });

    it('keeps a leader whose start went well through later worker errors', async () => {
        const tab = openTab(newDataDir());

        await tab.started;
        await createRows(tab);
        tab.workers[0]?.dispatchEvent(new Event('error'));

        await pause(100);
        expect(tab.bootstrap.handover.getState()).toEqual({status: 'idle'});
        await expect(readRows(tab)).resolves.toEqual([]);
    });
});
