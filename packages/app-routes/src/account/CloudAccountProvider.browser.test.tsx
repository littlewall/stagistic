import '@stagistic/ui/styles/base.css';

import type {AuthClient} from '@stagistic/auth-client';
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
    const cloud: SyncEngineCloudClient = {
        status: () => Promise.resolve(status('needs-check')),
        signedIn: () => Promise.resolve(status('needs-check')),
        signedOut,
        check: () => Promise.resolve(report),
        wake: () => Promise.resolve(status('synced')),
        apply,
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
    };

    return {
        cloud,
        auth,
        apply,
        signedOut,
        authSignOut,
    };
};

const MenuProbe = () => {
    const {menuAccount, syncLabel} = useCloudAccount();

    return <output data-probe>{`${menuAccount?.email ?? 'signed out'} | ${syncLabel ?? 'local'}`}</output>;
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
        await userEvent.click([...document.querySelectorAll('button')].find(button => button.textContent === 'Sync')!);

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
        await userEvent.click([...document.querySelectorAll('button')].find(button => button.textContent === 'Cancel')!);

        await waitFor(() => fakes.signedOut.mock.calls.length > 0);
        expect(fakes.authSignOut).toHaveBeenCalled();
        expect(fakes.apply).not.toHaveBeenCalled();
    });
});
