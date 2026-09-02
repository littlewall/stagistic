import type {Page} from 'playwright';
import {
    describe,
    expect,
    it,
} from 'vite-plus/test';

const loadCapture = () => import('./prepareCharactersCapture');

describe('prepareCharactersCapture', () => {
    it('opens the shared character seed route and focuses the real editor', async () => {
        const {prepareCharactersCapture} = await loadCapture();
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
            }),
        };

        await prepareCharactersCapture({
            page: page as unknown as Pick<Page, 'addInitScript' | 'goto' | 'waitForURL' | 'getByRole'>,
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
        ]);
    });
});
