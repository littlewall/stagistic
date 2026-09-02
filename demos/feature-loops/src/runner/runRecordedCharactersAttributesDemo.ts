import type {Page} from 'playwright';

import {
    type CharactersAttributesFlowDriver,
    runCharactersAttributesFlow,
} from '../flows/runCharactersAttributesFlow';
import {prepareCharactersAttributesCapture} from './prepareCharactersAttributesCapture';

type RunRecordedCharactersAttributesDemoArgs = {
    page: Pick<Page, 'addInitScript' | 'goto' | 'waitForURL' | 'getByRole' | 'locator'>,
    driver: CharactersAttributesFlowDriver,
    baseUrl: string,
    waitForOperator: (prompt: string) => Promise<void>,
    log: (message: string) => void,
};

export const runRecordedCharactersAttributesDemo = async ({
    page,
    driver,
    baseUrl,
    waitForOperator,
    log,
}: RunRecordedCharactersAttributesDemoArgs): Promise<void> => {
    await prepareCharactersAttributesCapture({page, baseUrl});

    log('Ready for Recordly. Start recording, then press Enter here.');
    await waitForOperator('Start flow');
    await driver.pause(900);
    await runCharactersAttributesFlow(driver);

    log('Flow complete. Stop Recordly, then press Enter to close the browser.');
    await waitForOperator('Close browser');
};
