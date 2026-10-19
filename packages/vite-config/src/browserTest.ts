import {fileURLToPath} from 'node:url';

/** Setup file for every `*.browser.test` suite (`test.setupFiles`). */
export const BROWSER_TEST_SETUP = fileURLToPath(new URL('./browserTestSetup.ts', import.meta.url));
