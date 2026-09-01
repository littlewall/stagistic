import type {Page} from 'playwright';
import {
    describe,
    expect,
    it,
} from 'vite-plus/test';

const loadDriver = () => import('./createPlaywrightActsAndScenesDriver');

describe('createPlaywrightActsAndScenesDriver', () => {
    it('types headings character by character, fills scene blocks atomically, and drops halfway to the act', async () => {
        const {createPlaywrightActsAndScenesDriver} = await loadDriver();
        const events: unknown[] = [];
        const secondAct = {
            waitFor: (options: unknown) => {
                events.push(['waitForSecondAct', options]);

                return Promise.resolve();
            },
            boundingBox: () => {
                events.push(['secondActBox']);

                return Promise.resolve({
                    x: 80, y: 40, width: 40, height: 20,
                });
            },
        };
        const page = {
            keyboard: {
                insertText: (text: string) => {
                    events.push(['insertText', text]);

                    return Promise.resolve();
                },
                type: (text: string) => {
                    events.push(['type', text]);

                    return Promise.resolve();
                },
                press: (key: string) => {
                    events.push(['press', key]);

                    return Promise.resolve();
                },
            },
            waitForTimeout: (durationMs: number) => {
                events.push(['pause', durationMs]);

                return Promise.resolve();
            },
            evaluate: (_callback: unknown, arg?: unknown) => {
                events.push(['moveToBlock', arg]);

                return Promise.resolve();
            },
            getByRole: (_role: string, options: {name: string}) => {
                if (options.name === 'Add act') {
                    return {
                        click: () => {
                            events.push(['addAct']);

                            return Promise.resolve();
                        },
                    };
                }

                return {
                    first: () => ({
                        boundingBox: () => {
                            events.push(['firstSceneBox']);

                            return Promise.resolve({
                                x: 10, y: 10, width: 20, height: 10,
                            });
                        },
                    }),
                };
            },
            locator: (selector: string) => ({
                click: () => {
                    events.push(['blockClick', selector]);

                    return Promise.resolve();
                },
                nth: (index: number) => {
                    events.push([
                        'nth',
                        selector,
                        index,
                    ]);

                    return secondAct;
                },
            }),
            mouse: {
                move: (x: number, y: number, options?: unknown) => {
                    events.push([
                        'mouseMove',
                        x,
                        y,
                        options,
                    ]);

                    return Promise.resolve();
                },
                down: () => {
                    events.push(['mouseDown']);

                    return Promise.resolve();
                },
                up: () => {
                    events.push(['mouseUp']);

                    return Promise.resolve();
                },
            },
        };
        const driver = createPlaywrightActsAndScenesDriver(
            page as unknown as Pick<Page, 'keyboard' | 'waitForTimeout' | 'getByRole' | 'locator' | 'mouse'>,
        );

        const humanDriver = driver as unknown as {
            typeHuman: (text: string) => Promise<void>,
            typeBlock: (text: string) => Promise<void>,
            moveToBlockEnd: (blockId: string) => Promise<void>,
        };

        await humanDriver.typeHuman('THE');
        await humanDriver.typeBlock('Vines climb the glass walls.');
        await driver.press('Control+1');
        await driver.pause(600);
        await humanDriver.moveToBlockEnd('acts-demo-station-dialogue-2');
        await driver.addAct();
        await driver.waitForSecondAct();
        await driver.beginFirstSceneDrag();
        await driver.moveFirstSceneOverSecondAct();
        await driver.dropScene();

        expect(events).toEqual([
            ['type', 'T'],
            ['pause', 48],
            ['type', 'H'],
            ['pause', 62],
            ['type', 'E'],
            ['pause', 44],
            ['insertText', 'Vines climb the glass walls.'],
            ['press', 'Control+1'],
            ['pause', 600],
            ['blockClick', '[data-id="acts-demo-station-dialogue-2"]'],
            ['press', 'End'],
            ['addAct'],
            [
                'nth',
                '[data-structure-act-id]',
                1,
            ],
            ['waitForSecondAct', {state: 'visible'}],
            ['firstSceneBox'],
            [
                'mouseMove',
                20,
                15,
                undefined,
            ],
            ['mouseDown'],
            [
                'nth',
                '[data-structure-act-id]',
                1,
            ],
            ['secondActBox'],
            [
                'mouseMove',
                60,
                50,
                {steps: 12},
            ],
            ['mouseUp'],
        ]);
    });
});
