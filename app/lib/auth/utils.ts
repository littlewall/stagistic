import {getUserSession} from './session.server';

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
