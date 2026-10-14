import '../../../styles/tokens.css';

import {createRoot, type Root} from 'react-dom/client';
import {
    afterEach,
    describe,
    expect,
    it,
    vi,
} from 'vite-plus/test';
import {userEvent} from 'vite-plus/test/browser';

import {AccountMenu} from '../../layout/header/AccountMenu';
import {AccountSettingsModal} from './AccountSettingsModal';
import {CloudSyncModal} from './CloudSyncModal';
import {SignInModal} from './SignInModal';
import type {CloudConflictItem} from './types';

const roots: Root[] = [];

const mount = (element: React.ReactElement) => {
    const host = document.createElement('div');

    document.body.appendChild(host);

    const root = createRoot(host);

    root.render(element);
    roots.push(root);

    return root;
};

const waitFor = async <T,>(find: () => T | null | undefined | false, timeoutMs = 2_000): Promise<T> => {
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

afterEach(() => {
    roots.splice(0).forEach(root => root.unmount());
    document.body.innerHTML = '';
});

describe('SignInModal', () => {
    it('sends the link only after the human check and then confirms where it went', async () => {
        const onRequestLink = vi.fn(() => Promise.resolve());
        const render = (isCaptchaComplete: boolean) => (
            <SignInModal
                isOpen
                onClose={() => {}}
                onRequestLink={onRequestLink}
                isCaptchaComplete={isCaptchaComplete}
            />
        );
        const root = mount(render(false));
        const input = await waitFor(() => document.querySelector<HTMLInputElement>('#sign-in-email'));

        await userEvent.type(input, 'hamlet@example.com');
        expect(buttonNamed('Send sign-in link')?.disabled).toBe(true);

        root.render(render(true));
        await waitFor(() => buttonNamed('Send sign-in link')?.disabled === false);
        await userEvent.click(buttonNamed('Send sign-in link')!);

        await waitFor(() => document.body.textContent?.includes('We sent a sign-in link to hamlet@example.com'));
        expect(onRequestLink).toHaveBeenCalledWith('hamlet@example.com');
    });

    it('shows the failure message from the request', async () => {
        mount(
            <SignInModal
                isOpen
                onClose={() => {}}
                onRequestLink={() => Promise.reject(new Error('Too many attempts. Try again in a minute.'))}
                isCaptchaComplete
            />,
        );

        await userEvent.type(await waitFor(() => document.querySelector<HTMLInputElement>('#sign-in-email')), 'a@example.com');
        await userEvent.click(buttonNamed('Send sign-in link')!);

        await waitFor(() => document.body.textContent?.includes('Too many attempts'));
    });
});

describe('CloudSyncModal', () => {
    const conflicts: CloudConflictItem[] = [
        {
            scriptId: 's1',
            title: 'Revizor',
            differingScenes: 4,
            localUpdatedAt: Date.parse('2026-10-13T14:32:00'),
            cloudUpdatedAt: Date.parse('2026-10-13T16:05:00'),
            newer: 'cloud',
        },
        {
            scriptId: 's2',
            title: 'Racek',
            differingScenes: 1,
            localUpdatedAt: Date.parse('2026-10-13T18:00:00'),
            cloudUpdatedAt: Date.parse('2026-10-13T09:00:00'),
            newer: 'local',
        },
    ];

    it('lists conflicts with the automatic summary and keeps both by default', async () => {
        const onSync = vi.fn(() => Promise.resolve());

        mount(
            <CloudSyncModal
                isOpen
                email="jan@example.com"
                summary={{
                    upload: 2,
                    download: 5,
                    delete: 1,
                }}
                conflicts={conflicts}
                onCancel={() => {}}
                onSync={onSync}
            />,
        );

        await waitFor(() => document.body.textContent?.includes('Sync with jan@example.com'));
        expect(document.body.textContent).toContain('Automatically: upload 2 scripts · download 5 scripts · delete 1 script.');
        expect(document.body.textContent).toContain('4 scenes differ');

        // Second script: use newer.
        const useNewer = [...document.querySelectorAll('label')].filter(label => label.textContent?.startsWith('Use newer'))[1];

        await userEvent.click(useNewer);
        await userEvent.click(buttonNamed('Sync')!);

        expect(onSync).toHaveBeenCalledWith({s1: 'keep-both', s2: 'use-newer'});
    });
});

describe('AccountMenu with an account', () => {
    it('offers sign in when signed out and account actions when signed in', async () => {
        const account = {
            email: null as string | null,
            onSignIn: vi.fn(),
            onSignOut: vi.fn(),
            onOpenAccountSettings: vi.fn(),
        };
        const root = mount(
            <AccountMenu
                themeMode="auto"
                onThemeChange={() => {}}
                account={account}
            />,
        );

        await userEvent.click(await waitFor(() => document.querySelector<HTMLButtonElement>('button[aria-label="Account and appearance"]')));
        await waitFor(() => document.body.textContent?.includes('Not signed in'));
        await userEvent.click(buttonNamed('Sign in')!);
        expect(account.onSignIn).toHaveBeenCalled();

        root.render(
            <AccountMenu
                themeMode="auto"
                onThemeChange={() => {}}
                account={{...account, email: 'jan@example.com'}}
            />,
        );
        await waitFor(() => document.body.textContent?.includes('jan@example.com'));
        await userEvent.click(buttonNamed('Sign out')!);
        expect(account.onSignOut).toHaveBeenCalled();
    });
});

describe('Passkeys in account settings', () => {
    it('shows why adding failed and keeps the list', async () => {
        mount(
            <AccountSettingsModal
                isOpen
                onClose={() => {}}
                email="jan@example.com"
                syncLabel="Synced"
                lastSyncedAt={null}
                pending={0}
                onSignOut={() => {}}
                passkeys={{
                    passkeys: [
                        {
                            id: 'p1',
                            name: null,
                            createdAt: Date.parse('2026-10-14T10:00:00'),
                            backedUp: false,
                        },
                    ],
                    onAdd: () => Promise.reject(new Error('For your security, sign in again with an email link, then add the passkey.')),
                    onRemove: () => Promise.resolve(),
                }}
            />,
        );

        await userEvent.click(await waitFor(() => buttonNamed('Add a passkey')));
        await waitFor(() => document.body.textContent?.includes('sign in again with an email link'));
        expect(document.body.textContent).toContain('Passkey · added');
        expect(document.body.textContent).not.toContain('· synced');
    });
});
