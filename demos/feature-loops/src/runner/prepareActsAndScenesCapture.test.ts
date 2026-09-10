import type {Page} from 'playwright';
import {
    describe,
    expect,
    it,
} from 'vite-plus/test';

const loadCapture = () => import('./prepareActsAndScenesCapture');

describe('prepareActsAndScenesCapture', () => {
    it('opens the acts and scenes seed route and focuses the actual script editor', async () => {
        const {prepareActsAndScenesCapture} = await loadCapture();
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

        await prepareActsAndScenesCapture({
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
            ['goto', 'http://localhost:3000/dev/demos/acts-and-scenes'],
            ['waitForURL', '**/script/*/editor'],
            [
                'focus',
                'textbox',
                {name: 'Script editor'},
            ],
        ]);
    });
});
