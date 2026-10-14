import {useState} from 'react';

import {Button} from '../../atoms/Button/Button';
import {Notice} from '../../feedback/Notice/Notice';
import styles from './account.module.css';
import {formatSyncTime, type PasskeyItem} from './types';

export interface PasskeysSectionProps {
    /** null while loading. */
    passkeys: PasskeyItem[] | null,
    /** Opens the browser's passkey prompt; resolves when added or cancelled, rejects with a user-facing message. */
    onAdd: () => Promise<void>,
    onRemove: (id: string) => Promise<void>,
}

/** Passkeys of the account: sign in without an email link. */
export const PasskeysSection = ({
    passkeys,
    onAdd,
    onRemove,
}: PasskeysSectionProps) => {
    const [error, setError] = useState<string | null>(null);
    const [busy, setBusy] = useState<string | null>(null);

    const run = async (key: string, action: () => Promise<void>) => {
        setError(null);
        setBusy(key);

        try {
            await action();
        } catch (actionError) {
            setError(actionError instanceof Error ? actionError.message : 'Something went wrong. Please try again.');
        } finally {
            setBusy(null);
        }
    };

    return (
        <section
            className={styles.section}
            aria-labelledby="account-passkeys"
        >
            <h3
                id="account-passkeys"
                className={styles.sectionTitle}
            >
                Passkeys
            </h3>
            <p className={styles.summary}>Sign in with your fingerprint, face or device PIN instead of an email link.</p>
            {passkeys && passkeys.length > 0 ? (
                <ul className={styles.passkeys}>
                    {passkeys.map(passkey => (
                        <li
                            key={passkey.id}
                            className={styles.passkey}
                        >
                            <span>
                                {passkey.name ?? 'Passkey'}
                                <span className={styles.passkeyMeta}>
                                    {` · added ${formatSyncTime(passkey.createdAt)}${passkey.backedUp ? ' · synced' : ''}`}
                                </span>
                            </span>
                            <Button
                                variant="ghost"
                                size="sm"
                                aria-label={`Remove passkey added ${formatSyncTime(passkey.createdAt)}`}
                                isPending={busy === passkey.id}
                                isDisabled={busy !== null}
                                onPress={() => void run(passkey.id, () => onRemove(passkey.id))}
                            >
                                Remove
                            </Button>
                        </li>
                    ))}
                </ul>
            ) : null}
            {error ? <Notice variant="error">{error}</Notice> : null}
            <div>
                <Button
                    variant="secondary"
                    size="sm"
                    isPending={busy === 'add'}
                    isDisabled={busy !== null || passkeys === null}
                    onPress={() => void run('add', onAdd)}
                >
                    Add a passkey
                </Button>
            </div>
        </section>
    );
};
