import jwt from 'jsonwebtoken';
import {User} from '~lib/db/entities/User';
import {resolveEntityManager} from '~lib/db/orm';
import globals from '~config/globals';
import {sendMagicLinkEmail} from './email.server';
import {createMagicLinkCookie} from './utils';
import {MagicLinkErrorCode} from './configs';

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

export const COOKIE_MAGIC_LINK_SENT = 'magic-link-sent';

const magicLinkSecret = globals.get('auth.magicLink.secret');
const clientBaseUrl = globals.get('client.baseUrl');

// --- Core Logic ---
const createMagicLink = (email: string, linkMaxAge: number, magicEndpoint: string, magicLinkTokenKey: string, secret: string) => {
    const payload = {
        email,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + linkMaxAge,
    };
    const token = jwt.sign(payload, secret);
    const url = new URL(magicEndpoint);

    url.searchParams.set(magicLinkTokenKey, token);

    return {magicLink: url.toString(), token};
};

const sendMagicLink = async (email: string, options: Required<ConstructorOptions>) => {
    const em = await resolveEntityManager();
    const user = await em.getRepository(User).findOne({email});

    if (!user) {
        throw new MagicLinkError(
            MagicLinkErrorCode.USER_NOT_FOUND,
            'User not found. Please check your email and try again.',
        );
    }

    const {magicLink} = createMagicLink(email, options.linkMaxAge, options.magicEndpoint, options.magicLinkTokenKey, options.secret);

    await options.sendEmail({email, magicLink});

    const cookie = createMagicLinkCookie(COOKIE_MAGIC_LINK_SENT, 'true', {
        maxAge: options.linkMaxAge,
    });

    return new Headers({'Set-Cookie': cookie.toString()});
};

const validateMagicLinkToken = (request: Request, options: Required<ConstructorOptions>) => {
    const requestParams = new URL(request.url).searchParams;

    if (!requestParams.has(options.magicLinkTokenKey)) {
        throw new MagicLinkError(
            MagicLinkErrorCode.TOKEN_INVALID,
            'Missing token on params.',
        );
    }

    const requestToken = requestParams.get(options.magicLinkTokenKey) ?? '';

    try {
        const payload = jwt.verify(requestToken, options.secret) as {email: string};

        return payload.email;
    } catch (err: unknown) {
        if (err instanceof jwt.TokenExpiredError) {
            throw new MagicLinkError(
                MagicLinkErrorCode.TOKEN_EXPIRED,
                'Token expired. Please request a new one.',
            );
        }

        throw new MagicLinkError(
            MagicLinkErrorCode.TOKEN_INVALID,
            'Invalid Token',
        );
    }
};

const verifyMagicLink = async (request: Request, options: Required<ConstructorOptions>) => {
    const email = validateMagicLinkToken(request, options);
    const em = await resolveEntityManager();
    const user = await em.getRepository(User).findOne({email});

    if (!user) {
        throw new MagicLinkError(
            MagicLinkErrorCode.USER_NOT_FOUND,
            'User not found. Please check your email and try again.',
        );
    }

    return {id: user.id, email: user.email};
};

export interface ConstructorOptions {
    secret: string,
    emailField?: string,
    magicEndpoint: string,
    sendEmail: SendEmailFunction,
    validateEmail?: ValidateEmailFunction,
    magicLinkTokenKey?: string,
    linkMaxAge?: number,
}
export type SendEmailOptions = {
    email: string,
    magicLink: string,
};
export type SendEmailFunction = (options: SendEmailOptions) => void | Promise<void>;
export type ValidateEmailFunction = (email: string) => boolean | Promise<boolean>;

const defaultOptions: Required<ConstructorOptions> = {
    secret: magicLinkSecret,
    emailField: 'email',
    magicEndpoint: clientBaseUrl + '/auth/verify',
    sendEmail: sendMagicLinkEmail,
    validateEmail: (email: string) => (/^[\w-.]+@([\w-]+\.)+[\w-]{2,4}$/).test(email),
    magicLinkTokenKey: 'token',
    linkMaxAge: 60 * 5,
};

export const sendMagicLinkFlow = async (
    request: Request,
    opts?: {formData?: FormData},
    options: Partial<ConstructorOptions> = {},
): Promise<Headers> => {
    const mergedOptions = {...defaultOptions, ...options};
    const formData = opts?.formData ?? await request.formData();
    const email = formData.get(mergedOptions.emailField);

    if (!email) {
        throw new MagicLinkError(
            MagicLinkErrorCode.EMAIL_REQUIRED,
            'Email is required to initiate the authentication process',
        );
    }

    if (typeof email !== 'string') {
        throw new MagicLinkError(
            MagicLinkErrorCode.EMAIL_NOT_STRING,
            'Email must be a string.',
        );
    }

    return await sendMagicLink(email, mergedOptions);
};

export const verifyMagicLinkFlow = async (
    request: Request,
    options: Partial<ConstructorOptions> = {},
): Promise<UserAuth> => {
    const mergedOptions = {...defaultOptions, ...options};

    return await verifyMagicLink(request, mergedOptions);
};
