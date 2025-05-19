import {createCookieSessionStorage} from '@remix-run/node';
import config from '~config/globals';

const SESSION_SECRET = config.get('auth.session.sessionSecret');

export const sessionStorage = createCookieSessionStorage({
    cookie: {
        name: '__session',
        sameSite: 'lax',
        path: '/',
        httpOnly: true,
        secrets: [SESSION_SECRET],
        secure: process.env.NODE_ENV === 'production',
    },
});

export const {
    getSession,
    commitSession,
    destroySession,
} = sessionStorage;
