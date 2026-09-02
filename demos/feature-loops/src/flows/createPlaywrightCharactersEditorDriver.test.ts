import type {Page} from 'playwright';
import {
    describe,
    expect,
    it,
} from 'vite-plus/test';

const loadDriver = () => import('./createPlaywrightCharactersEditorDriver');

describe('createPlaywrightCharactersEditorDriver', () => {
    it('confirms an unconfirmed sidebar character before continuing the editor flow', async () => {
        const {createPlaywrightCharactersEditorDriver} = await loadDriver();
        const events: unknown[] = [];
        const page = {
            keyboard: {
                insertText: () => Promise.resolve(),
                type: () => Promise.resolve(),
                press: () => Promise.resolve(),
            },
            waitForTimeout: () => Promise.resolve(),
            evaluate: () => Promise.resolve(),
            locator: () => ({
                last: () => ({waitFor: () => Promise.resolve()}),
            }),
            getByRole: (role: string, options: unknown) => ({
                click: () => {
                    events.push([
                        'click',
                        role,
                        options,
                    ]);

                    return Promise.resolve();
                },
                waitFor: (waitOptions: unknown) => {
                    events.push([
                        'waitFor',
                        role,
                        options,
                        waitOptions,
                    ]);

                    return Promise.resolve();
                },
            }),
        };
        const driver = createPlaywrightCharactersEditorDriver(
            page as unknown as Pick<Page, 'keyboard' | 'waitForTimeout' | 'evaluate' | 'locator' | 'getByRole'>,
        );

        await driver.confirmUnconfirmedCharacter('WARDEN');

        expect(events).toEqual([
            [
                'waitFor',
                'button',
                {name: 'Confirm WARDEN'},
                {state: 'visible'},
            ],
            [
                'click',
                'button',
                {name: 'Confirm WARDEN'},
            ],
            [
                'waitFor',
                'button',
                {name: 'Manage WARDEN'},
                {state: 'visible'},
            ],
        ]);
    });
});
