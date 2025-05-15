import {getUserSession} from './session.server';
import {SetCookie} from '@mjackson/headers';

export const isFormDataRequest = (request: Request): boolean => {
    const contentType = request.headers.get('Content-Type') ?? '';

    return (
        contentType.includes('application/x-www-form-urlencoded') || contentType.includes('multipart/form-data')
    );
};

export const authenticate = async (request: Request, returnTo?: string) => {
    const userSession = await getUserSession(request);
    const redirectUrl = returnTo || '/auth/login';
    let response = undefined;

    if (!userSession) {
        response = new Response(null, {
            status: 302,
            headers: {
                Location: redirectUrl,
            },
        });
    }

    return {
        user: userSession,
        response,
    };
};

export const createMagicLinkCookie = (name: string, value: string, options: Partial<{
    maxAge: number, expires: Date, path: string, sameSite: 'Lax' | 'Strict' | 'None',
}> = {}) => {
    return new SetCookie({
        name,
        value,
        httpOnly: true,
        path: '/',
        sameSite: 'Lax',
        ...options,
    });
};

export const deleteMagicLinkCookie = (name: string) => {
    return new SetCookie({
        name,
        value: '',
        httpOnly: true,
        path: '/',
        sameSite: 'Lax',
        maxAge: 0,
        expires: new Date(0),
    });
};
