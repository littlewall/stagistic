import {
    type AuthClient,
    browserSupportsPasskeys,
    PasskeyCancelledError,
} from '@stagistic/auth-client';
import type {PasskeyItem} from '@stagistic/ui';
import {
    useCallback,
    useEffect,
    useState,
} from 'react';

/** A closed passkey prompt is not an error: the dialog just stays as it was. */
const ignoreCancel = async (action: () => Promise<void>) => {
    try {
        await action();
    } catch (error) {
        if (!(error instanceof PasskeyCancelledError)) {
            throw error;
        }
    }
};

/**
 * Passkeys of the signed-in account for Account settings; loaded while the
 * settings dialog is open. Undefined without WebAuthn (passkey UI hidden).
 */
export const usePasskeys = (auth: AuthClient | null, isOpen: boolean) => {
    const [supported] = useState(() => browserSupportsPasskeys());
    const [passkeys, setPasskeys] = useState<PasskeyItem[] | null>(null);

    const reload = useCallback(async () => {
        setPasskeys(await auth!.listPasskeys());
    }, [auth]);

    useEffect(() => {
        if (!auth || !supported || !isOpen) {
            setPasskeys(null);

            return;
        }

        void reload().catch(() => setPasskeys([]));
    }, [
        auth,
        isOpen,
        reload,
        supported,
    ]);

    if (!auth || !supported) {
        return undefined;
    }

    return {
        passkeys,
        onAdd: () => ignoreCancel(async () => {
            await auth.addPasskey();
            await reload();
        }),
        onRemove: async (id: string) => {
            await auth.deletePasskey(id);
            await reload();
        },
    };
};

/** Passkey sign-in for the sign-in dialog; undefined without WebAuthn. */
export const usePasskeySignIn = (auth: AuthClient | null, onSignedIn: () => Promise<void>) => {
    const [supported] = useState(() => browserSupportsPasskeys());

    if (!auth || !supported) {
        return undefined;
    }

    return () => ignoreCancel(async () => {
        await auth.signInWithPasskey();
        await onSignedIn();
    });
};
