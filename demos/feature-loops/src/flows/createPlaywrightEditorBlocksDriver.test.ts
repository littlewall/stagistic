import type {Page} from 'playwright';
import {
    describe,
    expect,
    it,
} from 'vite-plus/test';

const loadDriver = () => import('./createPlaywrightEditorBlocksDriver');

describe('createPlaywrightEditorBlocksDriver', () => {
    it('waits for real UI states and uses grouped or human-paced keyboard input', async () => {
        const {createPlaywrightEditorBlocksDriver} = await loadDriver();
        const events: unknown[] = [];
        const locator = (selector: string) => ({
            last: () => ({
                waitFor: (options: unknown) => {
                    events.push([
                        'waitFor',
                        selector,
                        options,
                    ]);

                    return Promise.resolve();
                },
            }),
        });
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
                events.push(['wait', durationMs]);

                return Promise.resolve();
            },
            waitForFunction: (_predicate: unknown, arg: unknown) => {
                events.push(['waitForActiveBlock', arg]);

                return Promise.resolve();
            },
            locator,
            getByRole: (role: string) => locator(`[role="${role}"]`).last(),
        };
        const driver = createPlaywrightEditorBlocksDriver(
            page as unknown as Pick<Page, 'keyboard' | 'waitForTimeout' | 'waitForFunction' | 'locator' | 'getByRole'>,
        );

        await driver.typeWordGroups(['A storm', ' gathers.']);
        await driver.typeHuman('ELI');
        await driver.moveToBlock('demo-aside');
        await driver.waitForSuggestions();
        await driver.waitForMusicPill();

        expect(events).toEqual([
            ['insertText', 'A storm'],
            ['wait', 110],
            ['insertText', ' gathers.'],
            ['type', 'E'],
            ['wait', 48],
            ['type', 'L'],
            ['wait', 62],
            ['type', 'I'],
            ['wait', 44],
            ['press', 'ArrowDown'],
            ['waitForActiveBlock', 'demo-aside'],
            [
                'waitFor',
                '[role="listbox"]',
                {state: 'visible'},
            ],
            [
                'waitFor',
                '[data-music-pill="start"]',
                {state: 'visible'},
            ],
        ]);
    });
});
