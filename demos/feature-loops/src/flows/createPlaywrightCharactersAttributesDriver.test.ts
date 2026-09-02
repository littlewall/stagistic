import type {Page} from 'playwright';
import {
    describe,
    expect,
    it,
} from 'vite-plus/test';

const loadDriver = () => import('./createPlaywrightCharactersAttributesDriver');

describe('createPlaywrightCharactersAttributesDriver', () => {
    it('uses the visible member suggestions and group color controls', async () => {
        const {createPlaywrightCharactersAttributesDriver} = await loadDriver();
        const events: unknown[] = [];
        const page = {
            keyboard: {
                type: (text: string) => {
                    events.push(['type', text]);

                    return Promise.resolve();
                },
            },
            waitForTimeout: (durationMs: number) => {
                events.push(['wait', durationMs]);

                return Promise.resolve();
            },
            getByPlaceholder: (placeholder: string) => ({
                focus: () => {
                    events.push(['focusPlaceholder', placeholder]);

                    return Promise.resolve();
                },
            }),
            getByRole: (role: string, options: {name?: string}) => {
                if (role === 'region' && options.name === 'Groups detail') {
                    return {
                        getByRole: (nestedRole: string, nestedOptions: unknown) => ({
                            click: () => {
                                events.push([
                                    'clickWithinGroupDetail',
                                    nestedRole,
                                    nestedOptions,
                                ]);

                                return Promise.resolve();
                            },
                        }),
                    };
                }

                return {
                    click: () => {
                        events.push([
                            'click',
                            role,
                            options,
                        ]);

                        return Promise.resolve();
                    },
                };
            },
            locator: (selector: string) => ({
                getByText: (text: string, options: unknown) => ({
                    click: () => {
                        events.push([
                            'selectSuggestion',
                            selector,
                            text,
                            options,
                        ]);

                        return Promise.resolve();
                    },
                }),
            }),
        };
        const driver = createPlaywrightCharactersAttributesDriver(
            page as unknown as Pick<Page, 'keyboard' | 'waitForTimeout' | 'getByPlaceholder' | 'getByRole' | 'locator'>,
        );

        await driver.focusMembers();
        await driver.typeHuman('ELI');
        await driver.selectMember('ELI');
        await driver.openColorPicker();
        await driver.selectColorPreset(5);
        await driver.applyColor();

        expect(events).toEqual([
            ['focusPlaceholder', 'Select members'],
            ['type', 'E'],
            ['wait', 48],
            ['type', 'L'],
            ['wait', 62],
            ['type', 'I'],
            ['wait', 44],
            [
                'selectSuggestion',
                '[data-testid="suggestions"] li',
                'ELI',
                {exact: true},
            ],
            [
                'clickWithinGroupDetail',
                'button',
                {name: 'Choose color for THE WATCH'},
            ],
            [
                'click',
                'button',
                {name: 'Select preset color 5'},
            ],
            [
                'click',
                'button',
                {name: 'Apply', exact: true},
            ],
        ]);
    });
});
