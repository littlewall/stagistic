import {
    describe,
    expect,
    it,
} from 'vite-plus/test';
import type {Page} from 'playwright';

const loadRunner = () => import('./runRecordedEditorBlocksDemo');

describe('runRecordedEditorBlocksDemo', () => {
    it('waits for the operator before playback and keeps the final state until recording stops', async () => {
        const {runRecordedEditorBlocksDemo} = await loadRunner();
        const events: unknown[] = [];

        await runRecordedEditorBlocksDemo({
            page: {
                addInitScript: async () => {
                    events.push('acknowledgePreview');
                },
                goto: async () => {
                    events.push('goto');
                },
                waitForURL: async () => {
                    events.push('waitForURL');
                },
                getByRole: () => ({
                    focus: async () => {
                        events.push('focus');
                    },
                }),
            } as unknown as Pick<Page, 'addInitScript' | 'goto' | 'waitForURL' | 'getByRole'>,
            driver: {
                typeWordGroups: async () => {
                    events.push('flow');
                },
                typeHuman: async () => {
                    events.push('flow');
                },
                press: async () => {
                    events.push('flow');
                },
                pause: async durationMs => {
                    events.push(['pause', durationMs]);
                },
                waitForBlock: async () => {
                    events.push('flow');
                },
                waitForSuggestions: async () => {
                    events.push('flow');
                },
                waitForMusicPill: async () => {
                    events.push('flow');
                },
            },
            baseUrl: 'http://localhost:3000',
            waitForOperator: async prompt => {
                events.push(['operator', prompt]);
            },
            log: message => {
                events.push(['log', message]);
            },
        });

        expect(events.slice(0, 6)).toEqual([
            'acknowledgePreview',
            'goto',
            'waitForURL',
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

        expect(firstFlowIndex).toBeGreaterThan(6);
        expect(finalHoldIndex).toBeGreaterThan(firstFlowIndex);
        expect(completedIndex).toBeGreaterThan(finalHoldIndex);
        expect(closeIndex).toBeGreaterThan(completedIndex);
    });
});
