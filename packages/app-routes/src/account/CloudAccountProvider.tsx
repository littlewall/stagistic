import type {AuthClient} from '@stagistic/auth-client';
import type {
    CloudCheckReport,
    CloudStatus,
    SyncEngineCloudClient,
} from '@stagistic/sync-engine';
import {
    type AccountMenuAccount,
    type CloudConflictResolution,
    useToastController,
} from '@stagistic/ui';
import {
    createContext,
    type ReactNode,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useRef,
    useState,
} from 'react';

import {CloudAccountModals} from './CloudAccountModals';
import {cloudSyncLabel} from './cloudSyncLabels';
import {usePasskeys, usePasskeySignIn} from './usePasskeys';

/*
 * Account and cloud sync for the app. The auth client signs in (magic link);
 * the sync engine (leader worker) does the rest. After a sign-in this device
 * has not checked yet, the engine reports `needs-check`: the check runs here,
 * and only scripts changed on both sides open a dialog; otherwise a toast.
 */

export type AccountModal = 'sign-in' | 'settings' | 'conflicts' | null;

export interface CloudAccountValue {
    /** Hosts without cloud config (desktop, tests) have no account UI. */
    isEnabled: boolean,
    status: CloudStatus | null,
    /** For `AppHeader`; undefined when disabled. */
    menuAccount: AccountMenuAccount | undefined,
    syncLabel: string | undefined,
    openSignIn: () => void,
    /** `/auth/callback`: exchanges the link token for a session. */
    completeSignIn: (token: string) => Promise<void>,
    /** Sign-in, settings or conflict dialog is open (other prompts wait). */
    isAccountModalOpen: boolean,
}

interface CloudAccountState {
    modal: AccountModal,
    setModal: (modal: AccountModal) => void,
    report: CloudCheckReport | null,
    requestLink: (email: string, captchaToken: string) => Promise<void>,
    signOut: () => Promise<void>,
    resolve: (resolutions: Record<string, CloudConflictResolution>) => Promise<void>,
    cancelCheck: () => Promise<void>,
    signInWithPasskey: (() => Promise<void>) | undefined,
    passkeys: ReturnType<typeof usePasskeys>,
}

const disabled: CloudAccountValue = {
    isEnabled: false,
    status: null,
    menuAccount: undefined,
    syncLabel: undefined,
    openSignIn: () => {},
    completeSignIn: () => Promise.resolve(),
    isAccountModalOpen: false,
};

const CloudAccountContext = createContext<CloudAccountValue>(disabled);

export const useCloudAccount = () => useContext(CloudAccountContext);

const plural = (count: number) => `${count} script${count === 1 ? '' : 's'}`;

export const CloudAccountProvider = ({
    auth,
    cloud,
    turnstileSiteKey,
    callbackPath = '/auth/callback',
    children,
}: {
    auth: AuthClient | null,
    cloud: SyncEngineCloudClient | null,
    turnstileSiteKey: string,
    callbackPath?: string,
    children: ReactNode,
}) => {
    const {addToast} = useToastController();
    const [status, setStatus] = useState<CloudStatus | null>(null);
    const [modal, setModal] = useState<AccountModal>(null);
    const [report, setReport] = useState<CloudCheckReport | null>(null);
    const checking = useRef(false);

    useEffect(() => {
        if (!cloud) {
            return undefined;
        }

        void cloud.status().then(setStatus).catch(() => {});

        // Change hints may have been missed while the tab slept: one catch-up pass.
        const onVisible = () => {
            if (document.visibilityState === 'visible') {
                void cloud.wake().catch(() => {});
            }
        };
        const unsubscribe = cloud.onStatus(setStatus);

        document.addEventListener('visibilitychange', onVisible);

        return () => {
            unsubscribe();
            document.removeEventListener('visibilitychange', onVisible);
        };
    }, [cloud]);

    const signOut = useCallback(async () => {
        setModal(null);
        await auth?.signOut().catch(() => {});
        setStatus(await cloud!.signedOut());
    }, [auth, cloud]);

    const signInWithPasskey = usePasskeySignIn(auth, async () => {
        setModal(null);
        setStatus(await cloud!.signedIn());
    });
    const passkeys = usePasskeys(auth, modal === 'settings');

    // Post-sign-in check: automatic unless scripts changed on both sides.
    useEffect(() => {
        // `check` itself moves the state (checking → needs-check): one check per sign-in until the dialog is answered.
        if (!cloud || status?.state !== 'needs-check' || checking.current || report) {
            return;
        }

        checking.current = true;
        void cloud.check()
            .then(async result => {
                if (result.conflicts.length > 0) {
                    setReport(result);
                    setModal('conflicts');

                    return;
                }

                await cloud.apply({});
                addToast({
                    title: `Synced with ${result.email}`,
                    description: `${plural(result.upload)} uploaded · ${plural(result.download)} downloaded`,
                }, {timeout: 6_000});
            })
            .catch(() => addToast({
                title: 'Sync could not start',
                description: 'Your scripts are saved on this device. Try again later.',
            }, {timeout: 8_000}))
            .finally(() => {
                checking.current = false;
            });
    }, [
        addToast,
        cloud,
        report,
        status?.state,
    ]);

    const state: CloudAccountState = {
        modal,
        setModal,
        report,
        requestLink: async (email, captchaToken) => {
            await auth!.requestMagicLink(email, {captchaToken, callbackURL: new URL(callbackPath, window.location.origin).toString()});
        },
        signOut,
        resolve: async resolutions => {
            await cloud!.apply(resolutions);
            setModal(null);
            setReport(null);
            addToast({title: 'Synced with your account'}, {timeout: 5_000});
        },
        // "Cancel" in the conflict dialog: stay signed out (nothing was changed).
        cancelCheck: async () => {
            setReport(null);
            await signOut();
        },
        signInWithPasskey,
        passkeys,
    };

    const isEnabled = Boolean(auth && cloud);
    const email = status && status.state !== 'signed-out' ? status.email : null;
    const value = useMemo<CloudAccountValue>(() => (isEnabled
        ? {
            isEnabled,
            status,
            menuAccount: {
                email,
                onSignIn: () => setModal('sign-in'),
                onSignOut: () => void signOut(),
                onOpenAccountSettings: () => setModal('settings'),
            },
            syncLabel: cloudSyncLabel(status),
            openSignIn: () => setModal('sign-in'),
            completeSignIn: async token => {
                await auth!.verifyMagicLink(token);
                setStatus(await cloud!.signedIn());
            },
            isAccountModalOpen: modal !== null,
        }
        : disabled), [
        auth,
        cloud,
        email,
        isEnabled,
        modal,
        signOut,
        status,
    ]);

    return (
        <CloudAccountContext.Provider value={value}>
            {children}
            {isEnabled ? (
                <CloudAccountModals
                    state={state}
                    status={status}
                    turnstileSiteKey={turnstileSiteKey}
                />
            ) : null}
        </CloudAccountContext.Provider>
    );
};

export type {CloudAccountState};
