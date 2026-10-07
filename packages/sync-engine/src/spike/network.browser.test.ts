/*
 * Phase 0 spike against the bench server (docker-compose.bench.yml):
 *   SYNC_SPIKE_URL=ws://localhost:1234 moon run sync-engine:test-browser
 * Skipped without SYNC_SPIKE_URL.
 */
import {
    HocuspocusProvider,
    HocuspocusProviderWebsocket,
    WebSocketStatus,
} from '@hocuspocus/provider';
import {
    describe,
    expect,
    it,
} from 'vite-plus/test';
import * as Y from 'yjs';

import {classifyScripts} from '../conflicts/classify';
import {replaceOnCloudState} from '../conflicts/replaceOnCloudState';
import {countDifferingScenes} from '../conflicts/sceneDiff';
import {
    block,
    blockText,
    buildLongScript,
    doc,
} from '../testing/fixtures';
import {
    bodyDocToScriptDocument,
    getBodyFragment,
    replaceBodyContent,
    seedBodyDoc,
} from '../ydoc/bodyCodec';
import {encodeStateVectorBase64, hasChangedSince} from '../ydoc/stateVector';

const SERVER_URL = (import.meta as unknown as {env: Record<string, string>}).env.SYNC_SPIKE_URL;

interface Client {
    doc: Y.Doc,
    socket: HocuspocusProviderWebsocket,
    provider: HocuspocusProvider,
}

const connect = (name: string, ydoc = new Y.Doc()) => new Promise<Client>(resolve => {
    const socket = new HocuspocusProviderWebsocket({url: SERVER_URL});
    const provider: HocuspocusProvider = new HocuspocusProvider({
        name,
        document: ydoc,
        websocketProvider: socket,
        token: 'spike',
        onSynced: () => resolve({
            doc: ydoc,
            socket,
            provider,
        }),
    });

    provider.attach();
});

const close = (client: Client) => {
    client.provider.destroy();
    client.socket.destroy();
};

const json = (ydoc: Y.Doc) => JSON.stringify(bodyDocToScriptDocument(ydoc));

const eventually = async (check: () => boolean, timeoutMs = 5_000) => {
    const deadline = performance.now() + timeoutMs;

    while (!check()) {
        if (performance.now() > deadline) {
            throw new Error('condition not met in time');
        }

        await new Promise(resolve => setTimeout(resolve, 25));
    }
};

/** Pending ops reached the server: a fresh reader sees `expected`. */
const cloudEquals = async (name: string, expected: string) => {
    await eventually(() => true);

    const reader = await connect(name);

    try {
        await eventually(() => json(reader.doc) === expected);
    } finally {
        close(reader);
    }
};

describe.skipIf(!SERVER_URL)('network (spike server)', () => {
    it('network outage: edits on both sides merge automatically', async () => {
        const name = `net-${crypto.randomUUID()}/body`;
        const a = await connect(name);

        seedBodyDoc(a.doc, doc(block('scene', 's1', 'To be or not to be'), block('dialogue', 'd1', 'That is the question')));

        const b = await connect(name);

        await eventually(() => json(b.doc) === json(a.doc));

        a.socket.disconnect();
        // connect() is a no-op until the close completes (status still "connected").
        await eventually(() => a.socket.status === WebSocketStatus.Disconnected);
        // Different blocks + the same sentence on both sides.
        blockText(a.doc, 1).insert(0, 'A: ');
        blockText(b.doc, 0).insert(5, ' (B)');
        blockText(a.doc, 0).insert(18, ' (A)');

        await a.socket.connect();
        await eventually(() => json(a.doc) === json(b.doc));

        expect(bodyDocToScriptDocument(a.doc).content.map(node => node.content?.[0]?.text)).toEqual([
            'To be (B) or not to be (A)',
            'A: That is the question',
        ]);

        close(a);
        close(b);
    });

    it('signed-out edits vs cloud edits: conflict, scene count, "use newer" (local) without duplicates', async () => {
        const name = `conflict-${crypto.randomUUID()}/body`;
        const device = await connect(name);

        seedBodyDoc(device.doc, buildLongScript(6, 2, 'v1'));
        await cloudEquals(name, json(device.doc));

        // Sign-out: remember what was synced, disconnect, keep editing locally.
        const syncedVector = encodeStateVectorBase64(device.doc);
        const lastSyncedAt = Date.now();

        close(device);
        blockText(device.doc, 2).insert(0, 'LOCAL ');
        blockText(device.doc, 7).insert(0, 'LOCAL ');

        // Another signed-in device edits a different scene meanwhile.
        const other = await connect(name);

        blockText(other.doc, 12).insert(0, 'CLOUD ');

        const cloudUpdatedAt = Date.now() + 1;

        await cloudEquals(name, json(other.doc));

        // Sign-in check: classify, then fetch cloud state without merging.
        const plan = classifyScripts({
            accountId: 'acc',
            lastSyncedAt,
            local: [
                {
                    scriptId: name,
                    boundAccountId: 'acc',
                    changedSinceSync: hasChangedSince(device.doc, syncedVector),
                },
            ],
            tombstones: [],
            cloud: [
                {
                    scriptId: name,
                    updatedAt: cloudUpdatedAt,
                    deletedAt: null,
                },
            ],
        });

        expect(plan.conflicts).toEqual([name]);

        const scratch = await connect(name);
        const cloudState = Y.encodeStateAsUpdate(scratch.doc);

        // Scenes s0/s1 changed locally ("LOCAL"), s2 in the cloud ("CLOUD")
        expect(countDifferingScenes(bodyDocToScriptDocument(device.doc), bodyDocToScriptDocument(scratch.doc))).toBe(3);

        // Use newer = local: replacement ops on top of the cloud state, sent via the scratch connection.
        const localDocument = bodyDocToScriptDocument(device.doc);
        const replacement = replaceOnCloudState(cloudState, cloudDoc => replaceBodyContent(cloudDoc, localDocument));

        Y.applyUpdate(scratch.doc, replacement.update);

        // The other device converges to the local content with no duplicated blocks.
        await eventually(() => json(other.doc) === JSON.stringify(localDocument));
        expect(getBodyFragment(other.doc).length).toBe(localDocument.content.length);

        close(scratch);
        close(other);
    });

    it('"keep both": the cloud stays unchanged, the local copy gets new ids', async () => {
        const name = `keep-${crypto.randomUUID()}/body`;
        const writer = await connect(name);

        seedBodyDoc(writer.doc, buildLongScript(2, 2, 'orig'));

        const cloudJson = json(writer.doc);

        await cloudEquals(name, cloudJson);
        close(writer);

        // Local divergent copy -> new script id + fresh Y.Doc seeded once.
        const localCopy = bodyDocToScriptDocument(writer.doc);
        const copyDoc = new Y.Doc();

        seedBodyDoc(copyDoc, {
            ...localCopy,
            content: localCopy.content.map(node => ({...node, attrs: {...node.attrs, id: `copy-${node.attrs?.id as string}`}})),
        });

        await cloudEquals(name, cloudJson);
        expect(json(copyDoc)).not.toBe(cloudJson);
    });
});
