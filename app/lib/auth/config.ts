import type {BetterAuthOptions} from 'better-auth';
import {
    emailOTP,
    magicLink,
    organization,
} from 'better-auth/plugins';

interface AuthConfigOptions {
    database: BetterAuthOptions['database'],
    sendMagicLink?: (params: {email: string, url: string}) => Promise<void>,
    sendVerificationOTP?: (params: {email: string, otp: string}) => Promise<void>,
}

/**
 * Create Better Auth configuration
 * This function is shared between the application (auth.server.ts) and CLI (auth.config.ts)
 */
export function createAuthConfig(options: AuthConfigOptions): BetterAuthOptions {
    return {
        database: options.database,
        plugins: [
            magicLink({
                sendMagicLink: options.sendMagicLink || (async ({email, url}) => {
                    // Default implementation for CLI (just log)
                    await Promise.resolve();
                    console.log(`Magic link for ${email}: ${url}`);
                }),
            }),
            emailOTP({
                sendVerificationOTP: options.sendVerificationOTP || (async ({email, otp}) => {
                    // Default implementation for CLI (just log)
                    await Promise.resolve();
                    console.log(`OTP for ${email}: ${otp}`);
                }),
                otpLength: 6,
                expiresIn: 300, // 5 minutes
                allowedAttempts: 3,
            }),
            organization({
                async sendInvitationEmail(data) {
                    // TODO: Implement invitation email sending
                    await Promise.resolve();
                    console.log(`Invitation email for ${data.email} to organization ${data.organization.name}`);
                },
            }),
        ],
    };
}
