import {
    describe,
    expect,
    it,
    vi,
} from 'vite-plus/test';

import {
    createLocalPgliteRepository,
    InMemoryFileStorage,
} from '../index';
import type {LocalDb} from '../pglite';
import {
    listScripts,
    replaceScriptSceneLocations,
    upsertScriptLocation,
    upsertScriptScene,
} from '../queries';
import {dbSchema} from '../schema';
import {createLiveTestDb} from '../testing/createLiveTestDb';
import {seedScript} from '../testing/createTestDb';
import {createPgliteReactiveQuerySource} from './pgliteReactiveQuerySource';

const waitFor = async (predicate: () => boolean) => {
    const deadline = Date.now() + 2_000;

    while (!predicate()) {
        if (Date.now() >= deadline) {
            throw new Error('Timed out waiting for reactive snapshot');
        }

        await new Promise(resolve => setTimeout(resolve, 5));
    }
};

describe('PGlite reactive query source', () => {
    it('keeps a failed subscriber so a later refresh re-emits to it', async () => {
        let shouldFail = true;
        const unsubscribeLiveQuery = vi.fn(() => Promise.resolve());
        const db = {
            $client: {
                live: {
                    query: vi.fn(() => Promise.resolve({
                        unsubscribe: unsubscribeLiveQuery,
                    })),
                },
            },
        } as unknown as LocalDb;
        const readRows = vi.fn(() => {
            if (shouldFail) {
                return Promise.reject(new Error('initial read failed'));
            }

            return Promise.resolve([{id: 'script-a'}]);
        });
        const source = createPgliteReactiveQuerySource({
            getDb: () => Promise.resolve(db),
            readRows,
            watchQuery: 'SELECT id FROM scripts',
        });
        const failedListener = vi.fn();

        await expect(source.subscribe(failedListener)).rejects.toThrow('initial read failed');

        shouldFail = false;

        const activeListener = vi.fn();
        const unsubscribe = await source.subscribe(activeListener);

        expect(failedListener).toHaveBeenCalledTimes(1);
        expect(activeListener).toHaveBeenCalledTimes(1);

        await source.refresh();

        expect(failedListener).toHaveBeenCalledTimes(2);
        expect(activeListener).toHaveBeenCalledTimes(2);
        unsubscribe();
    });

    const mockDb = (live: unknown) => ({$client: live}) as unknown as LocalDb;

    it('unsubscribes a live query that answers after the subscribe timed out', async () => {
        const unsubscribe = vi.fn(() => Promise.resolve());
        let answerLate: (handle: {unsubscribe: () => Promise<void>}) => void = () => {};
        const query = vi.fn(() => new Promise(resolve => {
            answerLate = resolve;
        }));
        const source = createPgliteReactiveQuerySource({
            getDb: () => Promise.resolve(mockDb({live: {query}})),
            readRows: () => Promise.resolve([]),
            watchQuery: 'SELECT 1',
            subscribeTimeoutMs: 20,
        });

        const failure = await source.subscribe(vi.fn()).then(() => null, (error: unknown) => error);

        expect((failure as Error).message).toContain('did not answer in time');
        // The caller went away: nobody needs the late handle.
        (failure as {unsubscribe: () => void}).unsubscribe();
        answerLate({unsubscribe});
        await waitFor(() => unsubscribe.mock.calls.length === 1);
    });

    it('gives a failed subscribe a cleanup that releases the listener and the live query', async () => {
        const unsubscribeLiveQuery = vi.fn(() => Promise.resolve());
        const query = vi.fn(() => Promise.resolve({unsubscribe: unsubscribeLiveQuery}));
        const source = createPgliteReactiveQuerySource({
            getDb: () => Promise.resolve(mockDb({live: {query}})),
            readRows: () => Promise.reject(new Error('read failed')),
            watchQuery: 'SELECT 1',
        });
        const listener = vi.fn();
        const error = await source.subscribe(listener).then(() => null, (failure: unknown) => failure);

        expect(error).toBeInstanceOf(Error);

        const release = (error as {unsubscribe?: () => void}).unsubscribe;

        expect(release).toBeTypeOf('function');
        release?.();
        await waitFor(() => unsubscribeLiveQuery.mock.calls.length === 1);
    });

    it('ends refresh and read in a failure when the leader never answers a read', async () => {
        const query = vi.fn(() => Promise.resolve({unsubscribe: () => Promise.resolve()}));
        let hang = false;
        const source = createPgliteReactiveQuerySource({
            getDb: () => Promise.resolve(mockDb({live: {query}})),
            readRows: () => (hang ? new Promise<never[]>(() => {}) : Promise.resolve([])),
            watchQuery: 'SELECT 1',
            subscribeTimeoutMs: 30,
        });

        const unsubscribe = await source.subscribe(vi.fn());

        hang = true;
        await expect(source.refresh()).rejects.toThrow('did not answer in time');
        await expect(source.read()).rejects.toThrow('did not answer in time');
        unsubscribe();
    });

    it('gives each concurrent failing subscriber its own cleanup', async () => {
        const unsubscribeLiveQuery = vi.fn(() => Promise.resolve());
        const query = vi.fn(() => Promise.resolve({unsubscribe: unsubscribeLiveQuery}));
        const source = createPgliteReactiveQuerySource({
            getDb: () => Promise.resolve(mockDb({live: {query}})),
            readRows: () => Promise.reject(new Error('read failed')),
            watchQuery: 'SELECT 1',
        });
        const failures = await Promise.all([
            source.subscribe(vi.fn()).then(() => null, (failure: unknown) => failure),
            source.subscribe(vi.fn()).then(() => null, (failure: unknown) => failure),
        ]) as {unsubscribe?: () => void}[];

        expect(failures[0]).not.toBe(failures[1]);
        expect(failures[0]?.unsubscribe).not.toBe(failures[1]?.unsubscribe);

        failures[0]?.unsubscribe?.();
        await new Promise(resolve => setTimeout(resolve, 10));
        expect(unsubscribeLiveQuery).not.toHaveBeenCalled();
        failures[1]?.unsubscribe?.();
        await waitFor(() => unsubscribeLiveQuery.mock.calls.length === 1);
    });

    it('keeps a late live query and refills the list from it', async () => {
        const unsubscribe = vi.fn(() => Promise.resolve());
        let answerLate: (handle: {unsubscribe: () => Promise<void>}) => void = () => {};
        const query = vi.fn(() => new Promise(resolve => {
            answerLate = resolve;
        }));
        const source = createPgliteReactiveQuerySource({
            getDb: () => Promise.resolve(mockDb({live: {query}})),
            readRows: () => Promise.resolve([{id: 'a'}]),
            watchQuery: 'SELECT 1',
            subscribeTimeoutMs: 20,
        });
        const listener = vi.fn();
        const failure = await source.subscribe(listener).then(() => null, (error: unknown) => error);

        expect(failure).toBeInstanceOf(Error);
        answerLate({unsubscribe});
        await waitFor(() => listener.mock.calls.length === 1);
        expect(listener).toHaveBeenCalledWith([{id: 'a'}]);
        expect(unsubscribe).not.toHaveBeenCalled();
    });

    it('emits a late read result when no newer read was queued', async () => {
        const query = vi.fn(() => Promise.resolve({unsubscribe: () => Promise.resolve()}));
        let hang = false;
        let answerLate: (rows: {id: string}[]) => void = () => {};
        const source = createPgliteReactiveQuerySource({
            getDb: () => Promise.resolve(mockDb({live: {query}})),
            readRows: () => (hang
                ? new Promise<{id: string}[]>(resolve => {
                    answerLate = resolve;
                })
                : Promise.resolve([{id: 'old'}])),
            watchQuery: 'SELECT 1',
            subscribeTimeoutMs: 20,
        });
        const listener = vi.fn();
        const unsubscribe = await source.subscribe(listener);

        hang = true;
        await expect(source.refresh()).rejects.toThrow('did not answer in time');
        answerLate([{id: 'late'}]);
        await waitFor(() => listener.mock.calls.length === 2);
        expect(listener).toHaveBeenLastCalledWith([{id: 'late'}]);
        unsubscribe();
    });

    it('reads once per live query change', async () => {
        let notify: () => void = () => {};
        const query = vi.fn((options: {callback: () => void}) => {
            notify = options.callback;

            return Promise.resolve({unsubscribe: () => Promise.resolve()});
        });
        const readRows = vi.fn(() => Promise.resolve([{id: 'a'}]));
        const source = createPgliteReactiveQuerySource({
            getDb: () => Promise.resolve(mockDb({live: {query}})),
            readRows,
            watchQuery: 'SELECT 1',
        });
        const unsubscribe = await source.subscribe(vi.fn());

        expect(readRows).toHaveBeenCalledTimes(1);
        notify();
        await waitFor(() => readRows.mock.calls.length === 2);
        await new Promise(resolve => setTimeout(resolve, 30));
        expect(readRows).toHaveBeenCalledTimes(2);
        unsubscribe();
    });

    it('makes refresh and subscribe wait for a pending re-establish after a leader change', async () => {
        let leaderChanged: () => void = () => {};
        const query = vi.fn(() => Promise.resolve({unsubscribe: () => Promise.resolve()}));
        const source = createPgliteReactiveQuerySource({
            getDb: () => Promise.resolve(mockDb({
                live: {query},
                onLeaderChange: (callback: () => void) => {
                    leaderChanged = callback;

                    return () => {};
                },
            })),
            readRows: () => Promise.resolve([{id: 'a'}]),
            watchQuery: 'SELECT 1',
        });
        const unsubscribe = await source.subscribe(vi.fn());

        expect(query).toHaveBeenCalledTimes(1);
        leaderChanged();

        const refreshed = source.refresh();

        await new Promise(resolve => setTimeout(resolve, 20));
        expect(query).toHaveBeenCalledTimes(1);

        await refreshed;
        expect(query).toHaveBeenCalledTimes(2);
        unsubscribe();
    });

    it('observes committed insert, update, delete, and transactional snapshots', async () => {
        const {db} = await createLiveTestDb();
        const source = createPgliteReactiveQuerySource({
            getDb: () => Promise.resolve(db),
            readRows: () => listScripts(db),
            watchQuery: `
                SELECT id, title, subtitle, created_at, updated_at, active_block_id
                FROM scripts
            `,
        });
        const snapshots: string[][] = [];
        const unsubscribe = await source.subscribe(rows => {
            snapshots.push(rows.map(row => `${row.id}:${row.title}`));
        });

        await db.insert(dbSchema.scripts).values({
            id: 'script-a',
            title: 'First',
            createdAt: 1,
            updatedAt: 1,
        });
        await waitFor(() => snapshots.some(rows => rows.includes('script-a:First')));

        await db.transaction(async tx => {
            await tx.insert(dbSchema.scripts).values({
                id: 'script-b',
                title: 'Second',
                createdAt: 2,
                updatedAt: 2,
            });
            await tx.update(dbSchema.scripts).set({title: 'Updated'});
        });
        await waitFor(() => snapshots.some(rows => rows.includes('script-a:Updated') && rows.includes('script-b:Updated')));

        await db.delete(dbSchema.scripts);
        await waitFor(() => snapshots.at(-1)?.length === 0);

        const countBeforeUnsubscribe = snapshots.length;

        unsubscribe();
        await db.insert(dbSchema.scripts).values({
            id: 'ignored',
            title: 'Ignored',
            createdAt: 3,
            updatedAt: 3,
        });
        await new Promise(resolve => setTimeout(resolve, 20));

        expect(snapshots).toHaveLength(countBeforeUnsubscribe);
    });

    it('scopes place and scene-assignment sources by script', async () => {
        const {db} = await createLiveTestDb();
        const repository = createLocalPgliteRepository({
            getLocalDb: () => Promise.resolve(db),
            syncToFs: () => Promise.resolve(),
            fileStorage: new InMemoryFileStorage(),
        });

        await seedScript(db, 'script-1');
        await seedScript(db, 'script-2');

        const locationsSource = repository.getScriptLocationsSource('script-1');
        const assignmentsSource = repository.getScriptSceneLocationsSource('script-1');
        const locationSnapshots: string[][] = [];
        const assignmentSnapshots: string[][] = [];
        const unsubscribeLocations = await locationsSource.subscribe(rows => {
            locationSnapshots.push(rows.map(row => row.id));
        });
        const unsubscribeAssignments = await assignmentsSource.subscribe(rows => {
            assignmentSnapshots.push(rows.map(row => `${row.sceneHeadingBlockId}:${row.locationId}`));
        });

        await upsertScriptLocation(db, {
            id: 'place-1',
            scriptId: 'script-1',
            name: 'Stage',
            description: null,
            createdAt: 1,
            updatedAt: 1,
        });
        await upsertScriptLocation(db, {
            id: 'other-place',
            scriptId: 'script-2',
            name: 'Other',
            description: null,
            createdAt: 1,
            updatedAt: 1,
        });
        await waitFor(() => locationSnapshots.some(rows => rows.includes('place-1')));

        expect(locationSnapshots.every(rows => !rows.includes('other-place'))).toBe(true);

        await upsertScriptScene(db, {
            id: 'scene-1',
            scriptId: 'script-1',
            headingBlockId: 'heading-1',
            sceneNumber: '1',
            colorHex: null,
            synopsis: null,
            locationId: null,
            createdAt: 1,
            updatedAt: 1,
        });
        await replaceScriptSceneLocations(db, {
            scriptId: 'script-1',
            sceneHeadingBlockId: 'heading-1',
            locationIds: ['place-1'],
        });
        await waitFor(() => assignmentSnapshots.some(rows => rows.includes('heading-1:place-1')));

        unsubscribeLocations();
        unsubscribeAssignments();
    });

    it('observes externally committed title-page and editor-settings aggregates', async () => {
        const {db} = await createLiveTestDb();
        const repository = createLocalPgliteRepository({
            getLocalDb: () => Promise.resolve(db),
            syncToFs: () => Promise.resolve(),
            fileStorage: new InMemoryFileStorage(),
        });

        await seedScript(db, 'script-1');

        const titlePageSource = repository.getScriptTitlePageSource('script-1');
        const settingsSource = repository.getScriptEditorSettingsSource('script-1');
        const titleSnapshots: Array<string | undefined> = [];
        const settingsSnapshots: Array<number | undefined> = [];
        const unsubscribeTitle = await titlePageSource.subscribe(rows => {
            titleSnapshots.push(rows[0]?.settings.contact);
        });
        const unsubscribeSettings = await settingsSource.subscribe(rows => {
            settingsSnapshots.push(rows[0]?.settings.page?.widthPx);
        });
        const now = Date.now();

        await db.insert(dbSchema.scriptSettingsTitlePage).values({
            id: 'title-field-1',
            scriptId: 'script-1',
            fieldKey: 'contact',
            fieldValue: 'Stage door',
            groupNo: null,
            orderNo: 0,
            createdAt: now,
            updatedAt: now,
        });
        await db.insert(dbSchema.scriptSettingsPageLayout).values({
            scriptId: 'script-1',
            widthPx: 720,
            createdAt: now,
            updatedAt: now,
        });

        await waitFor(() => titleSnapshots.includes('Stage door'));
        await waitFor(() => settingsSnapshots.includes(720));

        expect((await titlePageSource.read())[0]?.settings.contact).toBe('Stage door');
        expect((await settingsSource.read())[0]?.settings.page?.widthPx).toBe(720);

        unsubscribeTitle();
        unsubscribeSettings();
    });

    it('observes externally committed attachment metadata and music bindings', async () => {
        const {db} = await createLiveTestDb();
        const repository = createLocalPgliteRepository({
            getLocalDb: () => Promise.resolve(db),
            syncToFs: () => Promise.resolve(),
            fileStorage: new InMemoryFileStorage(),
        });

        await seedScript(db, 'script-1');
        await db.insert(dbSchema.scriptMusic).values({
            id: 'music-1',
            scriptId: 'script-1',
            sceneNumber: 0,
            indexInScene: 0,
            mode: 'open',
            title: 'Music',
            kind: 'song',
            startBlockId: null,
            endBlockId: null,
            createdAt: 1,
            updatedAt: 1,
        });

        const attachments = repository.getScriptAttachmentsSource('script-1');
        const bindings = repository.getScriptMusicAttachmentBindingsSource('script-1');
        const attachmentSnapshots: string[][] = [];
        const bindingSnapshots: string[][] = [];
        const unsubscribeAttachments = await attachments.subscribe(rows => {
            attachmentSnapshots.push(rows.map(row => row.id));
        });
        const unsubscribeBindings = await bindings.subscribe(rows => {
            bindingSnapshots.push(rows.map(row => `${row.musicId}:${row.role}`));
        });

        await db.transaction(async tx => {
            await tx.insert(dbSchema.scriptAttachments).values({
                id: 'attachment-1',
                scriptId: 'script-1',
                filename: 'score.pdf',
                mimeType: 'application/pdf',
                sizeBytes: 3,
                storageKey: 'blob-1',
                createdAt: 1,
                updatedAt: 1,
            });
            await tx.insert(dbSchema.scriptMusicAttachments).values({
                musicId: 'music-1',
                attachmentId: 'attachment-1',
                role: 'integrated_score',
                sortOrder: 1,
                createdAt: 1,
            });
        });

        await waitFor(() => attachmentSnapshots.some(rows => rows.includes('attachment-1')));
        await waitFor(() => bindingSnapshots.some(rows => rows.includes('music-1:integrated_score')));

        unsubscribeAttachments();
        unsubscribeBindings();
    });
});
