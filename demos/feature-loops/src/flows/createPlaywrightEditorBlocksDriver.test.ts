import {
    describe,
    expect,
    it,
} from 'vite-plus/test';
import type {Page} from 'playwright';

const loadDriver = () => import('./createPlaywrightEditorBlocksDriver');

describe('createPlaywrightEditorBlocksDriver', () => {
    it('waits for real UI states and uses grouped or human-paced keyboard input', async () => {
        const {createPlaywrightEditorBlocksDriver} = await loadDriver();
        const events: unknown[] = [];
        const locator = (selector: string) => ({
            last: () => ({
                waitFor: async (options: unknown) => {
                    events.push(['waitFor', selector, options]);
                },
            }),
        });
        const page = {
            keyboard: {
                insertText: async (text: string) => {
                    events.push(['insertText', text]);
                },
                type: async (text: string) => {
                    events.push(['type', text]);
                },
                press: async (key: string) => {
                    events.push(['press', key]);
                },
            },
            waitForTimeout: async (durationMs: number) => {
                events.push(['wait', durationMs]);
            },
            locator,
            getByRole: (role: string) => locator(`[role="${role}"]`).last(),
        };
        const driver = createPlaywrightEditorBlocksDriver(
            page as unknown as Pick<Page, 'keyboard' | 'waitForTimeout' | 'locator' | 'getByRole'>,
        );

        await driver.typeWordGroups(['A storm', ' gathers.']);
        await driver.typeHuman('ELI');
        await driver.waitForBlock('aside');
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
            ['waitFor', '[data-block-type="aside"]', {state: 'visible'}],
            ['waitFor', '[role="listbox"]', {state: 'visible'}],
            ['waitFor', '[data-music-pill="start"]', {state: 'visible'}],
        ]);
    });
});
