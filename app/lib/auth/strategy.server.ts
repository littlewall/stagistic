import {Strategy} from 'remix-auth/strategy';
import {isFormDataRequest} from './utils';
import jwt from 'jsonwebtoken';
import {SetCookie} from '@mjackson/headers';

type URLConstructor = ConstructorParameters<typeof URL>[0];

export const COOKIE_MAGIC_LINK_SENT = 'magic-link-sent';
export const STRATEGY_NAME = 'magic-link';

export class EmailLinkStrategy<User> extends Strategy<
    User | null,
    VerifyOptions
> {
    name = STRATEGY_NAME;

    protected options: Required<ConstructorOptions>;

    constructor(
        {
            emailField = 'email',
            tokenKey = 'token',
            linkMaxAge = 60 * 10,
            validateEmail = (email: string) => (/^[\w-.]+@([\w-]+\.)+[\w-]{2,4}$/).test(email),
            ...restOptions
        }: ConstructorOptions,
        verify: Strategy.VerifyFunction<User, VerifyOptions>,
    ) {
        super(verify);

        this.options = {
            emailField,
            tokenKey,
            linkMaxAge,
            validateEmail,
            ...restOptions,
        };
    }

    private createMagicLink(email: string) {
        const payload = {
            email,
            iat: Math.floor(Date.now() / 1000),
            exp: Math.floor(Date.now() / 1000) + this.options.linkMaxAge,
        };

        const token = jwt.sign(payload, this.options.secret);
        const url = new URL(this.options.magicEndpoint);

        url.searchParams.set(this.options.tokenKey, token);

        return {magicLink: url.toString(), token};
    }

    private async sendToken(email: string): Promise<Headers> {
        const valid = await this.options.validateEmail(email);

        if (!valid) {
            throw new Error('Email is invalid');
        }

        const {magicLink} = this.createMagicLink(email);

        await this.options.sendEmail({
            email,
            magicLink,
        });

        const expirationDate = new Date();

        expirationDate.setSeconds(expirationDate.getSeconds() + this.options.linkMaxAge);

        const cookie = new SetCookie({
            name: COOKIE_MAGIC_LINK_SENT,
            httpOnly: true,
            value: 'true',
            maxAge: this.options.linkMaxAge,
            path: '/',
            sameSite: 'Lax',
        });

        return new Headers({'Set-Cookie': cookie.toString()});
    }

    private validateToken(request: Request) {
        const requestParams = new URL(request.url).searchParams;

        if (!requestParams.has(this.options.tokenKey)) {
            throw new ReferenceError('Missing token on params.');
        }

        const requestToken = requestParams.get(this.options.tokenKey) ?? '';

        try {
            const payload = jwt.verify(requestToken, this.options.secret) as JwtPayload;

            return payload.email;
        } catch (err: unknown) {
            if (err instanceof jwt.TokenExpiredError) {
                throw new Error('Token expired. Please request a new one.');
            }

            throw new TypeError('Invalid Token');
        }
    }

    public async getSession(request: Request): Promise<User | null> {
        try {
            const email = this.validateToken(request);

            if (email) {
                return this.verify({email});
            }
        } catch (error) {
            console.error('Error validating token:', error);
        }

        return null;
    }

    public async authenticate(request: Request): Promise<User | null> {
        const url = new URL(request.url);
        const token = url.searchParams.get(this.options.tokenKey);
        const isSendingLoginForm = isFormDataRequest(request);

        if (!token && isSendingLoginForm) {
            const formData = await request.formData();

            const email = formData.get(this.options.emailField);

            if (!email) {
                throw new Error(
                    'Email is required to initiate the authentication process',
                );
            }

            if (typeof email !== 'string') {
                throw new Error('Email must be a string.');
            }

            return this.sendToken(email) as unknown as User;
        }

        if (!token && !isSendingLoginForm) {
            return null;
        }

        const email = this.validateToken(request);

        return this.verify({email});
    }
}

type JwtPayload = {
    email: string,
    iat: number,
    exp: number,
};

export interface VerifyOptions {
    email: string,
}

export interface ConstructorOptions {
    secret: string,
    emailField?: string,
    magicEndpoint: URLConstructor,
    sendEmail: SendEmailFunction,
    validateEmail?: ValidateEmailFunction,
    tokenKey?: string,
    linkMaxAge?: number,
}

export type SendEmailOptions = {
    email: string,
    magicLink: string,
};

export type SendEmailFunction = (options: SendEmailOptions) => void | Promise<void>;

export type ValidateEmailFunction = (email: string) => boolean | Promise<boolean>;
