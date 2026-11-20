import type {PGlite} from '@electric-sql/pglite';
import {
    describe,
    expect,
    it,
} from 'vite-plus/test';

import {
    flushPgliteToStorage,
    installFlushQueue,
    withDurableSyncToFs,
} from './durableSyncToFs';

const delay = (ms: number) => new Promise<void>(resolve => {
    setTimeout(resolve, ms);
});

const createFakeDb = () => {
    const state = {
        running: 0,
        maxRunning: 0,
        finished: 0,
        failNext: false,
    };
    const fs = {
        syncToFs: async () => {
            if (state.failNext) {
                state.failNext = false;
                throw new Error('quota exceeded');
            }

            state.running += 1;
            state.maxRunning = Math.max(state.maxRunning, state.running);
            await delay(5);
            state.running -= 1;
            state.finished += 1;
        },
    };

    return {
        state,
        fs,
        db: {fs} as unknown as PGlite,
    };
};

describe('flushPgliteToStorage', () => {
    it('resolves only after the filesystem flush finished', async () => {
        const {db, state} = createFakeDb();

        installFlushQueue(db);
        await flushPgliteToStorage(db);

        expect(state.finished).toBe(1);
    });

    it('never overlaps with flushes PGlite schedules itself', async () => {
        const {
            db,
            fs,
            state,
        } = createFakeDb();

        installFlushQueue(db);
        // PGlite's relaxed per-query flush: started, not awaited.
        void fs.syncToFs();
        void fs.syncToFs();
        await flushPgliteToStorage(db);

        expect(state.maxRunning).toBe(1);
        expect(state.finished).toBe(3);
    });

    it('keeps flushing after a failed flush', async () => {
        const {
            db,
            fs,
            state,
        } = createFakeDb();
        const original = fs.syncToFs;
        let failNext = true;

        fs.syncToFs = async () => {
            if (failNext) {
                failNext = false;
                throw new Error('quota exceeded');
            }

            await original();
        };
        installFlushQueue(db);

        await expect(flushPgliteToStorage(db)).rejects.toThrow('quota exceeded');
        await flushPgliteToStorage(db);

        expect(state.finished).toBe(1);
    });

    it('does nothing when the database has no filesystem', async () => {
        await expect(flushPgliteToStorage({} as unknown as PGlite)).resolves.toBeUndefined();
    });
});

const complete = (text: string) => [{name: 'commandComplete', text}, {name: 'readyForQuery'}];

/** Backend `CommandComplete` bytes, as `execProtocolRaw` returns them. */
const rawComplete = (text: string) => {
    const body = new TextEncoder().encode(`${text}\0`);
    const bytes = new Uint8Array(5 + body.length + 6);
    const view = new DataView(bytes.buffer);

    bytes[0] = 67;
    view.setInt32(1, 4 + body.length);
    bytes.set(body, 5);
    // ReadyForQuery, idle
    bytes.set([
        90,
        0,
        0,
        0,
        5,
        73,
    ], 5 + body.length);

    return bytes;
};

const createServedDb = () => {
    const fake = createFakeDb();
    const results: {
        stream: unknown,
        raw: Uint8Array | null,
        failure: Error | null,
    } = {
        stream: complete('SELECT 1'),
        raw: null,
        failure: null,
    };
    const served = {
        fs: fake.fs,
        syncToFs: () => fake.fs.syncToFs(),
        execProtocolStream: async () => {
            await Promise.resolve();

            if (results.failure) throw results.failure;

            return results.stream;
        },
        execProtocol: async () => {
            await Promise.resolve();

            return {messages: results.stream, data: new Uint8Array()};
        },
        execProtocolRaw: async () => {
            await Promise.resolve();

            return results.raw ?? new Uint8Array();
        },
    };
    const db = withDurableSyncToFs(served as unknown as PGlite);

    return {
        ...fake,
        results,
        served: db as unknown as typeof served,
    };
};

