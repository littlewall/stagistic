/*
 * Phase 0 headless bench. Runs N docs × 2 clients (one socket each) against
 * the spike server through Toxiproxy and prints a JSON report:
 * - idle RSS with all docs loaded
 * - edit → peer latency (p50/p95) under steady typing
 * - server CPU, load/store timings, DB write volume
 * - initial sync of a long script (time, bytes, deflate estimate)
 * - cold reload after unload (load timings)
 */
import {deflateRawSync} from 'node:zlib';

import {HocuspocusProvider, HocuspocusProviderWebsocket} from '@hocuspocus/provider';
import {getBodyFragment, seedBodyDoc} from '@stagistic/sync-engine';
import {buildLongScript} from '@stagistic/sync-engine/testing';
import * as Y from 'yjs';

import {createHistogram} from './histogram';
import {configureToxics} from './toxics';

const SERVER_URL = process.env.SYNC_URL ?? 'ws://localhost:8001';
const HTTP_URL = process.env.METRICS_URL ?? 'http://localhost:1234';
const DOCS = Number(process.env.DOCS ?? 50);
const CLIENTS_PER_DOC = Number(process.env.CLIENTS_PER_DOC ?? 2);
const EDIT_SECONDS = Number(process.env.EDIT_SECONDS ?? 60);
const EDIT_INTERVAL_MS = Number(process.env.EDIT_INTERVAL_MS ?? 1_000);
const DB_LATENCY_MS = Number(process.env.DB_LATENCY_MS ?? 1);
const CLIENT_LATENCY_MS = Number(process.env.CLIENT_LATENCY_MS ?? 25);
const RUN_ID = process.env.RUN_ID ?? `${Date.now()}`;

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const traffic = {
    received: 0,
    receivedDeflated: 0,
    sent: 0,
    messages: 0,
};

/** WebSocket wrapper counting payload bytes (and a raw-deflate estimate). */
class CountingWebSocket extends WebSocket {
    constructor(url: string | URL, protocols?: string | string[]) {
        super(url, protocols);
        this.binaryType = 'arraybuffer';
        this.addEventListener('message', event => {
            const data = event.data instanceof ArrayBuffer ? new Uint8Array(event.data) : new TextEncoder().encode(String(event.data));

            traffic.received += data.byteLength;
            traffic.receivedDeflated += deflateRawSync(data).byteLength;
            traffic.messages++;
        });
    }

    override send(data: string | ArrayBufferLike | Blob | ArrayBufferView) {
        traffic.sent += typeof data === 'string' ? data.length : (data as ArrayBufferView).byteLength ?? 0;
        super.send(data);
    }
}

const resetTraffic = () => {
    traffic.received = 0;
    traffic.receivedDeflated = 0;
    traffic.sent = 0;
    traffic.messages = 0;
};

interface Client {
    doc: Y.Doc,
    provider: HocuspocusProvider,
    socket: HocuspocusProviderWebsocket,
}

const connect = (name: string, doc = new Y.Doc()): Promise<Client & {syncMs: number}> => {
    const start = performance.now();
    const socket = new HocuspocusProviderWebsocket({url: SERVER_URL, WebSocketPolyfill: CountingWebSocket});

    return new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error(`sync timeout for ${name}`)), 60_000);
        const provider = new HocuspocusProvider({
            name,
            document: doc,
            websocketProvider: socket,
            token: 'spike',
            onSynced: () => {
                clearTimeout(timer);
                resolve({
                    doc,
                    provider,
                    socket,
                    syncMs: performance.now() - start,
                });
            },
        });

        // Providers sharing a socket must be attached explicitly (Hocuspocus v4).
        provider.attach();
    });
};

const disconnect = (client: Client) => {
    client.provider.destroy();
    client.socket.destroy();
};

const serverMetrics = async () => (await fetch(`${HTTP_URL}/metrics`)).json() as Promise<Record<string, unknown>>;
const resetServerMetrics = () => fetch(`${HTTP_URL}/metrics/reset`);
const serverGc = () => fetch(`${HTTP_URL}/gc`);

const docName = (index: number) => `spike-${RUN_ID}/script/${index}/body`;

