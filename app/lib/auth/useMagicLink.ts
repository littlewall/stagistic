import {useState} from 'react';

import {authClient} from '~lib/auth/client';

interface UseMagicLinkOptions {
    callbackURL?: string,
    newUserCallbackURL?: string,
    errorCallbackURL?: string,
}

interface UseMagicLinkReturn {
    sendMagicLink: (email: string, name: string) => Promise<void>,
    verifyToken: (token: string) => Promise<void>,
    isLoading: boolean,
    error: string | null,
    success: boolean,
    resetState: () => void,
}

/**
 * React hook for magic link authentication
 * Provides methods to send magic links and verify tokens
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { sendMagicLink, isLoading, error, success } = useMagicLink({
 *     callbackURL: '/app/dashboard',
 *     newUserCallbackURL: '/app/welcome',
 *     errorCallbackURL: '/auth/login',
 *   });
 *
 *   const handleSubmit = async (email: string, name: string) => {
 *     await sendMagicLink(email, name);
 *   };
 *
 *   return <div>...</div>;
 * }
 * ```
 */
export function useMagicLink(options: UseMagicLinkOptions = {}): UseMagicLinkReturn {
    const {
        callbackURL = '/app/dashboard',
        newUserCallbackURL = '/app/welcome',
        errorCallbackURL = '/auth/login',
    } = options;

    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    const sendMagicLink = async (email: string, name: string) => {
        setIsLoading(true);
        setError(null);
        setSuccess(false);

        try {
            const {error: magicLinkError} = await authClient.signIn.magicLink({
                email,
                name,
                callbackURL,
                newUserCallbackURL,
                errorCallbackURL,
            });

            if (magicLinkError) {
                setError(magicLinkError.message || 'Failed to send magic link');
            } else {
                setSuccess(true);
            }
        } catch (err) {
            setError('An unexpected error occurred');
            console.error('Magic link error:', err);
        } finally {
            setIsLoading(false);
        }
    };

    const verifyToken = async (token: string) => {
        setIsLoading(true);
        setError(null);

        try {
            const {error: verifyError} = await authClient.magicLink.verify({
                query: {
                    token,
                    callbackURL,
                },
            });

            if (verifyError) {
                setError(verifyError.message || 'Failed to verify magic link');
            } else {
                setSuccess(true);
                // Redirect will be handled automatically if callbackURL is provided
                window.location.href = callbackURL;
            }
        } catch (err) {
            setError('An unexpected error occurred');
            console.error('Magic link verification error:', err);
        } finally {
            setIsLoading(false);
        }
    };

    const resetState = () => {
        setIsLoading(false);
        setError(null);
        setSuccess(false);
    };

    return {
        sendMagicLink,
        verifyToken,
        isLoading,
        error,
        success,
        resetState,
    };
}
