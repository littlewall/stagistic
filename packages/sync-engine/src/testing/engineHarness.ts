import {afterEach} from 'vite-plus/test';

import {createSyncEngine} from '../engine/createSyncEngine';
import {createSyncEngineClient} from '../engine/createSyncEngineClient';

export const ENGINE_TEST_SCHEMA = 4;

/** Real (Node) BroadcastChannels, namespaced per test. */
export const createChannels = () => {
    const ns = crypto.randomUUID();

    return {
        controlChannelFactory: () => new BroadcastChannel(`${ns}:engine`) as never,
        docChannelFactory: (name: string) => new BroadcastChannel(`${ns}:${name}`) as never,
    };
};

export const eventually = async (check: () => boolean, timeoutMs = 3_000) => {
    const deadline = Date.now() + timeoutMs;

    while (!check()) {
        if (Date.now() > deadline) {
            throw new Error('condition not met in time');
        }

        await new Promise(resolve => setTimeout(resolve, 10));
    }
};

export const cleanups: Array<() => Promise<void> | void> = [];

afterEach(async () => {
    for (const cleanup of cleanups.splice(0).toReversed()) {
        await cleanup();
    }
});

export const startEngine = (args: Omit<Parameters<typeof createSyncEngine>[0], 'clientSchemaVersion'> & {clientSchemaVersion?: number}) => {
    const engine = createSyncEngine({
        clientSchemaVersion: ENGINE_TEST_SCHEMA,
        projectionDelayMs: 20,
        ...args,
    });

    cleanups.push(() => engine.stop());

    return engine;
};

export const startClient = (channels: ReturnType<typeof createChannels>) => {
    const client = createSyncEngineClient({
        ...channels,
        retryMs: 50,
        timeoutMs: 3_000,
    });

    cleanups.push(() => client.destroy());

    return client;
};

