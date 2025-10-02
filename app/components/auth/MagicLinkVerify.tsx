import {
    Button,
    Stack,
    Text,
    TextInput,
} from '@mantine/core';
import {useState} from 'react';

import {authClient} from '~lib/auth/client';

interface MagicLinkVerifyProps {
    callbackURL?: string,
}

export function MagicLinkVerify({
    callbackURL = '/app/dashboard',
}: MagicLinkVerifyProps) {
    const [token, setToken] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
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

    return (
        <form onSubmit={handleSubmit}>
            <Stack gap="md">
                <Text size="lg" fw={600}>Verify Magic Link</Text>
                <Text size="sm" c="dimmed">
                    Enter the token from your email to complete authentication.
                </Text>
                <TextInput
                    label="Token"
                    type="text"
                    placeholder="Enter your token"
                    value={token}
                    onChange={e => setToken(e.target.value)}
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
                    Verify Token
                </Button>
            </Stack>
        </form>
    );
}
