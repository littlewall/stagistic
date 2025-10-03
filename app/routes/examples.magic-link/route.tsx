import {
    Button,
    Container,
    Divider,
    Paper,
    Stack,
    Tabs,
    Text,
    TextInput,
    Title,
} from '@mantine/core';
import {useState} from 'react';

import {MagicLinkLogin} from '~components/auth/MagicLinkLogin';
import {MagicLinkVerify} from '~components/auth/MagicLinkVerify';
import {useMagicLink} from '~lib/auth/useMagicLink';

/**
 * Comprehensive examples of magic link authentication usage
 * Shows three different approaches:
 * 1. Using the pre-built component
 * 2. Using the custom hook
 * 3. Direct API usage
 */
export default function MagicLinkExamplesRoute() {
    return (
        <Container size="lg" py={40}>
            <Title order={1} mb="xl">
                Magic Link Authentication Examples
            </Title>

            <Tabs defaultValue="component">
                <Tabs.List>
                    <Tabs.Tab value="component">Component Usage</Tabs.Tab>
                    <Tabs.Tab value="hook">Hook Usage</Tabs.Tab>
                    <Tabs.Tab value="verify">Verification</Tabs.Tab>
                </Tabs.List>

                <Tabs.Panel value="component" pt="xl">
                    <Paper p="xl" radius="md" withBorder>
                        <Title order={3} mb="md">
                            Using MagicLinkLogin Component
                        </Title>
                        <Text size="sm" c="dimmed" mb="lg">
                            The easiest way to implement magic link authentication
                        </Text>
                        <MagicLinkLogin
                            callbackURL="/app/dashboard"
                            newUserCallbackURL="/app/organizations/overview"
                            errorCallbackURL="/auth/login"
                        />
                    </Paper>
                </Tabs.Panel>

                <Tabs.Panel value="hook" pt="xl">
                    <Paper p="xl" radius="md" withBorder>
                        <Title order={3} mb="md">
                            Using useMagicLink Hook
                        </Title>
                        <Text size="sm" c="dimmed" mb="lg">
                            For more control over the UI and logic
                        </Text>
                        <HookExample />
                    </Paper>
                </Tabs.Panel>

                <Tabs.Panel value="verify" pt="xl">
                    <Paper p="xl" radius="md" withBorder>
                        <Title order={3} mb="md">
                            Manual Token Verification
                        </Title>
                        <Text size="sm" c="dimmed" mb="lg">
                            For custom verification flows
                        </Text>
                        <MagicLinkVerify callbackURL="/app/dashboard" />
                    </Paper>
                </Tabs.Panel>
            </Tabs>

            <Divider my="xl" />

            <Paper p="xl" radius="md" withBorder>
                <Title order={3} mb="md">
                    Configuration Options
                </Title>
                <Stack gap="sm">
                    <Text size="sm">
                        <strong>callbackURL:</strong> Where to redirect authenticated users
                    </Text>
                    <Text size="sm">
                        <strong>newUserCallbackURL:</strong> Where to redirect new signups
                    </Text>
                    <Text size="sm">
                        <strong>errorCallbackURL:</strong> Where to redirect on errors
                    </Text>
                    <Text size="sm" mt="md">
                        See <code>MAGIC_LINK_AUTH.md</code> for complete documentation.
                    </Text>
                </Stack>
            </Paper>
        </Container>
    );
}

/**
 * Example component using the useMagicLink hook
 */
function HookExample() {
    const [email, setEmail] = useState('');

    const {
        sendMagicLink,
        isLoading,
        error,
        success,
    } = useMagicLink({
        callbackURL: '/app/dashboard',
        newUserCallbackURL: '/app/organizations/overview',
        errorCallbackURL: '/auth/login',
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        await sendMagicLink(email, email); // Use email as default name
    };

    if (success) {
        return (
            <Stack gap="md">
                <Text size="lg" fw={600}>
                    Check your email
                </Text>
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
                <Button type="submit" loading={isLoading} disabled={isLoading}>
                    Send Magic Link (Hook)
                </Button>
            </Stack>
        </form>
    );
}
