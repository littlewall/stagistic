import {StartFailureError} from '@stagistic/shared';
import {
    describe,
    expect,
    it,
} from 'vite-plus/test';

import {watchWorkerStart, workerStartMessage} from './workerStart';

const createFakeWorker = () => {
    const target = new EventTarget();

    return {
        addEventListener: target.addEventListener.bind(target),
        removeEventListener: target.removeEventListener.bind(target),
        post: (data: unknown) => target.dispatchEvent(new MessageEvent('message', {data})),
        crash: (message?: string) => target.dispatchEvent(Object.assign(new Event('error'), {message})),
    };
};

describe('watching a database worker start', () => {
    it('forwards the stages the worker reports', () => {
        const worker = createFakeWorker();
        const stages: string[] = [];

        watchWorkerStart(worker, stage => stages.push(stage));
        worker.post(workerStartMessage('loading-assets'));
        worker.post({type: 'rpc-return'});
        worker.post(workerStartMessage('backing-up'));
        worker.post(workerStartMessage('migrating'));
        worker.post(workerStartMessage('ready'));

        expect(stages).toEqual([
            'loading-assets',
            'backing-up',
            'migrating',
            'ready',
        ]);
    });

    it('rejects with the typed failure the worker reports', async () => {
        const worker = createFakeWorker();
        const watch = watchWorkerStart(worker, () => {});

        worker.post(workerStartMessage('failed', {
            kind: 'migration-failed',
            message: 'Migration 0042_x failed',
            migrationId: '0042_x',
        }));

        const failure: unknown = await watch.failed.catch((error: unknown) => error);

        expect(failure).toBeInstanceOf(StartFailureError);
        expect(failure).toMatchObject({kind: 'migration-failed', migrationId: '0042_x'});
    });

    it('rejects as unknown when the worker file cannot be loaded', async () => {
        const worker = createFakeWorker();
        const watch = watchWorkerStart(worker, () => {});

        worker.crash();

        const failure: unknown = await watch.failed.catch((error: unknown) => error);

        expect(failure).toMatchObject({kind: 'unknown'});
        expect((failure as Error).message).toContain('could not be loaded');
    });

    it('stops listening once stopped', async () => {
        const worker = createFakeWorker();
        const stages: string[] = [];
        const watch = watchWorkerStart(worker, stage => stages.push(stage));

        watch.stop();
        worker.post(workerStartMessage('migrating'));
        worker.crash();

        expect(stages).toEqual([]);
        await Promise.race([
            watch.failed.then(() => 'failed', () => 'failed'),
            Promise.resolve('pending'),
        ]).then(result => expect(result).toBe('pending'));
    });
});
