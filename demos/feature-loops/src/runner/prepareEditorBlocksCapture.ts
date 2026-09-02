import type {Page} from 'playwright';

type PrepareEditorBlocksCaptureArgs = {
    page: Pick<Page, 'addInitScript' | 'addStyleTag' | 'goto' | 'waitForURL' | 'getByRole'>,
    baseUrl: string,
};

const PUBLIC_PREVIEW_ACKNOWLEDGEMENT = {
    key: 'stagistic.web.publicPreviewAcknowledgement',
    value: '1',
} as const;

const EMPTY_DEMO_ASIDE_STYLE = [
    '[data-id="demo-aside"]:has(> .ProseMirror-trailingBreak:only-child)::before,',
    '[data-id="demo-aside"]:has(> .ProseMirror-trailingBreak:only-child)::after {',
    '    content: none;',
    '}',
].join('\n');

export const prepareEditorBlocksCapture = async ({
    page,
    baseUrl,
}: PrepareEditorBlocksCaptureArgs): Promise<void> => {
    const demoUrl = new URL('/dev/demos/editor-blocks', baseUrl).toString();

    await page.addInitScript(acknowledgement => {
        window.localStorage.setItem(acknowledgement.key, acknowledgement.value);
    }, PUBLIC_PREVIEW_ACKNOWLEDGEMENT);
    await page.goto(demoUrl);
    await page.waitForURL('**/script/*/editor');
    await page.addStyleTag({content: EMPTY_DEMO_ASIDE_STYLE});
    await page.getByRole('textbox', {name: 'Script editor'}).focus();
};