const main = async () => {
    await configureToxics({dbLatencyMs: DB_LATENCY_MS, clientLatencyMs: CLIENT_LATENCY_MS});
    await serverGc();
    await sleep(500);

    const baseline = await serverMetrics();

    // Seed: one client per doc writes a medium script.
    const clients: Client[] = [];

    for (let index = 0; index < DOCS; index++) {
        const owner = await connect(docName(index));

        if (getBodyFragment(owner.doc).length === 0) {
            seedBodyDoc(owner.doc, buildLongScript(30, 10, `d${index}`));
        }

        clients.push(owner);
    }

    for (let index = 0; index < DOCS; index++) {
        for (let extra = 1; extra < CLIENTS_PER_DOC; extra++) {
            clients.push(await connect(docName(index)));
        }
    }

    await sleep(DB_LATENCY_MS * 10 + 3_000);
    await serverGc();
    await sleep(1_000);

    const idle = await serverMetrics();

    /*
     * Steady typing: every client edits on a jittered interval; each edit
     * carries a probe timestamp that peers on the same doc measure.
     */
    await resetServerMetrics();

    const latency = createHistogram();
    const probeKey = 'probe';

    clients.forEach((client, clientIndex) => {
        client.doc.getMap<{from: number, t: number}>(probeKey).observe(event => {
            if (event.transaction.local) {
                return;
            }

            const probe = client.doc.getMap<{from: number, t: number}>(probeKey).get('last');

            if (probe && probe.from !== clientIndex) {
                latency.record(performance.now() - probe.t);
            }
        });
    });

    const deadline = performance.now() + EDIT_SECONDS * 1_000;
    let edits = 0;

    await Promise.all(clients.map(async (client, clientIndex) => {
        await sleep(Math.random() * EDIT_INTERVAL_MS);

        while (performance.now() < deadline) {
            const fragment = getBodyFragment(client.doc);
            const target = fragment.get(Math.floor(Math.random() * fragment.length)) as Y.XmlElement;
            const text = target.get(0) as Y.XmlText | undefined;

            client.doc.transact(() => {
                text?.insert(0, 'x');
                client.doc.getMap(probeKey).set('last', {from: clientIndex, t: performance.now()});
            });
            edits++;
            await sleep(EDIT_INTERVAL_MS * (0.5 + Math.random()));
        }
    }));

    await sleep(DB_LATENCY_MS * 10 + 3_000);

    const load = await serverMetrics();

    // Initial sync of a long script for a fresh client.
    const longName = `spike-${RUN_ID}/script/long/body`;
    const longWriter = await connect(longName);

    seedBodyDoc(longWriter.doc, buildLongScript(200, 25, 'long'));
    await sleep(3_000);

    resetTraffic();

    const longReader = await connect(longName);
    const longSync = {
        syncMs: longReader.syncMs,
        blocks: getBodyFragment(longReader.doc).length,
        stateBytes: Y.encodeStateAsUpdate(longReader.doc).byteLength,
        receivedBytes: traffic.received,
        receivedDeflatedBytes: traffic.receivedDeflated,
    };

    disconnect(longWriter);
    disconnect(longReader);

    // Cold reload: everyone leaves (docs unload), then one client per doc returns.
    clients.forEach(disconnect);
    await sleep(DB_LATENCY_MS * 10 + 3_000);
    await resetServerMetrics();

    const reconnectMs = createHistogram();
    const returning: Client[] = [];

    for (let index = 0; index < DOCS; index++) {
        const client = await connect(docName(index));

        reconnectMs.record(client.syncMs);
        returning.push(client);
    }

    const reload = await serverMetrics();

    returning.forEach(disconnect);
    await sleep(3_000);
    await serverGc();
    await sleep(1_000);

    const afterUnload = await serverMetrics();

    const report = {
        config: {
            DOCS,
            CLIENTS_PER_DOC,
            EDIT_SECONDS,
            EDIT_INTERVAL_MS,
            DB_LATENCY_MS,
            CLIENT_LATENCY_MS,
        },
        baseline: {
            rssMb: baseline.rssMb,
            heapUsedMb: baseline.heapUsedMb,
            runtime: baseline.runtime,
        },
        idle: {
            rssMb: idle.rssMb,
            heapUsedMb: idle.heapUsedMb,
            connectionsOpen: idle.connectionsOpen,
            documentsLoaded: idle.documentsLoaded,
            db: idle.db,
        },
        load: {
            edits,
            editsPerSecond: edits / EDIT_SECONDS,
            latencyMs: latency.summary(),
            cpuPercent: load.cpuPercent,
            rssMb: load.rssMb,
            storeMs: load.storeMs,
            appendMs: load.appendMs,
            dbWrites: load.dbWrites,
            dbWriteBytes: load.dbWriteBytes,
            db: load.db,
        },
        longSync,
        reload: {reconnectMs: reconnectMs.summary(), loadMs: reload.loadMs},
        afterUnload: {
            rssMb: afterUnload.rssMb,
            heapUsedMb: afterUnload.heapUsedMb,
            documentsLoaded: afterUnload.documentsLoaded,
        },
    };

    console.log(JSON.stringify(report, null, 2));
    process.exit(0);
};

await main();
