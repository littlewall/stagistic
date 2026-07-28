import {
    describe,
    expect,
    it,
    vi,
} from 'vite-plus/test';

import {createInMemoryReactiveQuerySource} from './inMemoryReactiveQuerySource';

describe('in-memory reactive query source', () => {
    it('delivers initial data, ordered updates, refreshes, and errors', async () => {
        const source = createInMemoryReactiveQuerySource([{id: 'initial'}]);
        const snapshots: string[][] = [];
        const onError = vi.fn();
        const unsubscribe = await source.subscribe(
            rows => snapshots.push(rows.map(row => row.id)),
            onError,
        );

        source.emit([{id: 'second'}]);
        await source.refresh();
        source.emitError(new Error('source failed'));

        expect(snapshots).toEqual([
            ['initial'],
            ['second'],
            ['second'],
        ]);
        expect(onError).toHaveBeenCalledWith(expect.objectContaining({
            message: 'source failed',
        }));

        unsubscribe();
        source.emit([{id: 'ignored'}]);

        expect(source.listenerCount()).toBe(0);
        expect(snapshots).toHaveLength(3);
    });
});
