import type {Page} from 'playwright';

import {
    type CharactersEditorFlowDriver,
    runCharactersEditorFlow,
} from '../flows/runCharactersEditorFlow';
import {prepareCharactersCapture} from './prepareCharactersCapture';

type RunRecordedCharactersEditorDemoArgs = {
    page: Pick<Page, 'addInitScript' | 'goto' | 'waitForURL' | 'getByRole'>,
    driver: CharactersEditorFlowDriver,
    baseUrl: string,
    waitForOperator: (prompt: string) => Promise<void>,
    log: (message: string) => void,
};

export const runRecordedCharactersEditorDemo = async ({
    page,
    driver,
    baseUrl,
    waitForOperator,
    log,
}: RunRecordedCharactersEditorDemoArgs): Promise<void> => {
    await prepareCharactersCapture({page, baseUrl});

    log('Ready for Recordly. Start recording, then press Enter here.');
    await waitForOperator('Start flow');
    await driver.pause(900);
    await runCharactersEditorFlow(driver);

    log('Flow complete. Stop Recordly, then press Enter to close the browser.');
    await waitForOperator('Close browser');
};
