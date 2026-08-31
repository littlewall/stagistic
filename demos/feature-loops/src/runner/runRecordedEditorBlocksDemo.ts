import type {Page} from 'playwright';

import {
    type EditorBlocksFlowDriver,
    runEditorBlocksFlow,
} from '../flows/runEditorBlocksFlow';
import {prepareEditorBlocksCapture} from './prepareEditorBlocksCapture';

type RunRecordedEditorBlocksDemoArgs = {
    page: Pick<Page, 'addInitScript' | 'addStyleTag' | 'goto' | 'waitForURL' | 'getByRole'>,
    driver: EditorBlocksFlowDriver,
    baseUrl: string,
    waitForOperator: (prompt: string) => Promise<void>,
    log: (message: string) => void,
};

export const runRecordedEditorBlocksDemo = async ({
    page,
    driver,
    baseUrl,
    waitForOperator,
    log,
}: RunRecordedEditorBlocksDemoArgs): Promise<void> => {
    await prepareEditorBlocksCapture({page, baseUrl});

    log('Ready for Recordly. Start recording, then press Enter here.');
    await waitForOperator('Start flow');
    await driver.pause(900);
    await runEditorBlocksFlow(driver);

    log('Flow complete. Stop Recordly, then press Enter to close the browser.');
    await waitForOperator('Close browser');
};
