import {
    stdin,
    stdout,
} from 'node:process';
import {
    createInterface,
} from 'node:readline/promises';

import {chromium} from 'playwright';

import {createPlaywrightCharactersAttributesDriver} from './flows/createPlaywrightCharactersAttributesDriver';
import {runRecordedCharactersAttributesDemo} from './runner/runRecordedCharactersAttributesDemo';

const CAPTURE_VIEWPORT = {width: 1440, height: 900};
const BASE_URL = process.env.STAGISTIC_DEMO_BASE_URL ?? 'http://localhost:3000';

const waitForOperator = async (prompt: string): Promise<void> => {
    const readline = createInterface({input: stdin, output: stdout});

    try {
        await readline.question(`${prompt} — press Enter\n`);
    } finally {
        readline.close();
    }
};

const main = async (): Promise<void> => {
    const browser = await chromium.launch({
        headless: false,
        args: [`--window-size=${CAPTURE_VIEWPORT.width},${CAPTURE_VIEWPORT.height}`],
    });

    try {
        const context = await browser.newContext({
            colorScheme: 'dark',
            deviceScaleFactor: 1,
            screen: CAPTURE_VIEWPORT,
            viewport: CAPTURE_VIEWPORT,
        });
        const page = await context.newPage();
        const driver = createPlaywrightCharactersAttributesDriver(page);

        await runRecordedCharactersAttributesDemo({
            page,
            driver,
            baseUrl: BASE_URL,
            waitForOperator,
            log: message => stdout.write(`${message}\n`),
        });
    } finally {
        await browser.close();
    }
};

void main().catch(error => {
    console.error(error);
    process.exitCode = 1;
});
