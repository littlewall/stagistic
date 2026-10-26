import {
    describe,
    expect,
    it,
} from 'vite-plus/test';

import {startMcpReadBridge} from './startMcpReadBridge';

describe('desktop MCP lifecycle', () => {
    it('does not replace a newer generation when an aborted listener completes late', async () => {
        const abort = new AbortController();
        const events: string[] = [];
        let listened!: (dispose: () => void) => void;
        const listening = new Promise<() => void>(resolve => {
            listened = resolve;
        });
        const started = startMcpReadBridge({
            service: {execute: () => Promise.reject(new Error('unexpected read'))},
            signal: abort.signal,
            transport: {
                listen: () => listening,
                attach: () => {
                    events.push('attach');

                    return Promise.resolve('old-mount');
                },
                detach: () => {
                    events.push('detach');

                    return Promise.resolve();
                },
                reply: () => Promise.resolve(),
            },
        });

        abort.abort();
        listened(() => {
            events.push('unlisten');
        });
        await started;
        expect(events).toEqual(['unlisten']);
    });
    it('detaches the acquired generation if disposed while attach is pending', async () => {
        const abort = new AbortController();
        const events: string[] = [];
        let finish!: (generation: string) => void;
        const attached = new Promise<string>(resolve => {
            finish = resolve;
        });
        const started = startMcpReadBridge({
            service: {execute: () => Promise.reject(new Error('unexpected read'))},
            signal: abort.signal,
            transport: {
                listen: () => {
                    events.push('listen');

                    return Promise.resolve(() => {
                        events.push('unlisten');
                    });
                },
                attach: () => {
                    events.push('attach');

                    return attached;
                },
                detach: generation => {
                    events.push(`detach:${generation}`);

                    return Promise.resolve();
                },
                reply: () => Promise.resolve(),
            },
        });

        await Promise.resolve();
        abort.abort();
        finish('generation-1');
        await started;
        expect(events).toEqual([
            'listen',
            'attach',
            'unlisten',
            'detach:generation-1',
        ]);
    });
});
