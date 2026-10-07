/*
 * Phase 0 spike: stand-in for the PGlite leader worker. Waits for the leader
 * Web Lock, then loads the doc from y-indexeddb and joins the tab replicas
 * over BroadcastChannel.
 */
import {IndexeddbPersistence} from 'y-indexeddb';
import * as Y from 'yjs';

import {createBroadcastSync} from '../tabs/broadcastSync';
import {bodyDocToScriptDocument} from '../ydoc/bodyCodec';

const workerScope = self as unknown as {postMessage(message: unknown): void, onmessage: ((event: MessageEvent) => void) | null};
const params = new URL(self.location.href).searchParams;
const docName = params.get('doc') ?? 'script/spike/body';
const workerId = params.get('id') ?? 'worker';

let doc: Y.Doc | null = null;

void navigator.locks.request(params.get('lock') ?? 'stagistic-sync-leader', async () => {
    doc = new Y.Doc();

    const persistence = new IndexeddbPersistence(docName, doc);

    await persistence.whenSynced;
    createBroadcastSync(doc, docName);
    workerScope.postMessage({type: 'leader', workerId});

    // Hold the lock until the worker is terminated.
    await new Promise(() => {});
});

workerScope.onmessage = event => {
    if ((event.data as {type?: string} | null)?.type === 'snapshot') {
        workerScope.postMessage({
            type: 'snapshot',
            workerId,
            document: doc ? bodyDocToScriptDocument(doc) : null,
        });
    }
};
