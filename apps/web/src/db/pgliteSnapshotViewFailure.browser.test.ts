import {dismissRuntimeFileFailure, getRuntimeFileFailure} from '@stagistic/app-core';
import {
    afterEach,
    describe,
    expect,
    it,
} from 'vite-plus/test';

import {openSnapshotViewDb} from './index';

const blobWorkerUrls: string[] = [];

afterEach(() => {
    dismissRuntimeFileFailure();
    blobWorkerUrls.splice(0).forEach(url => URL.revokeObjectURL(url));
});

describe('the Script Version preview database', () => {
    it('starts without reporting anything when its worker loads', async () => {
        const db = await openSnapshotViewDb();

        expect(db).toBeDefined();
        expect(getRuntimeFileFailure()).toBeNull();
    });

    it('asks for a reload when its worker file is gone and the host answers with a page instead', async () => {
        await expect(openSnapshotViewDb({
            workerFactory: () => new Worker('/stagistic-removed-worker-1a2b3c.js', {type: 'module'}),
        })).rejects.toBeDefined();

        expect(getRuntimeFileFailure()).toContain('Script Version preview');
    });

    it('does not wait for ever on a worker that never answers', async () => {
        const url = URL.createObjectURL(new Blob(['// loads, but never answers'], {type: 'text/javascript'}));

        blobWorkerUrls.push(url);

        await expect(openSnapshotViewDb({
            workerFactory: () => new Worker(url, {type: 'module'}),
            timeoutMs: 400,
        })).rejects.toThrow('did not answer');

        expect(getRuntimeFileFailure()).toContain('Script Version preview');
    });
});
