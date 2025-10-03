import {
    emailOTPClient,
    magicLinkClient,
    organizationClient,
} from 'better-auth/client/plugins';
import {createAuthClient} from 'better-auth/react';

export const authClient = createAuthClient({
    plugins: [
        magicLinkClient(),
        emailOTPClient(),
        organizationClient(),
    ],
});
