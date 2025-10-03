import {
    Button,
    Stack,
    Text,
    TextInput,
} from '@mantine/core';
import {useState} from 'react';

import {authClient} from '~lib/auth/client';

interface MagicLinkLoginProps {
    callbackURL?: string,
    newUserCallbackURL?: string,
    errorCallbackURL?: string,
    redirectOnSuccess?: boolean,
}

export function MagicLinkLogin({
    callbackURL = '/app/dashboard',
    newUserCallbackURL = '/app/welcome',
    errorCallbackURL = '/auth/login',
    redirectOnSuccess = true,
}: MagicLinkLoginProps) {
    const [email, setEmail] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);

        try {
            const {error: magicLinkError} = await authClient.signIn.magicLink({
                email,
                name: email,
                callbackURL,
                newUserCallbackURL,
                errorCallbackURL,
            });

            if (magicLinkError) {
                setError(magicLinkError.message || 'Failed to send magic link');
            } else {
                setSuccess(true);
                if (redirectOnSuccess) {
                    window.location.href = '/auth/login?sent=true';
                }
            }
        } catch (err) {
            setError('An unexpected error occurred');
            console.error('Magic link error:', err);
        } finally {
            setIsLoading(false);
        }
    };

    if (success && !redirectOnSuccess) {
        return (
            <Stack gap="md">
                <Text size="lg" fw={600}>Check your email</Text>
                <Text size="sm" c="dimmed">
                    We sent a magic link to <strong>{email}</strong>.
                    Click the link in the email to sign in.
                </Text>
            </Stack>
        );
    }

    return (
        <form onSubmit={handleSubmit}>
            <Stack gap="md">
                <TextInput
                    label="Email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                    disabled={isLoading}
                />
                {error && (
                    <Text size="sm" c="red">
                        {error}
                    </Text>
                )}
                <Button
                    type="submit"
                    loading={isLoading}
                    disabled={isLoading}
                >
                    Send Magic Link
                </Button>
            </Stack>
        </form>
    );
}
