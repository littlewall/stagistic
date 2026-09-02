import type {Page} from 'playwright';
import {
    describe,
    expect,
    it,
} from 'vite-plus/test';

const loadCapture = () => import('./prepareCharactersAttributesCapture');

describe('prepareCharactersAttributesCapture', () => {
    it('opens the selected group before the attribute capture starts', async () => {
        const {prepareCharactersAttributesCapture} = await loadCapture();
        const events: unknown[] = [];
        const page = {
            addInitScript: (_script: unknown, arg: unknown) => {
                events.push(['acknowledgePreview', arg]);

                return Promise.resolve();
            },
            goto: (url: string) => {
                events.push(['goto', url]);

                return Promise.resolve();
            },
            waitForURL: (url: string) => {
                events.push(['waitForURL', url]);

                return Promise.resolve();
            },
            getByRole: (role: string, options: unknown) => ({
                focus: () => {
                    events.push([
                        'focus',
                        role,
                        options,
                    ]);

                    return Promise.resolve();
                },
                click: () => {
                    events.push([
                        'click',
                        role,
                        options,
                    ]);

                    return Promise.resolve();
                },
            }),
            locator: (selector: string) => ({
                getByRole: (role: string, options: unknown) => ({
                    click: () => {
                        events.push([
                            'clickWithin',
                            selector,
                            role,
                            options,
                        ]);

                        return Promise.resolve();
                    },
                }),
            }),
        };

        await prepareCharactersAttributesCapture({
            page: page as unknown as Pick<Page, 'addInitScript' | 'goto' | 'waitForURL' | 'getByRole' | 'locator'>,
            baseUrl: 'http://localhost:3000',
        });

        expect(events).toEqual([
            [
                'acknowledgePreview', {
                    key: 'stagistic.web.publicPreviewAcknowledgement',
                    value: '1',
                },
            ],
            ['goto', 'http://localhost:3000/dev/demos/characters'],
            ['waitForURL', '**/script/*/editor'],
            [
                'focus',
                'textbox',
                {name: 'Script editor'},
            ],
            [
                'click',
                'button',
                {name: 'Open characters in attribute manager'},
            ],
            [
                'click',
                'tab',
                {name: 'Groups', exact: true},
            ],
            [
                'clickWithin',
                '[aria-label="Groups list"]',
                'button',
                {name: 'THE WATCH', exact: true},
            ],
        ]);
    });
});
