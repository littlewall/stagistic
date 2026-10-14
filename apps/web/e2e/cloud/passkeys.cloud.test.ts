/*
 * Passkeys end to end: the editor behind Caddy, the real auth server and a
 * virtual authenticator. Sign in by email link, add a passkey, sign out, sign
 * in again with the passkey only. Skipped without the local stack.
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
    addVirtualAuthenticator,
    EDITOR_ORIGIN,
    isLocalStackRunning,
    launchBrowser,
    newDevice,
    openAccountMenu,
    signInWithEmail,
    startEditor,
} from './localStack';

const running = await isLocalStackRunning();

describe.skipIf(!running)('passkeys (local stack)', () => {
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

    const signedInAs = async (page: Page, email: string) => {
        await openAccountMenu(page);

        const shown = await page.getByText(email, {exact: true}).isVisible();

        await page.keyboard.press('Escape');

        return shown;
    };

    it('adds a passkey after an email sign-in and signs in with it alone', async () => {
        const email = `passkey-${Date.now().toString(36)}@example.com`;
        const device = await newDevice(browser);
        const page = await device.newPage();
        const authenticator = await addVirtualAuthenticator(page);

        await page.goto(EDITOR_ORIGIN);
        await signInWithEmail(page, email);
        await expect.poll(() => signedInAs(page, email), {timeout: 30_000}).toBe(true);

        await openAccountMenu(page);
        await page.getByRole('button', {name: 'Account settings…'}).click();
        await page.getByRole('button', {name: 'Add a passkey'}).click();
        await page.getByText(/Passkey · added/).waitFor();
        expect(await authenticator.credentialCount()).toBe(1);

        await page.getByRole('button', {name: 'Sign out'}).click();
        await expect.poll(() => signedInAs(page, 'Not signed in')).toBe(true);

        await openAccountMenu(page);
        await page.getByRole('button', {name: 'Sign in', exact: true}).click();
        await page.getByRole('button', {name: 'Sign in with a passkey'}).click();
        await expect.poll(() => signedInAs(page, email), {timeout: 30_000}).toBe(true);

        await device.close();
    });

    it('explains a passkey this site does not know', async () => {
        const device = await newDevice(browser);
        const page = await device.newPage();
        const stranger = await device.newCDPSession(page);

        await stranger.send('WebAuthn.enable');

        const {authenticatorId} = await stranger.send('WebAuthn.addVirtualAuthenticator', {
            options: {
                protocol: 'ctap2',
                transport: 'internal',
                hasResidentKey: true,
                hasUserVerification: true,
                isUserVerified: true,
                automaticPresenceSimulation: true,
            },
        });

        // A credential for this rpID that the server never registered.
        await stranger.send('WebAuthn.addCredential', {
            authenticatorId,
            credential: {
                credentialId: Buffer.from(`unknown-${Date.now()}`).toString('base64'),
                isResidentCredential: true,
                rpId: 'stagistic.local',
                userHandle: Buffer.from('nobody').toString('base64'),
                privateKey: await newPrivateKey(),
                signCount: 0,
            },
        });

        await page.goto(EDITOR_ORIGIN);
        await openAccountMenu(page);
        await page.getByRole('button', {name: 'Sign in', exact: true}).click();
        await page.getByRole('button', {name: 'Sign in with a passkey'}).click();
        await page.getByText('This passkey is not linked to an account').waitFor();

        await device.close();
    });
});

/** PKCS#8 P-256 key, base64 (what the CDP authenticator expects). */
const newPrivateKey = async () => {
    const pair = await crypto.subtle.generateKey({name: 'ECDSA', namedCurve: 'P-256'}, true, ['sign']);

    return Buffer.from(await crypto.subtle.exportKey('pkcs8', pair.privateKey)).toString('base64');
};
