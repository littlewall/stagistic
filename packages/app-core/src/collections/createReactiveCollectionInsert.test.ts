import {createInMemoryReactiveQuerySource} from '@stagistic/db';
import {expect, it} from 'vite-plus/test';

import {createReactiveCollection} from './createReactiveCollection';

it('confirms an insert from the durable record its handler returns', async () => {
    interface ServerTimedRow {
        id: string,
        title: string,
        createdAt: number,
    }

    const source = createInMemoryReactiveQuerySource<ServerTimedRow>([]);
    const {collection} = createReactiveCollection({
        id: `server-timed-${crypto.randomUUID()}`,
        source,
        getKey: (row: ServerTimedRow) => row.id,
        confirmationTimeoutMs: 50,
        handlers: {
            // The server assigns the timestamps; the optimistic copy cannot know them.
            insert: row => {
                const durable = {...row, createdAt: 1_728_000_000_000};

                source.emit([durable]);

                return Promise.resolve(durable);
            },
        },
    });

    await collection.preload();

    const transaction = collection.insert({
        id: 'row-1',
        title: 'Expected',
        createdAt: 0,
    });

    await transaction.isPersisted.promise;
    // The durable snapshot replaces the optimistic copy once the transaction settles.
    await expect.poll(() => collection.get('row-1')?.createdAt).toBe(1_728_000_000_000);

    expect(collection.get('row-1')).toMatchObject({
        id: 'row-1',
        title: 'Expected',
        createdAt: 1_728_000_000_000,
    });
});
