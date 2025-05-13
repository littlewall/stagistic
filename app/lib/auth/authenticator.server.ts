import {Authenticator} from 'remix-auth';
import {EmailLinkStrategy} from './strategy.server';
import {User} from '~lib/db/entities/User';
import {resolveEntityManager} from '~lib/db/orm';
import globals from '~config/globals';
import {sendMagicLinkEmail} from './email.server';

type UserAuth = {
    email: string,
};

const magicLinkSecret = globals.get('auth.magicLink.secret');
const clientBaseUrl = globals.get('client.baseUrl');

export const authenticator = new Authenticator<UserAuth | null>();

authenticator.use(
    new EmailLinkStrategy(
        {
            sendEmail: sendMagicLinkEmail,
            secret: magicLinkSecret,
            magicEndpoint: clientBaseUrl + '/auth/verify',
            linkMaxAge: 60 * 5,
        },
        async ({email}) => {
            const em = await resolveEntityManager();

            const user = await em
                .getRepository(User)
                .findOne(
                    {email},
                );

            if (!user) {
                throw new Error('User not found');
            }

            return user;
        },
    ),
);
