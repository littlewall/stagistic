import {
    type FormEvent,
    type ReactNode,
    useState,
} from 'react';

import {Button} from '../../atoms/Button/Button';
import {Notice} from '../../feedback/Notice/Notice';
import {ModalActions} from '../modal/ModalActions';
import {ModalDialog} from '../modal/ModalDialog';
import {ModalHeader} from '../modal/ModalHeader';
import styles from './account.module.css';

interface SignInModalProps {
    isOpen: boolean,
    onClose: () => void,
    /** Sends the sign-in link; rejects with a user-facing message. */
    onRequestLink: (email: string) => Promise<void>,
    /** Human check widget (Turnstile), rendered by the host. */
    captcha?: ReactNode,
    isCaptchaComplete: boolean,
    /** Signs in with a passkey; resolves when signed in or cancelled, rejects with a user-facing message. Omitted without WebAuthn. */
    onPasskeySignIn?: () => Promise<void>,
}

export const SignInModal = ({
    isOpen,
    onClose,
    onRequestLink,
    captcha,
    isCaptchaComplete,
    onPasskeySignIn,
}: SignInModalProps) => {
    const [email, setEmail] = useState('');
    const [sentTo, setSentTo] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isPending, setIsPending] = useState(false);

    const [wasOpen, setWasOpen] = useState(isOpen);

    if (wasOpen !== isOpen) {
        setWasOpen(isOpen);
        if (!isOpen) {
            setSentTo(null);
            setError(null);
        }
    }

    const handlePasskey = async () => {
        setError(null);
        setIsPending(true);

        try {
            await onPasskeySignIn?.();
        } catch (passkeyError) {
            setError(passkeyError instanceof Error ? passkeyError.message : 'The passkey could not be used.');
        } finally {
            setIsPending(false);
        }
    };

    const handleSubmit = async (event: FormEvent) => {
        event.preventDefault();
        setError(null);
        setIsPending(true);

        try {
            await onRequestLink(email.trim());
            setSentTo(email.trim());
        } catch (requestError) {
            setError(requestError instanceof Error ? requestError.message : 'The sign-in link could not be sent.');
        } finally {
            setIsPending(false);
        }
    };

    if (sentTo) {
        return (
            <ModalDialog
                isOpen={isOpen}
                onClose={onClose}
                ariaLabel="Check your email"
            >
                <ModalHeader
                    title="Check your email"
                    description={`We sent a sign-in link to ${sentTo}. Open it on this device; it expires in 10 minutes.`}
                />
                <ModalActions>
                    <Button onPress={onClose}>Done</Button>
                    <Button
                        variant="ghost"
                        onPress={() => setSentTo(null)}
                    >
                        Use a different email
                    </Button>
                </ModalActions>
            </ModalDialog>
        );
    }

    return (
        <ModalDialog
            isOpen={isOpen}
            onClose={onClose}
            ariaLabel="Sign in"
        >
            <ModalHeader
                title="Sign in"
                description="Sync your scripts between devices. We email you a link; no password needed."
            />
            <form
                className={styles.form}
                onSubmit={event => void handleSubmit(event)}
            >
                {onPasskeySignIn ? (
                    <>
                        <Button
                            variant="secondary"
                            isDisabled={isPending}
                            onPress={() => void handlePasskey()}
                        >
                            Sign in with a passkey
                        </Button>
                        <p
                            className={styles.divider}
                            aria-hidden="true"
                        >
                            or
                        </p>
                    </>
                ) : null}
                <label
                    className={styles.label}
                    htmlFor="sign-in-email"
                >
                    Email
                </label>
                <input
                    id="sign-in-email"
                    className={styles.input}
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={event => setEmail(event.target.value)}
                />
                <div className={styles.captcha}>{captcha}</div>
                {error ? <Notice variant="error">{error}</Notice> : null}
                <ModalActions>
                    <Button
                        type="submit"
                        isDisabled={isPending || !isCaptchaComplete || email.trim().length === 0}
                    >
                        Send sign-in link
                    </Button>
                    <Button
                        variant="ghost"
                        onPress={onClose}
                    >
                        Cancel
                    </Button>
                </ModalActions>
            </form>
        </ModalDialog>
    );
};
