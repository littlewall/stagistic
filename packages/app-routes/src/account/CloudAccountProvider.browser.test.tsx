import '@stagistic/ui/styles/base.css';

import {type AuthClient, PasskeyCancelledError} from '@stagistic/auth-client';
import {requireValue} from '@stagistic/shared';
import type {
    CloudCheckReport,
    CloudStatus,
    SyncEngineCloudClient,
} from '@stagistic/sync-engine';
import {ToastProvider} from '@stagistic/ui';
import {createRoot, type Root} from 'react-dom/client';
import {
    afterEach,
    describe,
    expect,
    it,
    vi,
} from 'vite-plus/test';
import {userEvent} from 'vite-plus/test/browser';

import {CloudAccountProvider, useCloudAccount} from './CloudAccountProvider';
import {useSyncPrompt} from './useSyncPrompt';

const roots: Root[] = [];

afterEach(() => {
    roots.splice(0).forEach(root => root.unmount());
    document.body.innerHTML = '';
});

const waitFor = async <T,>(find: () => T | null | undefined | false, timeoutMs = 3_000): Promise<T> => {
    const deadline = Date.now() + timeoutMs;

    while (Date.now() < deadline) {
        const found = find();

        if (found) {
            return found;
        }

        await new Promise(resolve => window.setTimeout(resolve, 10));
    }

    throw new Error('Timed out waiting for condition');
};

const buttonNamed = (name: string) => [...document.querySelectorAll('button')].find(button => button.textContent?.trim() === name);

const status = (state: CloudStatus['state']): CloudStatus => ({
    state,
    email: state === 'signed-out' ? null : 'jan@example.com',
    pending: 0,
    lastSyncedAt: null,
    error: null,
});

const createFakes = (report: CloudCheckReport) => {
    let listener: ((next: CloudStatus) => void) | null = null;
    const apply = vi.fn(() => {
        listener?.(status('synced'));

        return Promise.resolve();
    });
    const signedOut = vi.fn(() => Promise.resolve(status('signed-out')));
    const authSignOut = vi.fn(() => Promise.resolve());
    const check = vi.fn(() => Promise.resolve(report));
    const passkeys = {
        signInWithPasskey: vi.fn(() => Promise.resolve({userId: 'u1', email: 'jan@example.com'})),
        addPasskey: vi.fn(() => Promise.resolve()),
        listPasskeys: vi.fn(() => Promise.resolve([
            {
                id: 'p1',
                name: null,
                createdAt: Date.parse('2026-10-14T10:00:00'),
                backedUp: true,
            },
        ])),
        deletePasskey: vi.fn(() => Promise.resolve()),
    };
    const cloud: SyncEngineCloudClient = {
        status: () => Promise.resolve(status('needs-check')),
        signedIn: () => Promise.resolve(status('needs-check')),
        signedOut,
        check,
        wake: () => Promise.resolve(status('synced')),
        apply,
        downloadAttachment: () => Promise.resolve(false),
        onStatus: next => {
            listener = next;

            return () => {
                listener = null;
            };
        },
    };
    const auth: AuthClient = {
        requestMagicLink: () => Promise.resolve(),
        verifyMagicLink: () => Promise.resolve({userId: 'u1', email: 'jan@example.com'}),
        getSession: () => Promise.resolve(null),
        signOut: authSignOut,
        ...passkeys,
    };

    return {
        cloud,
        auth,
        apply,
        signedOut,
        authSignOut,
        passkeys,
        emit: (next: CloudStatus) => listener?.(next),
        check,
    };
};

const MenuProbe = () => {
    const {menuAccount, syncLabel} = useCloudAccount();
    const prompt = useSyncPrompt(1);

    return (
        <>
            <output data-probe>{`${menuAccount?.email ?? 'signed out'} | ${syncLabel ?? 'local'}`}</output>
            <output data-prompt>{prompt.isOpen ? 'prompt open' : 'prompt closed'}</output>
            <button
                type="button"
                onClick={menuAccount?.onSignIn}
            >
                Probe sign in
            </button>
            <button
                type="button"
                onClick={menuAccount?.onOpenAccountSettings}
            >
                Probe settings
            </button>
        </>
    );
};

const mount = (fakes: ReturnType<typeof createFakes>) => {
    const host = document.createElement('div');

    document.body.appendChild(host);

    const root = createRoot(host);

    root.render(
        <ToastProvider>
            <CloudAccountProvider
                auth={fakes.auth}
                cloud={fakes.cloud}
                turnstileSiteKey="test"
            >
                <MenuProbe />
            </CloudAccountProvider>
        </ToastProvider>,
    );
    roots.push(root);
};

const conflict = {
    scriptId: 's1',
    title: 'Revizor',
    differingScenes: 2,
    localUpdatedAt: 1,
    cloudUpdatedAt: 2,
    newer: 'cloud' as const,
};

