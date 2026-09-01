import type {Page} from 'playwright';
import {
    describe,
    expect,
    it,
} from 'vite-plus/test';

const loadRunner = () => import('./runRecordedActsAndScenesDemo');

describe('runRecordedActsAndScenesDemo', () => {
    it('waits for the operator before playback and keeps the final outline visible until recording stops', async () => {
        const {runRecordedActsAndScenesDemo} = await loadRunner();
        const events: unknown[] = [];

        await runRecordedActsAndScenesDemo({
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
                getByRole: () => ({
                    focus: () => {
                        events.push('focus');

                        return Promise.resolve();
                    },
                }),
            } as unknown as Pick<Page, 'addInitScript' | 'goto' | 'waitForURL' | 'getByRole'>,
            driver: {
                typeHuman: () => {
                    events.push('flow');

                    return Promise.resolve();
                },
                typeBlock: () => {
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
                addAct: () => {
                    events.push('flow');

                    return Promise.resolve();
                },
                waitForSecondAct: () => {
                    events.push('flow');

                    return Promise.resolve();
                },
                beginFirstSceneDrag: () => {
                    events.push('flow');

                    return Promise.resolve();
                },
                moveFirstSceneOverSecondAct: () => {
                    events.push('flow');

                    return Promise.resolve();
                },
                dropScene: () => {
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
            && event[0] === 'pause' && event[1] === 2_600);
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
