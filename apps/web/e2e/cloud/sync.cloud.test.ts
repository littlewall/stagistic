/*
 * Two devices (browser profiles) on one account, through Caddy against the
 * real auth + collab server, RustFS and Mailpit. Skipped without the local stack.
 */
import type {Browser, Page} from 'playwright';
import {
    afterAll,
    beforeAll,
    describe,
    expect,
    it,
} from 'vite-plus/test';

import {
    EDITOR,
    EDITOR_ORIGIN,
    editorText,
    isLocalStackRunning,
    launchBrowser,
    newDevice,
    signInWithEmail,
    signOut,
    startEditor,
    typeAtEnd,
    waitUntilSynced,
} from './localStack';

const running = await isLocalStackRunning();
const run = () => Date.now().toString(36);

describe.skipIf(!running)('cloud sync between two devices (local stack)', () => {
    let browser: Browser;
    let editor: Awaited<ReturnType<typeof startEditor>>;

    beforeAll(async () => {
        editor = await startEditor();
        browser = await launchBrowser();
    });

    afterAll(async () => {
        await browser?.close();
        editor?.stop();
    });

    const device = async (email: string) => {
        const page = await (await newDevice(browser)).newPage();

        await page.goto(EDITOR_ORIGIN);
        await signInWithEmail(page, email);
        await page.getByText(`Synced with ${email}`).waitFor({timeout: 30_000});

        return page;
    };

    /** A new script starts with a scene heading (shown upper-case): compare case-insensitively. */
    const lowerText = async (page: Page) => (await editorText(page)).toLowerCase();

    const openScript = async (page: Page, title: string) => {
        await page.goto(EDITOR_ORIGIN);
        await page.getByText(title, {exact: true}).first().click();
        await page.waitForSelector(EDITOR, {timeout: 60_000});
    };

    const createScript = async (page: Page, title: string) => {
        await page.getByRole('button', {name: /New script/}).click();
        await page.getByLabel('Script name').fill(title);
        await page.getByRole('button', {name: 'Create script'}).click();
        await page.waitForSelector(EDITOR, {timeout: 60_000});
    };

    it('brings a script with its attachment to a second device and keeps both editors live', async () => {
        const email = `sync-${run()}@example.com`;
        const a = await device(email);

        // The example script has a music score PDF: it is uploaded to the bucket.
        await a.getByRole('button', {name: /Create example script/}).click();
        await a.waitForSelector(EDITOR, {timeout: 60_000});
        await typeAtEnd(a, ' From device A.');
        await waitUntilSynced(a);

        const b = await device(email);

        await openScript(b, 'One Small Light');
        await expect.poll(() => editorText(b), {timeout: 20_000}).toContain('From device A.');

        // The blob is not on device B yet: the preview downloads it (presigned URL, checksum).
        await b.getByRole('button', {name: 'Open attribute manager'}).click();
        await b.getByRole('tab', {name: 'Music'}).click();
        await b.getByRole('button', {name: 'example-score.pdf'}).click();

        const preview = b.getByRole('dialog', {name: 'Preview example-score.pdf'});

        await preview.locator('canvas').first().waitFor({timeout: 30_000});
        await b.keyboard.press('Escape');

        const closeManager = b.getByRole('button', {name: 'Close attribute manager'});

        if (await closeManager.isVisible()) {
            await closeManager.click();
        }

        await typeAtEnd(b, ' And device B.');
        await expect.poll(() => editorText(a), {timeout: 20_000}).toContain('And device B.');

        await a.context().close();
        await b.context().close();
    });

    it('asks about a script changed on both sides after signing back in and keeps both', async () => {
        const email = `conflict-${run()}@example.com`;
        const title = `Conflict ${run()}`;
        const a = await device(email);

        await createScript(a, title);
        await typeAtEnd(a, 'Base text.');
        await waitUntilSynced(a);

        const b = await device(email);

        await openScript(b, title);
        await expect.poll(() => lowerText(b), {timeout: 20_000}).toContain('base text.');

        // Device A works signed out; device B keeps editing in the account.
        await signOut(a);
        await typeAtEnd(a, ' Offline on A.');
        await typeAtEnd(b, ' Online on B.');
        await waitUntilSynced(b);

        await a.goto(EDITOR_ORIGIN);
        await signInWithEmail(a, email);

        const dialog = a.getByRole('dialog', {name: /Sync with/});

        await dialog.getByText(title).waitFor({timeout: 30_000});
        await dialog.getByRole('button', {name: 'Sync'}).click();
        await a.getByText('Synced with your account').waitFor({timeout: 30_000});

        // Keep both: the account version stays under the title, this device's edits in a copy.
        await openScript(a, title);
        await expect.poll(() => lowerText(a), {timeout: 20_000}).toContain('online on b.');
        expect(await lowerText(a)).not.toContain('offline on a.');

        await openScript(a, `${title} (copy from this device)`);
        await expect.poll(() => lowerText(a), {timeout: 20_000}).toContain('offline on a.');

        // The copy reaches device B too.
        await b.goto(EDITOR_ORIGIN);
        await b.getByText(`${title} (copy from this device)`).waitFor({timeout: 30_000});

        await a.context().close();
        await b.context().close();
    });
});
