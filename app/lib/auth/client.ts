import {REFRESH_TOKEN_COOKIE_NAME} from './jwt';

export const clearRefreshTokenCookie = () => {
    return `${REFRESH_TOKEN_COOKIE_NAME}=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax; Secure`;
};

export const refreshToken = async (): Promise<boolean> => {
    try {
        const response = await fetch('/api/auth/refresh-token', {
            method: 'POST',
            credentials: 'same-origin',
        });

        if (!response.ok) {
            console.error('Failed to refresh token:', response.status);

            return false;
        }

        return true;
    } catch (error) {
        console.error('Error refreshing token:', error);

        return false;
    }
};

export const handleUnauthorized = async (
    response: Response,
    retryFn: () => Promise<Response>,
): Promise<Response> => {
    if (response.status !== 401) {
        return response;
    }

    const refreshed = await refreshToken();

    if (!refreshed) {
        return response;
    }

    return retryFn();
};

export const createAuthFetch = (): typeof fetch => {
    return async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
        const response = await fetch(input, {
            ...init,
            credentials: 'same-origin',
        });

        if (response.status !== 401) {
            return response;
        }

        return handleUnauthorized(response, () => fetch(input, {
            ...init,
            credentials: 'same-origin',
        }));
    };
};
