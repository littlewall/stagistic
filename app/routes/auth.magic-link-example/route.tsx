import {
    Container,
    Paper,
    Title,
} from '@mantine/core';

import {MagicLinkLogin} from '~components/auth/MagicLinkLogin';

/**
 * Example magic link authentication page
 * This demonstrates how to use the MagicLinkLogin component
 */
export default function MagicLinkExampleRoute() {
    return (
        <Container size="xs" py={60}>
            <Paper p="xl" radius="md" withBorder>
                <Title order={2} ta="center" mb="md">
                    Sign In with Magic Link
                </Title>
                <MagicLinkLogin
                    callbackURL="/app/dashboard"
                    newUserCallbackURL="/app/teams/overview"
                    errorCallbackURL="/auth/login"
                />
            </Paper>
        </Container>
    );
}
