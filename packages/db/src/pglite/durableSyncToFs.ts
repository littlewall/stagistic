import type {PGlite} from '@electric-sql/pglite';

/*
 * With `relaxedDurability`, PGlite's own `syncToFs()` returns before IndexedDB
 * has the data (it only schedules the flush), and so does the flush after every
 * query. Closing a tab right after a save could lose it. Running queries
 * relaxed is deliberate: awaiting a flush after every statement made creating
 * a script about 7x slower in a measurement of the web app.
 *
 * `flushPgliteToStorage` waits for a flush that starts after the call, so every
 * write finished before the call is in the filesystem store when it resolves.
 *
 * A read-only query must not pay for that: every query a tab sends outside a
 * transaction ends in a `syncToFs()` call, and a flush rescans every file of
 * the data directory (about 25 ms), which made opening a script or creating
 * one several times slower. The worker therefore remembers whether anything
 * that is not known to be read-only ran since the last flush started, and
 * `syncToFs()` flushes only then. A call that finds everything stored
 * returns at once; one that finds its writes covered by a running flush waits
 * for that flush. Either way it resolves only when every write finished before
 * the call is in storage.
 *
 * Flushes must never overlap. Emscripten's IDBFS compares a snapshot of the
 * local files against the store and deletes store entries missing from the
 * snapshot, so a flush that started earlier can delete a file a concurrent
 * flush just wrote. PGlite serialises its own flushes; the explicit one is put
 * in the same queue by wrapping `fs.syncToFs`.
 */
type FsSync = (relaxedDurability?: boolean) => Promise<void>;

/*
 * Counts writes and the writes a finished flush covered. A flush covers every
 * write finished before it started, because the filesystem is scanned at its
 * start.
 */
interface FlushState {
    run: FsSync,
    writes: number,
    stored: number,
    running: {covers: number, done: Promise<void>} | null,
}

const flushStates = new WeakMap<PGlite, FlushState>();

const flushStateOf = (db: PGlite): FlushState | null => {
    const existing = flushStates.get(db);

    if (existing) {
        return existing;
    }

    const {fs} = db;

    if (!fs) {
        return null;
    }

    const original = fs.syncToFs.bind(fs);
    // The first call must flush: what ran before this wrapper existed is unknown (migrations, for one).
    const state: FlushState = {
        run: () => Promise.resolve(),
        writes: 1,
        stored: 0,
        running: null,
    };
    let tail: Promise<void> = Promise.resolve();

    state.run = relaxedDurability => {
        const run = tail.then(async () => {
            const covers = state.writes;
            const done = original(relaxedDurability);

            state.running = {covers, done};

            try {
                await done;
                state.stored = Math.max(state.stored, covers);
            } finally {
                if (state.running?.done === done) {
                    state.running = null;
                }
            }
        });

        tail = run.catch(() => undefined);

        return run;
    };
    fs.syncToFs = state.run;
    flushStates.set(db, state);

    return state;
};

/*
 * For a database used directly on the calling thread: installs the queue right
 * after creation so no flush starts outside it.
 */
export const installFlushQueue = (db: PGlite): PGlite => {
    flushStateOf(db);

    return db;
};

export const flushPgliteToStorage = async (db: PGlite): Promise<void> => {
    await flushStateOf(db)?.run(false);
};

/* Resolves when every write finished before the call is stored; flushes only if one is not. */
const flushWrittenPgliteToStorage = async (db: PGlite): Promise<void> => {
    const state = flushStateOf(db);

    if (!state) {
        return;
    }

    const target = state.writes;

    if (state.stored >= target) {
        return;
    }

    if (state.running && state.running.covers >= target) {
        await state.running.done;

        return;
    }

    await state.run(false);
};

const READ_ONLY_COMMANDS = new Set([
    'SELECT',
    'SHOW',
    'BEGIN',
    'ROLLBACK',
]);

const commandOf = (tag: string) => tag.split(' ', 1)[0] ?? '';

const COMMAND_COMPLETE = 67;

/* The `CommandComplete` tags of a raw backend response; null when it cannot be read. */
const rawCommandTags = (bytes: Uint8Array): string[] | null => {
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const decoder = new TextDecoder();
    const tags: string[] = [];
    let offset = 0;

    while (offset < bytes.byteLength) {
        if (offset + 5 > bytes.byteLength) {
            return null;
        }

        const length = view.getInt32(offset + 1);
        const end = offset + 1 + length;

        if (length < 4 || end > bytes.byteLength) {
            return null;
        }

        if (bytes[offset] === COMMAND_COMPLETE) {
            tags.push(decoder.decode(bytes.subarray(offset + 5, end - 1)));
        }

        offset = end;
    }

    return tags;
};

const parsedCommandTags = (messages: unknown): string[] | null => {
    if (!Array.isArray(messages)) {
        return null;
    }

    const tags: string[] = [];

    for (const message of messages as {name?: unknown, text?: unknown}[]) {
        if (message?.name !== 'commandComplete') {
            continue;
        }

        if (typeof message.text !== 'string') {
            return null;
        }

        tags.push(message.text);
    }

    return tags;
};

/*
 * True unless the response shows nothing but statements known to be read-only.
 * What cannot be read counts as a write: the cost of being wrong that way is one
 * flush, the other way a lost save. A SELECT with side effects (a sequence, for
 * one) is not seen; its change reaches storage with the next flush.
 */
const commandTagsOf = (result: unknown): string[] | null => {
    if (result instanceof Uint8Array) {
        return rawCommandTags(result);
    }

    if (result && typeof result === 'object' && 'messages' in result) {
        return parsedCommandTags(result.messages);
    }

    return parsedCommandTags(result);
};

const mayHaveWritten = (result: unknown) => {
    const tags = commandTagsOf(result);

    return tags === null || tags.some(tag => !READ_ONLY_COMMANDS.has(commandOf(tag)));
};

const PROTOCOL_CALLS = new Set<string | symbol>([
    'execProtocol',
    'execProtocolRaw',
    'execProtocolStream',
]);

/*
 * The object a database worker hands to PGliteWorker. A tab's `syncToFs()` call
 * reaches the worker as a call on this object and becomes a durable flush of
 * what was written, while PGlite's internal per-query flushes keep their relaxed
 * behaviour (methods run against the real instance, not the proxy). Protocol
 * calls pass through here, which is where writes are noticed.
 */
export const withDurableSyncToFs = (db: PGlite): PGlite => {
    const state = flushStateOf(db);

    return new Proxy(db, {
        get: (target, property) => {
            if (property === 'syncToFs') {
                return () => flushWrittenPgliteToStorage(target);
            }

            const value: unknown = Reflect.get(target, property, target);

            if (typeof value !== 'function') {
                return value;
            }

            const method = value.bind(target) as (...args: unknown[]) => Promise<unknown>;

            if (!state || !PROTOCOL_CALLS.has(property)) {
                return method;
            }

            return async (...args: unknown[]) => {
                try {
                    const result = await method(...args);

                    if (mayHaveWritten(result)) {
                        state.writes += 1;
                    }

                    return result;
                } catch (error) {
                    state.writes += 1;
                    throw error;
                }
            };
        },
    });
};
