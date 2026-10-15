import {useEffect} from 'react';

import {useLocalPreference} from '../shared/useLocalPreference';
import {useCloudAccount} from './CloudAccountProvider';

const SYNC_PROMPT_DISMISSED_KEY = 'stagistic.account.sync-prompt-dismissed';

/** One-time offer to sign in, for writers who have scripts and no account yet. */
export const useSyncPrompt = (scriptCount: number) => {
    const {
        isEnabled,
        status,
        openSignIn,
        isAccountModalOpen,
    } = useCloudAccount();
    const [dismissed, setDismissed] = useLocalPreference({
        key: SYNC_PROMPT_DISMISSED_KEY,
        defaultValue: false,
        parse: value => (typeof value === 'boolean' ? value : undefined),
    });

    const hasAccount = Boolean(status && status.state !== 'signed-out');

    // Only for writers without an account: once signed in, signing out never brings it back.
    useEffect(() => {
        if (hasAccount && !dismissed) {
            setDismissed(true);
        }
    }, [
        dismissed,
        hasAccount,
        setDismissed,
    ]);

    return {
        isOpen: isEnabled && status?.state === 'signed-out' && scriptCount > 0 && !dismissed && !isAccountModalOpen,
        onSignIn: () => {
            setDismissed(true);
            openSignIn();
        },
        onDismiss: () => setDismissed(true),
    };
};
