/*
 * Memory over time: repeated load cycles, then idle sampling without forced GC.
 * Answers: does RSS drop when idle, and does it plateau across cycles?
 */
import {HocuspocusProvider, HocuspocusProviderWebsocket} from '@hocuspocus/provider';
import {getBodyFragment, seedBodyDoc} from '@stagistic/sync-engine';
import {buildLongScript} from '@stagistic/sync-engine/testing';
import * as Y from 'yjs';

const SERVER_URL = process.env.SYNC_URL ?? 'ws://localhost:1234';
const HTTP_URL = process.env.METRICS_URL ?? 'http://localhost:1234';
const DOCS = Number(process.env.DOCS ?? 50);
const CYCLES = Number(process.env.CYCLES ?? 3);
const EDIT_SECONDS = Number(process.env.EDIT_SECONDS ?? 20);
const IDLE_SECONDS = Number(process.env.IDLE_SECONDS ?? 300);
const SAMPLE_SECONDS = Number(process.env.SAMPLE_SECONDS ?? 30);
const RUN_ID = `${Date.now()}`;

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
const metrics = async () => (await fetch(`${HTTP_URL}/metrics`)).json() as Promise<{
    rssMb: number,
    heapUsedMb: number,
    documentsLoaded: number,
}>;

const connect = (name: string) => new Promise<{doc: Y.Doc, close: () => void}>(resolve => {
    const doc = new Y.Doc();
    const socket = new HocuspocusProviderWebsocket({url: SERVER_URL});
    const provider = new HocuspocusProvider({
        name,
        document: doc,
        websocketProvider: socket,
        token: 'spike',
        onSynced: () => resolve({
            doc,
            close: () => {
                provider.destroy();
                socket.destroy();
            },
        }),
    });

    provider.attach();
});

const samples: Array<{
    cycle: number,
    phase: string,
    t: number,
    rssMb: number,
    heapUsedMb: number,
    docs: number,
}> = [];
const start = performance.now();
const sample = async (cycle: number, phase: string) => {
    const m = await metrics();

    samples.push({
        cycle,
        phase,
        t: Math.round((performance.now() - start) / 1000),
        rssMb: Math.round(m.rssMb),
        heapUsedMb: Math.round(m.heapUsedMb),
        docs: m.documentsLoaded,
    });
};

await sample(0, 'start');

for (let cycle = 1; cycle <= CYCLES; cycle++) {
    const clients = [];

    for (let index = 0; index < DOCS; index++) {
        const name = `mem-${RUN_ID}/script/${index}/body`;
        const owner = await connect(name);

        if (getBodyFragment(owner.doc).length === 0) {
            seedBodyDoc(owner.doc, buildLongScript(30, 10, `m${index}`));
        }

        clients.push(owner, await connect(name));
    }

    const deadline = performance.now() + EDIT_SECONDS * 1_000;

    while (performance.now() < deadline) {
        for (const client of clients) {
            const fragment = getBodyFragment(client.doc);

            ((fragment.get(Math.floor(Math.random() * fragment.length)) as Y.XmlElement).get(0) as Y.XmlText | undefined)?.insert(0, 'x');
        }

        await sleep(1_000);
    }

    await sample(cycle, 'peak');
    clients.forEach(client => client.close());

    for (let elapsed = 0; elapsed < IDLE_SECONDS; elapsed += SAMPLE_SECONDS) {
        await sleep(SAMPLE_SECONDS * 1_000);
        await sample(cycle, 'idle');
    }
}

await fetch(`${HTTP_URL}/gc`);
await sleep(2_000);
await sample(CYCLES, 'forced-gc');

console.log(JSON.stringify(samples));
process.exit(0);
