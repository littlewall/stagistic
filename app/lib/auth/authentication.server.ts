import {Session} from '@remix-run/node';
import jwt from 'jsonwebtoken';

import globals from '~config/globals';
import {User} from '~lib/db/entities/User';
import {resolveEntityManager} from '~lib/db/orm';

import {createMagicLinkCookie} from './auth-session.server';
import {
    GENERIC_ERRORS,
    MAGIC_LINK_ERRORS,
    MagicLinkErrorCode,
} from './configs';
import {sendMagicLinkEmail, sendMagicLinkSignupEmail} from './email.server';

export type UserAuth = {
    id: string,
    email: string,
};

export class MagicLinkError extends Error {
    code: MagicLinkErrorCode;

    constructor(code: MagicLinkErrorCode, message: string) {
        super(message);
        this.code = code;
        this.name = 'MagicLinkError';
    }
}

const magicLinkSecret = globals.get('auth.magicLink.secret');
const clientBaseUrl = globals.get('client.baseUrl');
const defaultOptions: Required<ConstructorOptions> = {
    secret: magicLinkSecret,
    emailField: 'email',
    magicEndpoint: clientBaseUrl + '/auth/verify',
    magicLinkTokenKey: 'token',
    linkMaxAge: 60 * 5,
};

const createMagicLink = (email: string) => {
    const payload = {
        email,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + defaultOptions.linkMaxAge,
    };
    const token = jwt.sign(payload, defaultOptions.secret);
    const url = new URL(defaultOptions.magicEndpoint);

    url.searchParams.set(defaultOptions.magicLinkTokenKey, token);

    return {magicLink: url.toString(), token};
};

const sendMagicLink = async (email: string, session: Session) => {
    const em = await resolveEntityManager();
    const user = await em.getRepository(User).findOne({email});

    const {magicLink} = createMagicLink(email);

    if (user) {
        await sendMagicLinkEmail({email, magicLink});
    }

    if (!user) {
        await sendMagicLinkSignupEmail({email, magicLink});
    }

    const cookie = await createMagicLinkCookie(session);

    return new Headers({'Set-Cookie': cookie.toString()});
};

const validateMagicLinkToken = (request: Request) => {
    const requestParams = new URL(request.url).searchParams;

    if (!requestParams.has(defaultOptions.magicLinkTokenKey)) {
        throw new MagicLinkError(
            MagicLinkErrorCode.TOKEN_INVALID,
            MAGIC_LINK_ERRORS[MagicLinkErrorCode.TOKEN_INVALID].message,
        );
    }

    const requestToken = requestParams.get(defaultOptions.magicLinkTokenKey) ?? '';

    try {
        const payload = jwt.verify(requestToken, defaultOptions.secret) as {email: string};

        return payload.email;
    } catch (err: unknown) {
        if (err instanceof jwt.TokenExpiredError) {
            throw new MagicLinkError(
                MagicLinkErrorCode.TOKEN_EXPIRED,
                MAGIC_LINK_ERRORS[MagicLinkErrorCode.TOKEN_EXPIRED].message,
            );
        }

        throw new MagicLinkError(
            MagicLinkErrorCode.TOKEN_INVALID,
            MAGIC_LINK_ERRORS[MagicLinkErrorCode.TOKEN_INVALID].message,
        );
    }
};

const verifyMagicLink = async (request: Request) => {
    const email = validateMagicLinkToken(request);
    const em = await resolveEntityManager();
    let user = await em.getRepository(User).findOne({email});

    if (!user) {
        user = new User();
        user.email = email;

        await em.persistAndFlush(user);
    }

    return {
        id: user.id,
        email: user.email,
    };
};

export interface ConstructorOptions {
    secret: string,
    emailField?: string,
    magicEndpoint: string,
    magicLinkTokenKey?: string,
    linkMaxAge?: number,
}
export type SendEmailOptions = {
    email: string,
    magicLink: string,
};
export type SendEmailFunction = (options: SendEmailOptions) => void | Promise<void>;

export const sendMagicLinkFlow = async (email: string, session: Session): Promise<Headers> => {
    try {
        return await sendMagicLink(email, session);
    } catch (err) {
        console.error('[MagicLink] Error sending magic link:', err);

        throw new MagicLinkError(
            MagicLinkErrorCode.UNKNOWN,
            GENERIC_ERRORS.GENERIC_REQUEST.message,
        );
    }
};

export const verifyMagicLinkFlow = async (
    request: Request,
): Promise<UserAuth> => {
    try {
        return await verifyMagicLink(request);
    } catch (err) {
        console.error('[MagicLink] Error verifying magic link:', err);

        throw new MagicLinkError(
            MagicLinkErrorCode.UNKNOWN,
            GENERIC_ERRORS.GENERIC_REQUEST.message,
        );
    }
};