describe('CloudAccountProvider', () => {
    it('syncs without a dialog when nothing conflicts', async () => {
        const fakes = createFakes({
            email: 'jan@example.com',
            upload: 2,
            download: 5,
            delete: 0,
            restore: 0,
            conflicts: [],
        });

        mount(fakes);

        await waitFor(() => document.body.textContent?.includes('Synced with jan@example.com'));
        expect(fakes.apply).toHaveBeenCalledWith({});
        expect(document.body.textContent).toContain('2 scripts uploaded · 5 scripts downloaded');
        await waitFor(() => document.querySelector('[data-probe]')?.textContent === 'jan@example.com | Synced to your account');
    });

    it('asks only about scripts changed on both sides and applies the choice', async () => {
        const fakes = createFakes({
            email: 'jan@example.com',
            upload: 0,
            download: 0,
            delete: 0,
            restore: 0,
            conflicts: [conflict],
        });

        mount(fakes);

        await waitFor(() => document.body.textContent?.includes('Revizor'));

        // The check moves the state itself (checking → needs-check): no second check while the dialog waits.
        fakes.emit(status('checking'));
        fakes.emit(status('needs-check'));
        await new Promise(resolve => window.setTimeout(resolve, 100));
        expect(fakes.check).toHaveBeenCalledTimes(1);

        await userEvent.click(requireValue([...document.querySelectorAll('button')].find(button => button.textContent === 'Sync')));

        await waitFor(() => fakes.apply.mock.calls.length > 0);
        expect(fakes.apply).toHaveBeenCalledWith({s1: 'keep-both'});
    });

    it('stays signed out when the dialog is cancelled', async () => {
        const fakes = createFakes({
            email: 'jan@example.com',
            upload: 0,
            download: 0,
            delete: 0,
            restore: 0,
            conflicts: [conflict],
        });

        mount(fakes);

        await waitFor(() => document.body.textContent?.includes('Revizor'));
        await userEvent.click(requireValue([...document.querySelectorAll('button')].find(button => button.textContent === 'Cancel')));

        await waitFor(() => fakes.signedOut.mock.calls.length > 0);
        expect(fakes.authSignOut).toHaveBeenCalled();
        expect(fakes.apply).not.toHaveBeenCalled();
    });

    it('signs in with a passkey and starts sync; a closed prompt keeps the dialog without an error', async () => {
        const fakes = createFakes({
            email: 'jan@example.com',
            upload: 0,
            download: 0,
            delete: 0,
            restore: 0,
            conflicts: [],
        });
        const signedIn = vi.fn(() => Promise.resolve(status('needs-check')));

        fakes.cloud.signedIn = signedIn;
        fakes.cloud.status = () => Promise.resolve(status('signed-out'));
        fakes.passkeys.signInWithPasskey.mockRejectedValueOnce(new PasskeyCancelledError());
        mount(fakes);

        await userEvent.click(await waitFor(() => buttonNamed('Probe sign in')));
        await userEvent.click(await waitFor(() => buttonNamed('Sign in with a passkey')));
        await waitFor(() => fakes.passkeys.signInWithPasskey.mock.calls.length === 1);
        expect(document.body.textContent).not.toContain('cancelled');
        expect(signedIn).not.toHaveBeenCalled();

        await userEvent.click(requireValue(buttonNamed('Sign in with a passkey')));
        await waitFor(() => signedIn.mock.calls.length === 1);
        await waitFor(() => !buttonNamed('Sign in with a passkey'));
        await waitFor(() => document.body.textContent?.includes('Synced with jan@example.com'));
    });

    it('lists, adds and removes passkeys in account settings', async () => {
        const fakes = createFakes({
            email: 'jan@example.com',
            upload: 0,
            download: 0,
            delete: 0,
            restore: 0,
            conflicts: [],
        });

        mount(fakes);
        await waitFor(() => fakes.apply.mock.calls.length > 0);
        await userEvent.click(await waitFor(() => buttonNamed('Probe settings')));
        await waitFor(() => document.body.textContent?.includes('· synced'));

        await userEvent.click(requireValue(buttonNamed('Add a passkey')));
        await waitFor(() => fakes.passkeys.listPasskeys.mock.calls.length === 2);
        expect(fakes.passkeys.addPasskey).toHaveBeenCalled();

        await userEvent.click(requireValue(buttonNamed('Remove')));
        await waitFor(() => fakes.passkeys.deletePasskey.mock.calls.length === 1);
        expect(fakes.passkeys.deletePasskey).toHaveBeenCalledWith('p1');
    });

    it('offers sync once: not over another account dialog, never again after a sign-in', async () => {
        window.localStorage.removeItem('stagistic.account.sync-prompt-dismissed');

        const fakes = createFakes({
            email: 'jan@example.com',
            upload: 0,
            download: 0,
            delete: 0,
            restore: 0,
            conflicts: [],
        });
        const promptText = () => document.querySelector('[data-prompt]')?.textContent;

        fakes.cloud.status = () => Promise.resolve(status('signed-out'));
        mount(fakes);

        await waitFor(() => promptText() === 'prompt open');
        await userEvent.click(requireValue(buttonNamed('Probe sign in')));
        await waitFor(() => promptText() === 'prompt closed');

        fakes.emit(status('synced'));
        await waitFor(() => document.querySelector('[data-probe]')?.textContent?.startsWith('jan@example.com'));
        fakes.emit(status('signed-out'));
        await waitFor(() => document.querySelector('[data-probe]')?.textContent?.startsWith('signed out'));
        await userEvent.keyboard('{Escape}');
        await new Promise(resolve => window.setTimeout(resolve, 100));
        expect(promptText()).toBe('prompt closed');
    });
});
