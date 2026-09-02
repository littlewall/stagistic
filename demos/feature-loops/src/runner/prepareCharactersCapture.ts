import type {Page} from 'playwright';

type PrepareCharactersCaptureArgs = {
    page: Pick<Page, 'addInitScript' | 'goto' | 'waitForURL' | 'getByRole'>,
    baseUrl: string,
};

const PUBLIC_PREVIEW_ACKNOWLEDGEMENT = {
    key: 'stagistic.web.publicPreviewAcknowledgement',
    value: '1',
} as const;

export const prepareCharactersCapture = async ({
    page,
    baseUrl,
}: PrepareCharactersCaptureArgs): Promise<void> => {
    const demoUrl = new URL('/dev/demos/characters', baseUrl).toString();

    await page.addInitScript(acknowledgement => {
        window.localStorage.setItem(acknowledgement.key, acknowledgement.value);
    }, PUBLIC_PREVIEW_ACKNOWLEDGEMENT);
    await page.goto(demoUrl);
    await page.waitForURL('**/script/*/editor');
    await page.getByRole('textbox', {name: 'Script editor'}).focus();
};
