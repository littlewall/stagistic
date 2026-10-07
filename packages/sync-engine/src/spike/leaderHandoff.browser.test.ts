/*
 * Phase 0 spike: tabs keep replicas, the leader worker owns persistence.
 * Kills the leader mid-session and checks the next leader loses nothing.
 */
import {
    describe,
    expect,
    it,
} from 'vite-plus/test';
import * as Y from 'yjs';

import {createBroadcastSync} from '../tabs/broadcastSync';
import {
    block,
    blockText,
    doc,
} from '../testing/fixtures';
import {bodyDocToScriptDocument, seedBodyDoc} from '../ydoc/bodyCodec';

const startWorker = (id: string, docName: string, lock: string) => {
    const url = new URL('./leaderWorker.ts', import.meta.url);

    url.searchParams.set('id', id);
    url.searchParams.set('doc', docName);
    url.searchParams.set('lock', lock);

    return new Worker(url, {type: 'module'});
};

const waitFor = <T>(worker: Worker, type: string) => new Promise<T>(resolve => {
    const listener = (event: MessageEvent) => {
        if ((event.data as {type?: string} | null)?.type === type) {
            worker.removeEventListener('message', listener);
            resolve(event.data as T);
        }
    };

    worker.addEventListener('message', listener);
});

const snapshot = async (worker: Worker) => {
    const reply = waitFor<{document: ReturnType<typeof bodyDocToScriptDocument>}>(worker, 'snapshot');

    worker.postMessage({type: 'snapshot'});

    return (await reply).document;
};

const eventually = async (check: () => Promise<boolean> | boolean, timeoutMs = 5_000) => {
    const deadline = performance.now() + timeoutMs;

    while (performance.now() < deadline) {
        if (await check()) {
            return;
        }

        await new Promise(resolve => setTimeout(resolve, 50));
    }

    throw new Error('condition not met in time');
};

describe('leader handoff', () => {
    it('two tabs stay in sync and the next leader loads everything after the first dies', async () => {
        const runId = crypto.randomUUID();
        const docName = `script/${runId}/body`;
        const lock = `leader-${runId}`;

        const tabA = new Y.Doc();
        const tabB = new Y.Doc();

        seedBodyDoc(tabA, doc(block('scene', 's1', 'Scene'), block('dialogue', 'd1', 'Line')));
        createBroadcastSync(tabA, docName);
        createBroadcastSync(tabB, docName);

        await eventually(() => JSON.stringify(bodyDocToScriptDocument(tabB)) === JSON.stringify(bodyDocToScriptDocument(tabA)));

        const workers = [startWorker('w1', docName, lock), startWorker('w2', docName, lock)];
        // Whichever worker gets the lock first leads.
        const {workerId} = await Promise.race(workers.map(worker => waitFor<{workerId: string}>(worker, 'leader')));
        const [first, second] = (workerId === 'w1' ? workers : [...workers].reverse()) as [Worker, Worker];

        await eventually(async () => (await snapshot(first))?.content.length === 2);

        blockText(tabB, 1).insert(4, ' from B');
        await eventually(async () => JSON.stringify(await snapshot(first)) === JSON.stringify(bodyDocToScriptDocument(tabB)));
        // let y-indexeddb flush
        await new Promise(resolve => setTimeout(resolve, 300));

        const secondIsLeader = waitFor(second, 'leader');

        first.terminate();
        // Edits made while no leader is running stay in the tab replicas.
        blockText(tabA, 0).insert(5, ' (gap)');

        await secondIsLeader;
        await eventually(async () => JSON.stringify(await snapshot(second)) === JSON.stringify(bodyDocToScriptDocument(tabA)));

        const final = await snapshot(second);

        expect(final?.content.map(node => node.content?.[0]?.text)).toEqual(['Scene (gap)', 'Line from B']);
        await eventually(() => JSON.stringify(bodyDocToScriptDocument(tabB)) === JSON.stringify(final));

        second.terminate();
    });
});
