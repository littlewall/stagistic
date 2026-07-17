import {createInMemoryReactiveQuerySource} from '@stagistic/db';
import {
    describe,
    expect,
    it,
    vi,
} from 'vite-plus/test';

import {createReactiveCollection} from './createReactiveCollection';

interface Row {
    id: string,
    title: string,
}

const deferred = () => {
    let resolve: () => void = () => undefined;
    let reject: (error: Error) => void = () => undefined;
    const promise = new Promise<void>((resolvePromise, rejectPromise) => {
        resolve = resolvePromise;
        reject = rejectPromise;
    });

    return {
        promise, resolve, reject,
    };
};

const createTestCollection = (
    createHandler: (source: ReturnType<typeof createInMemoryReactiveQuerySource<Row>>) => (
        original: Row,
        modified: Row,
        changes: Partial<Row>,
    ) => Promise<void>,
    timeout = 2_000,
) => {
    const source = createInMemoryReactiveQuerySource<Row>([{id: 'row-1', title: 'Original'}]);
    const result = createReactiveCollection({
        id: `test-${crypto.randomUUID()}`,
        source,
        getKey: row => row.id,
        confirmationTimeoutMs: timeout,
        handlers: {update: createHandler(source)},
    });

    return {...result, source};
};

describe('reactive collection bridge', () => {
    it('shows an optimistic value before persistence and confirms from the source', async () => {
        const gate = deferred();
        const result = createTestCollection(source => async (_original, modified) => {
            await gate.promise;
            source.emit([modified]);
        });

        await result.collection.preload();

        const transaction = result.collection.update('row-1', draft => {
            draft.title = 'Optimistic';
        });

        expect(result.collection.get('row-1')?.title).toBe('Optimistic');
        await Promise.resolve();
        await Promise.resolve();
        expect(result.status.getSnapshot().mutations[0]).toMatchObject({
            entityKey: 'row-1',
            status: 'pending',
        });

        gate.resolve();
        await transaction.isPersisted.promise;

        expect(result.collection.get('row-1')?.title).toBe('Optimistic');
        expect(result.status.getSnapshot().mutations).toEqual([]);
    });

    it('rolls back and exposes an attributable error when persistence fails', async () => {
        const gate = deferred();
        const result = createTestCollection(() => () => gate.promise);

        await result.collection.preload();

        const transaction = result.collection.update('row-1', draft => {
            draft.title = 'Rejected';
        });

        expect(result.collection.get('row-1')?.title).toBe('Rejected');

        gate.reject(new Error('disk full'));
        await expect(transaction.isPersisted.promise).rejects.toThrow('disk full');

        expect(result.collection.get('row-1')?.title).toBe('Original');

        const failedMutation = result.status.getSnapshot().mutations[0];

        expect(failedMutation).toMatchObject({
            entityKey: 'row-1',
            status: 'failed',
        });
        expect(failedMutation?.error?.message).toBe('disk full');
    });

    it('times out an unconfirmed mutation and rolls it back', async () => {
        const handler = vi.fn(() => Promise.resolve());
        const result = createTestCollection(() => handler, 20);

        await result.collection.preload();

        const transaction = result.collection.update('row-1', draft => {
            draft.title = 'Never committed';
        });

        await expect(transaction.isPersisted.promise).rejects.toThrow(
            'Timed out confirming update for entity row-1',
        );
        expect(result.collection.get('row-1')?.title).toBe('Original');
    });

    it('confirms an update whose source echo differs in key order and empty sections', async () => {
        interface SettingsRow {
            id: string,
            settings: Record<string, unknown>,
        }

        const source = createInMemoryReactiveQuerySource<SettingsRow>([
            {
                id: 'row-1',
                settings: {page: {widthPx: 100}},
            },
        ]);
        const {collection} = createReactiveCollection({
            id: `test-${crypto.randomUUID()}`,
            source,
            getKey: (row: SettingsRow) => row.id,
            confirmationTimeoutMs: 50,
            handlers: {
                update: async (_original, modified) => {
                    /*
                     * Simulate the DB round-trip: sections rebuilt in a fixed
                     * key order plus hydrated-but-empty sections.
                     */
                    source.emit([
                        {
                            id: modified.id,
                            settings: {
                                typography: {},
                                page: modified.settings.page as object,
                                initialPages: {
                                    castAndPlace: {castOrderBy: 'appearance'},
                                    songs: {},
                                },
                            },
                        },
                    ]);

                    return Promise.resolve();
                },
            },
        });

        await collection.preload();

        const transaction = collection.update('row-1', draft => {
            draft.settings = {
                initialPages: {
                    songs: {},
                    castAndPlace: {castOrderBy: 'appearance'},
                },
                page: {widthPx: 100},
            };
        });

        await transaction.isPersisted.promise;

        expect(collection.get('row-1')?.settings).toMatchObject({
            initialPages: {castAndPlace: {castOrderBy: 'appearance'}},
        });
    });

    it('does not confirm an insert from entity identity alone', async () => {
        const source = createInMemoryReactiveQuerySource<Row>([]);
        const result = createReactiveCollection({
            id: `insert-confirmation-${crypto.randomUUID()}`,
            source,
            getKey: row => row.id,
            confirmationTimeoutMs: 20,
            handlers: {
                insert: row => {
                    source.emit([{id: row.id, title: 'Different persisted value'}]);

                    return Promise.resolve();
                },
            },
        });

        await result.collection.preload();

        const transaction = result.collection.insert({
            id: 'row-1',
            title: 'Expected persisted value',
        });

        await expect(transaction.isPersisted.promise).rejects.toThrow(
            'Timed out confirming insert for entity row-1',
        );
    });

    it('rolls back writes when a read-only collection has no persistence handler', async () => {
        const source = createInMemoryReactiveQuerySource<Row>([{id: 'row-1', title: 'Original'}]);
        const result = createReactiveCollection({
            id: `read-only-${crypto.randomUUID()}`,
            source,
            getKey: row => row.id,
        });

        await result.collection.preload();

        const transaction = result.collection.update('row-1', draft => {
            draft.title = 'Not persisted';
        });

        await expect(transaction.isPersisted.promise).rejects.toThrow(
            'Missing update handler for collection read-only-',
        );
        expect(result.collection.get('row-1')?.title).toBe('Original');
    });

    it('exposes confirmed rows from the collection source subscription', async () => {
        const source = createInMemoryReactiveQuerySource<Row>([{id: 'row-1', title: 'Original'}]);
        const result = createReactiveCollection({
            id: `confirmed-${crypto.randomUUID()}`,
            source,
            getKey: row => row.id,
        });

        await result.collection.preload();

        expect(result.confirmed.getSnapshot()).toMatchObject({
            isReady: true,
            rows: [{id: 'row-1', title: 'Original'}],
        });

        source.emit([{id: 'row-1', title: 'External'}]);

        expect(result.confirmed.getSnapshot().rows).toEqual([{id: 'row-1', title: 'External'}]);
    });

    it('serializes rapid writes to one entity so the newest intent wins', async () => {
        const gates = [deferred(), deferred()];
        const persisted: string[] = [];
        const result = createTestCollection(source => async (_original, modified) => {
            const index = persisted.length;

            persisted.push(modified.title);
            await gates[index]?.promise;
            source.emit([{id: modified.id, title: modified.title}]);
        });

        await result.collection.preload();

        const first = result.collection.update('row-1', draft => {
            draft.title = 'First';
        });
        const second = result.collection.update('row-1', draft => {
            draft.title = 'Second';
        });

        expect(result.collection.get('row-1')?.title).toBe('Second');
        await Promise.resolve();
        await Promise.resolve();
        expect(persisted).toEqual(['First']);

        gates[0]?.resolve();
        await first.isPersisted.promise;
        expect(persisted).toEqual(['First', 'Second']);

        gates[1]?.resolve();
        await second.isPersisted.promise;

        expect(result.collection.get('row-1')?.title).toBe('Second');
    });

    it('hydrates and confirms a feature-length collection within budget', async () => {
        const rows = Array.from({length: 400}, (_, index) => ({
            id: `row-${index}`,
            title: `Scene ${index}`,
        }));
        const source = createInMemoryReactiveQuerySource<Row>(rows);
        const result = createReactiveCollection({
            id: `scale-${crypto.randomUUID()}`,
            source,
            getKey: row => row.id,
            handlers: {
                update: (_original, modified) => {
                    source.emit(rows.map(row => {
                        return row.id === modified.id ? modified : row;
                    }));

                    return Promise.resolve();
                },
            },
        });
        const hydrationStartedAt = performance.now();

        await result.collection.preload();

        const hydrationMs = performance.now() - hydrationStartedAt;

        expect(result.collection.get('row-399')?.title).toBe('Scene 399');
        expect(hydrationMs).toBeLessThan(500);

        const confirmationStartedAt = performance.now();
        const transaction = result.collection.update('row-399', draft => {
            draft.title = 'Finale';
        });

        await transaction.isPersisted.promise;

        const confirmationMs = performance.now() - confirmationStartedAt;

        expect(result.collection.get('row-399')?.title).toBe('Finale');
        expect(confirmationMs).toBeLessThan(500);
    });
});
