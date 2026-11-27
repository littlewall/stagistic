import {
    describe,
    expect,
    it,
} from 'vite-plus/test';

import type {PremigrationBackup} from './premigrationBackup';
import {answerPremigrationDumps, createPortPremigrationBackupStore} from './premigrationBackupPort';

const backup = (): PremigrationBackup => ({
    createdAt: 1,
    pgliteVersion: '1',
    targetGeneration: 'g',
    firstPendingMigrationId: 'm',
    data: new ArrayBuffer(4),
});

/** Two ends wired together like a worker and its page. */
const wire = (write: (backup: PremigrationBackup) => Promise<void>, timeoutMs = 1000) => {
    const workerHandlers = new Set<(data: unknown) => void>();
    const pageHandlers = new Set<(event: MessageEvent) => void>();
    const store = createPortPremigrationBackupStore({
        timeoutMs,
        post: message => {
            for (const handler of pageHandlers) {
                handler({data: message} as MessageEvent);
            }
        },
        listen: handler => {
            workerHandlers.add(handler);

            return () => workerHandlers.delete(handler);
        },
    });

    answerPremigrationDumps({
        addEventListener: (_type, handler) => pageHandlers.add(handler),
        removeEventListener: (_type, handler) => pageHandlers.delete(handler),
        postMessage: message => {
            for (const handler of workerHandlers) {
                handler(message);
            }
        },
    }, write);

    return {store, workerHandlers};
};

describe('port premigration backup store', () => {
    it('resolves save once the page has written the dump', async () => {
        const written: PremigrationBackup[] = [];
        const {store, workerHandlers} = wire(value => {
            written.push(value);

            return Promise.resolve();
        });

        await store.save(backup());

        expect(written).toHaveLength(1);
        expect(workerHandlers.size).toBe(0);
    });

    it('rejects save when the page fails to write', async () => {
        const {store} = wire(() => Promise.reject(new Error('disk full')));

        await expect(store.save(backup())).rejects.toThrow('disk full');
    });

    it('rejects save when the page never answers', async () => {
        const {store} = wire(() => new Promise(() => {}), 10);

        await expect(store.save(backup())).rejects.toThrow('did not confirm');
    });

    it('reports no earlier dump', async () => {
        const {store} = wire(() => Promise.resolve());

        expect(await store.load()).toBeNull();
    });
});
