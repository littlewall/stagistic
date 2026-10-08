/*
 * Phase 1: two tabs of one browser profile edit the same script offline.
 * The sync engine runs in the PGlite leader worker; tabs hold Y.Doc replicas.
 */
import {
    type Browser,
    type BrowserContext,
    chromium,
    type Page,
} from 'playwright';
import {
    afterAll,
    beforeAll,
    describe,
    expect,
    it,
} from 'vite-plus/test';

import {startPreviewServer} from './previewServer';

const PORT = 4317;
const EDITOR = '[data-editor="true"]';

let browser: Browser;
let context: BrowserContext;
let server: Awaited<ReturnType<typeof startPreviewServer>>;

beforeAll(async () => {
    server = await startPreviewServer(PORT);
    browser = await chromium.launch();
    context = await browser.newContext({viewport: {width: 1440, height: 900}});
    await context.addInitScript(() => {
        window.localStorage.setItem('stagistic.web.publicPreviewAcknowledgement', '1');
    });
});

afterAll(async () => {
    await browser?.close();
    server?.stop();
});

const openEditor = async (url: string) => {
    const page = await context.newPage();

    await page.goto(url);
    await page.waitForSelector(EDITOR, {timeout: 60_000});

    return page;
};

const editorText = async (page: Page) => await page.locator(EDITOR).textContent() ?? '';

const typeAtEnd = async (page: Page, text: string) => {
    await page.locator(EDITOR).click();
    await page.keyboard.press('ControlOrMeta+End');
    await page.keyboard.type(text);
};

describe('tab sync (offline, no account)', () => {
    it('keeps two tabs in sync, persists, and survives closing the leader tab', async () => {
        const home = await context.newPage();

        await home.goto(server.url);
        await home.getByRole('button', {name: /New script/}).click();
        await home.getByLabel('Script name').fill('Tab sync');
        await home.getByRole('button', {name: 'Create script'}).click();
        await home.waitForURL(/\/script\/[^/]+\/editor/, {timeout: 60_000});
        await home.waitForSelector(EDITOR, {timeout: 60_000});

        const scriptUrl = home.url();
        const tabA = home;
        const tabB = await openEditor(scriptUrl);

        await typeAtEnd(tabA, 'Hello from A');
        await expect.poll(() => editorText(tabB), {timeout: 10_000}).toContain('Hello from A');

        await typeAtEnd(tabB, ' and B');
        await expect.poll(() => editorText(tabA), {timeout: 10_000}).toContain('Hello from A and B');

        // Tab A started the database worker first, so it hosts the engine. Close it.
        await tabA.close();
        await typeAtEnd(tabB, 'Z after handoff');

        const tabC = await openEditor(scriptUrl);

        await expect.poll(() => editorText(tabC), {timeout: 20_000}).toContain('Hello from A and BZ after handoff');

        // Reload: content comes back from IndexedDB (Y.Doc) without the other tabs' memory.
        await tabB.close();
        await tabC.reload();
        await tabC.waitForSelector(EDITOR, {timeout: 60_000});
        await expect.poll(() => editorText(tabC), {timeout: 20_000}).toContain('Hello from A and BZ after handoff');
    });
});
