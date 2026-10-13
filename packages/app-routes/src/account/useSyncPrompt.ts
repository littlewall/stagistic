import {useLocalPreference} from '../shared/useLocalPreference';
import {useCloudAccount} from './CloudAccountProvider';

const SYNC_PROMPT_DISMISSED_KEY = 'stagistic.account.sync-prompt-dismissed';

/** One-time offer to sign in, for writers who have scripts and no account yet. */
export const useSyncPrompt = (scriptCount: number) => {
    const {
        isEnabled,
        status,
        openSignIn,
    } = useCloudAccount();
    const [dismissed, setDismissed] = useLocalPreference({
        key: SYNC_PROMPT_DISMISSED_KEY,
        defaultValue: false,
        parse: value => (typeof value === 'boolean' ? value : undefined),
    });

    return {
        isOpen: isEnabled && status?.state === 'signed-out' && scriptCount > 0 && !dismissed,
        onSignIn: () => {
            setDismissed(true);
            openSignIn();
        },
        onDismiss: () => setDismissed(true),
    };
};
