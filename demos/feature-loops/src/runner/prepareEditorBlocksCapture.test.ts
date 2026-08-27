import {
    describe,
    expect,
    it,
} from 'vite-plus/test';
import type {Page} from 'playwright';

const loadCapture = () => import('./prepareEditorBlocksCapture');

describe('prepareEditorBlocksCapture', () => {
    it('opens the dev seed route and focuses the actual script editor', async () => {
        const {prepareEditorBlocksCapture} = await loadCapture();
        const events: unknown[] = [];
        const page = {
            addInitScript: async (_script: unknown, arg: unknown) => {
                events.push(['acknowledgePreview', arg]);
            },
            goto: async (url: string) => {
                events.push(['goto', url]);
            },
            waitForURL: async (url: string) => {
                events.push(['waitForURL', url]);
            },
            getByRole: (role: string, options: unknown) => ({
                focus: async () => {
                    events.push(['focus', role, options]);
                },
            }),
        };

        await prepareEditorBlocksCapture({
            page: page as unknown as Pick<Page, 'addInitScript' | 'goto' | 'waitForURL' | 'getByRole'>,
            baseUrl: 'http://localhost:3000',
        });

        expect(events).toEqual([
            ['acknowledgePreview', {
                key: 'stagistic.web.publicPreviewAcknowledgement',
                value: '1',
            }],
            ['goto', 'http://localhost:3000/dev/demos/editor-blocks'],
            ['waitForURL', '**/script/*/editor'],
            ['focus', 'textbox', {name: 'Script editor'}],
        ]);
    });
});