describe('withDurableSyncToFs', () => {
    it('flushes on the first call, as anything written before it started is unknown', async () => {
        const {served, state} = createServedDb();

        await served.syncToFs();

        expect(state.finished).toBe(1);
    });

    it('does not flush for a read-only query once everything written is stored', async () => {
        const {served, state} = createServedDb();

        await served.syncToFs();
        await served.execProtocolStream();
        await served.syncToFs();
        await served.execProtocol();
        await served.syncToFs();

        expect(state.finished).toBe(1);
    });

    it('flushes after a write, in any of the three protocol calls', async () => {
        const {
            served,
            state,
            results,
        } = createServedDb();

        await served.syncToFs();
        results.stream = complete('INSERT 0 1');
        await served.execProtocolStream();
        await served.syncToFs();

        expect(state.finished).toBe(2);

        await served.execProtocol();
        await served.syncToFs();

        expect(state.finished).toBe(3);

        results.raw = rawComplete('UPDATE 4');
        await served.execProtocolRaw();
        await served.syncToFs();

        expect(state.finished).toBe(4);
    });

    it('treats a read-only raw response as no write', async () => {
        const {
            served,
            state,
            results,
        } = createServedDb();

        await served.syncToFs();
        results.raw = rawComplete('SELECT 3');
        await served.execProtocolRaw();
        await served.syncToFs();

        expect(state.finished).toBe(1);
    });

    it('treats a failed or unreadable response as a possible write', async () => {
        const {
            served,
            state,
            results,
        } = createServedDb();

        await served.syncToFs();
        results.failure = new Error('relation does not exist');
        await expect(served.execProtocolStream()).rejects.toThrow('does not exist');
        await served.syncToFs();

        expect(state.finished).toBe(2);

        results.failure = null;
        results.stream = 'something new';
        await served.execProtocolStream();
        await served.syncToFs();

        expect(state.finished).toBe(3);
    });

    it('flushes for any statement that is not known to be read-only', async () => {
        const {
            served,
            state,
            results,
        } = createServedDb();

        await served.syncToFs();

        for (const tag of [
            'COMMIT',
            'CREATE TABLE',
            'DELETE 2',
            'INSERT 0 1',
        ]) {
            const before = state.finished;

            results.stream = complete(tag);
            await served.execProtocolStream();
            await served.syncToFs();

            expect(state.finished, tag).toBe(before + 1);
        }
    });

    it('waits for a flush that already covers the write instead of starting another', async () => {
        const {
            served,
            state,
            results,
        } = createServedDb();

        await served.syncToFs();
        results.stream = complete('INSERT 0 1');
        await served.execProtocolStream();

        const first = served.syncToFs();

        await Promise.resolve();

        // A read arrives while that flush runs: it waits for it, and adds none.
        results.stream = complete('SELECT 1');
        await served.execProtocolStream();

        const read = served.syncToFs();

        await Promise.all([first, read]);

        expect(state.finished).toBe(2);
    });

    it('flushes again for a write that arrived while a flush was running', async () => {
        const {
            served,
            state,
            results,
        } = createServedDb();

        await served.syncToFs();
        results.stream = complete('INSERT 0 1');
        await served.execProtocolStream();

        const first = served.syncToFs();

        await delay(1);
        // The running flush has already scanned the files; this write is not in it.
        await served.execProtocolStream();

        const second = served.syncToFs();

        await Promise.all([first, second]);

        expect(state.finished).toBe(3);
        expect(state.maxRunning).toBe(1);
    });

    it('still reports unflushed writes after a failed flush', async () => {
        const {
            served,
            state,
            results,
        } = createServedDb();

        await served.syncToFs();
        results.stream = complete('INSERT 0 1');
        await served.execProtocolStream();
        state.failNext = true;

        await expect(served.syncToFs()).rejects.toThrow('quota exceeded');
        await served.syncToFs();

        expect(state.finished).toBe(2);
    });

    it('counts a flush PGlite ran by itself as storing earlier writes', async () => {
        const {
            served,
            fs,
            state,
            results,
        } = createServedDb();

        await served.syncToFs();
        results.stream = complete('INSERT 0 1');
        await served.execProtocolStream();
        await fs.syncToFs();
        await served.syncToFs();

        expect(state.finished).toBe(2);
    });
});
