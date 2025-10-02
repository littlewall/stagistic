import {betterAuth} from 'better-auth';
import {Pool} from 'pg';

import globals from '../../config/globals';
import {sendTemplateEmail} from '../../lib/email/email.service';
import {createAuthConfig} from './config';

const {
    user,
    password,
    host,
    database,
} = globals.get('database.postgres');

export const auth = betterAuth(
    createAuthConfig({
        database: new Pool({
            connectionString: `postgres://${user}:${password}@${host}/${database}`,
        }),
        sendMagicLink: async ({email, url}) => {
            try {
                await sendTemplateEmail(email, 'magic-link', {
                    magic_link: url,
                });
            } catch (error) {
                console.error('Error sending magic link email:', error);
            }
        },
        sendVerificationOTP: async ({email, otp}) => {
            try {
                /*
                 * For dangerous actions, we'll use a custom type
                 * For now, all OTPs for critical actions will be sent with the dangerous-action-otp template
                 */
                await sendTemplateEmail(email, 'dangerous-action-otp', {
                    otp,
                });
            } catch (error) {
                console.error('Error sending OTP email:', error);
                throw error;
            }
        },
    }),
);
