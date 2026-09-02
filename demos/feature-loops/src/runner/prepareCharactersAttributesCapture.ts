import type {Page} from 'playwright';

import {prepareCharactersCapture} from './prepareCharactersCapture';

type PrepareCharactersAttributesCaptureArgs = {
    page: Pick<Page, 'addInitScript' | 'goto' | 'waitForURL' | 'getByRole' | 'locator'>,
    baseUrl: string,
};

export const prepareCharactersAttributesCapture = async ({
    page,
    baseUrl,
}: PrepareCharactersAttributesCaptureArgs): Promise<void> => {
    await prepareCharactersCapture({page, baseUrl});
    await page.getByRole('button', {name: 'Open characters in attribute manager'}).click();
    await page.getByRole('tab', {name: 'Groups', exact: true}).click();
    await page.locator('[aria-label="Groups list"]').getByRole(
        'button',
        {name: 'THE WATCH', exact: true},
    ).click();
};
