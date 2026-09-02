import type {Page} from 'playwright';

import {
    type ActsAndScenesFlowDriver,
    runActsAndScenesFlow,
} from '../flows/runActsAndScenesFlow';
import {prepareActsAndScenesCapture} from './prepareActsAndScenesCapture';

type RunRecordedActsAndScenesDemoArgs = {
    page: Pick<Page, 'addInitScript' | 'goto' | 'waitForURL' | 'getByRole'>,
    driver: ActsAndScenesFlowDriver,
    baseUrl: string,
    waitForOperator: (prompt: string) => Promise<void>,
    log: (message: string) => void,
};

export const runRecordedActsAndScenesDemo = async ({
    page,
    driver,
    baseUrl,
    waitForOperator,
    log,
}: RunRecordedActsAndScenesDemoArgs): Promise<void> => {
    await prepareActsAndScenesCapture({page, baseUrl});

    log('Ready for Recordly. Start recording, then press Enter here.');
    await waitForOperator('Start flow');
    await runActsAndScenesFlow(driver);

    log('Flow complete. Stop Recordly, then press Enter to close the browser.');
    await waitForOperator('Close browser');
};
