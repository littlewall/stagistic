import {type ChildProcess, spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';

import {
    type Browser,
    type BrowserContext,
    chromium,
    type Page,
} from 'playwright';

/*
 * The local cloud stack (infra/README.md): Caddy on `*.stagistic.local`
 * (port suffix from LOCAL_HTTPS_PORT_SUFFIX, e.g. `:8443`), Mailpit, the Deno
 * server. The editor runs as `vp dev` on :3000 behind Caddy, so cookies,
 * CORS and the passkey rpID see the production-like domains.
 */
const appRoot = fileURLToPath(new URL('../..', import.meta.url));
const SUFFIX = process.env.LOCAL_HTTPS_PORT_SUFFIX ?? '';
const MAILPIT_API = 'http://localhost:8025/api/v1';

export const EDITOR_ORIGIN = `https://editor.stagistic.local${SUFFIX}`;

const isUp = (url: string) => fetch(url).then(response => response.ok, () => false);

/** Postgres, auth server and Mailpit answer (Caddy is checked by the browser). */
export const isLocalStackRunning = async () => await isUp('http://localhost:8787/api/auth/ok') && await isUp(`${MAILPIT_API}/info`);

/** Reuses a running editor dev server or starts one pointed at the local stack. */
export const startEditor = async (): Promise<{stop: () => void}> => {
    if (await isUp('http://localhost:3000')) {
        return {stop: () => {}};
    }

    const server: ChildProcess = spawn('pnpm', [
        'exec',
        'vp',
        'dev',
    ], {
        cwd: appRoot,
        stdio: 'ignore',
        env: {
            ...process.env,
            VITE_AUTH_URL: `https://auth.api.stagistic.local${SUFFIX}`,
            VITE_SYNC_URL: `https://sync.api.stagistic.local${SUFFIX}`,
        },
    });
    const deadline = Date.now() + 60_000;

    while (Date.now() < deadline) {
        if (await isUp('http://localhost:3000')) {
            return {stop: () => server.kill()};
        }

        await new Promise(resolve => setTimeout(resolve, 250));
    }

    server.kill();
    throw new Error('editor dev server did not start');
};

/** Chromium resolving `*.stagistic.local` to this machine; trusts the mkcert CA from the system keychain. */
export const launchBrowser = () => chromium.launch({args: ['--host-resolver-rules=MAP *.stagistic.local 127.0.0.1']});

/** A device: one browser profile with the public-preview notice acknowledged. */
export const newDevice = async (browser: Browser): Promise<BrowserContext> => {
    const context = await browser.newContext({viewport: {width: 1440, height: 900}});

    await context.addInitScript(() => {
        window.localStorage.setItem('stagistic.web.publicPreviewAcknowledgement', '1');
    });

    return context;
};

/** Virtual platform authenticator (Touch ID-like) that approves every prompt. */
export const addVirtualAuthenticator = async (page: Page) => {
    const cdp = await page.context().newCDPSession(page);

    await cdp.send('WebAuthn.enable');

    const {authenticatorId} = await cdp.send('WebAuthn.addVirtualAuthenticator', {
        options: {
            protocol: 'ctap2',
            transport: 'internal',
            hasResidentKey: true,
            hasUserVerification: true,
            isUserVerified: true,
            automaticPresenceSimulation: true,
        },
    });

    return {
        credentialCount: async (): Promise<number> => (await cdp.send('WebAuthn.getCredentials', {authenticatorId})).credentials.length,
    };
};

/** Waits for the sign-in email and returns its link. */
export const readMagicLink = async (email: string) => {
    const deadline = Date.now() + 20_000;

    while (Date.now() < deadline) {
        const search = await (await fetch(`${MAILPIT_API}/search?query=${encodeURIComponent(`to:${email}`)}`)).json() as {messages: Array<{ID: string}>};

        if (search.messages.length > 0) {
            const message = await (await fetch(`${MAILPIT_API}/message/${search.messages[0].ID}`)).json() as {Text: string};
            const link = (/https:\/\/\S+/).exec(message.Text)?.[0];

            if (link) {
                return link;
            }
        }

        await new Promise(resolve => setTimeout(resolve, 250));
    }

    throw new Error(`no sign-in email for ${email}`);
};

export const openAccountMenu = async (page: Page) => {
    await page.getByRole('button', {name: 'Account and appearance'}).click();
};

/** Signs in through the UI: email, Turnstile test widget, link from Mailpit. */
export const signInWithEmail = async (page: Page, email: string) => {
    await openAccountMenu(page);
    await page.getByRole('button', {name: 'Sign in', exact: true}).click();
    await page.getByLabel('Email').fill(email);

    const send = page.getByRole('button', {name: 'Send sign-in link'});

    // The always-pass Turnstile test key still takes a moment to issue a token.
    await send.click({timeout: 30_000});
    await page.getByText(`We sent a sign-in link to ${email}`).waitFor();
    await page.goto(await readMagicLink(email));
};

export const EDITOR = '[data-editor="true"]';

export const editorText = async (page: Page) => await page.locator(EDITOR).textContent() ?? '';

export const typeAtEnd = async (page: Page, text: string) => {
    await page.locator(EDITOR).click();
    // Caret after the last character of the document (ProseMirror follows the DOM selection).
    await page.locator(EDITOR).evaluate(element => {
        const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
        let last: Text | null = null;

        while (walker.nextNode()) {
            if (walker.currentNode.textContent?.trim()) {
                last = walker.currentNode as Text;
            }
        }

        if (last) {
            window.getSelection()?.setBaseAndExtent(last, last.length, last, last.length);
        }
    });
    await page.waitForTimeout(100);
    await page.keyboard.type(text);
};

export const signOut = async (page: Page) => {
    await openAccountMenu(page);
    await page.getByRole('button', {name: 'Sign out'}).click();
    await page.keyboard.press('Escape');
};

/** Header sync indicator says everything reached the account. */
export const waitUntilSynced = (page: Page) => page.locator('[data-sync-status][aria-label*="Synced to your account"]').first().waitFor({timeout: 30_000});
