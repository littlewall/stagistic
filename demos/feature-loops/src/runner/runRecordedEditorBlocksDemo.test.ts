import type {Page} from 'playwright';
import {
    describe,
    expect,
    it,
} from 'vite-plus/test';

const loadRunner = () => import('./runRecordedEditorBlocksDemo');

describe('runRecordedEditorBlocksDemo', () => {
    it('waits for the operator before playback and keeps the final state until recording stops', async () => {
        const {runRecordedEditorBlocksDemo} = await loadRunner();
        const events: unknown[] = [];

        await runRecordedEditorBlocksDemo({
            page: {
                addInitScript: () => {
                    events.push('acknowledgePreview');

                    return Promise.resolve();
                },
                goto: () => {
                    events.push('goto');

                    return Promise.resolve();
                },
                waitForURL: () => {
                    events.push('waitForURL');

                    return Promise.resolve();
                },
                addStyleTag: () => {
                    events.push('addDemoStyle');

                    return Promise.resolve();
                },
                getByRole: () => ({
                    focus: () => {
                        events.push('focus');

                        return Promise.resolve();
                    },
                }),
            } as unknown as Pick<Page, 'addInitScript' | 'addStyleTag' | 'goto' | 'waitForURL' | 'getByRole'>,
            driver: {
                typeWordGroups: () => {
                    events.push('flow');

                    return Promise.resolve();
                },
                typeHuman: () => {
                    events.push('flow');

                    return Promise.resolve();
                },
                press: () => {
                    events.push('flow');

                    return Promise.resolve();
                },
                pause: durationMs => {
                    events.push(['pause', durationMs]);

                    return Promise.resolve();
                },
                moveToBlock: () => {
                    events.push('flow');

                    return Promise.resolve();
                },
                waitForSuggestions: () => {
                    events.push('flow');

                    return Promise.resolve();
                },
                waitForMusicPill: () => {
                    events.push('flow');

                    return Promise.resolve();
                },
            },
            baseUrl: 'http://localhost:3000',
            waitForOperator: prompt => {
                events.push(['operator', prompt]);

                return Promise.resolve();
            },
            log: message => {
                events.push(['log', message]);
            },
        });

        expect(events.slice(0, 7)).toEqual([
            'acknowledgePreview',
            'goto',
            'waitForURL',
            'addDemoStyle',
            'focus',
            ['log', 'Ready for Recordly. Start recording, then press Enter here.'],
            ['operator', 'Start flow'],
        ]);

        const firstFlowIndex = events.findIndex(event => event === 'flow');
        const finalHoldIndex = events.findIndex(event => Array.isArray(event)
            && event[0] === 'pause' && event[1] === 1_400);
        const completedIndex = events.findIndex(event => Array.isArray(event)
            && event[0] === 'log' && event[1] === 'Flow complete. Stop Recordly, then press Enter to close the browser.');
        const closeIndex = events.findIndex(event => Array.isArray(event)
            && event[0] === 'operator' && event[1] === 'Close browser');

        expect(firstFlowIndex).toBeGreaterThan(7);
        expect(finalHoldIndex).toBeGreaterThan(firstFlowIndex);
        expect(completedIndex).toBeGreaterThan(finalHoldIndex);
        expect(closeIndex).toBeGreaterThan(completedIndex);
    });
});
