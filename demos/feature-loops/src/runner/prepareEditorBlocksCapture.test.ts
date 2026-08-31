import type {Page} from 'playwright';
import {
    describe,
    expect,
    it,
} from 'vite-plus/test';

const loadCapture = () => import('./prepareEditorBlocksCapture');

describe('prepareEditorBlocksCapture', () => {
    it('opens the dev seed route and focuses the actual script editor', async () => {
        const {prepareEditorBlocksCapture} = await loadCapture();
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
            addStyleTag: (options: unknown) => {
                events.push(['addDemoStyle', options]);

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

        await prepareEditorBlocksCapture({
            page: page as unknown as Pick<Page, 'addInitScript' | 'addStyleTag' | 'goto' | 'waitForURL' | 'getByRole'>,
            baseUrl: 'http://localhost:3000',
        });

        expect(events).toEqual([
            [
                'acknowledgePreview', {
                    key: 'stagistic.web.publicPreviewAcknowledgement',
                    value: '1',
                },
            ],
            ['goto', 'http://localhost:3000/dev/demos/editor-blocks'],
            ['waitForURL', '**/script/*/editor'],
            [
                'addDemoStyle', {
                    content: [
                        '[data-id="demo-aside"]:has(> .ProseMirror-trailingBreak:only-child)::before,',
                        '[data-id="demo-aside"]:has(> .ProseMirror-trailingBreak:only-child)::after {',
                        '    content: none;',
                        '}',
                    ].join('\n'),
                },
            ],
            [
                'focus',
                'textbox',
                {name: 'Script editor'},
            ],
        ]);
    });
});
