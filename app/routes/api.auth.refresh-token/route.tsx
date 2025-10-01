import {ActionFunctionArgs} from '@remix-run/node';

import {refreshUserSession} from '~lib/auth/auth-session.server';

export const action = async ({request}: ActionFunctionArgs) => {
    if (request.method !== 'POST') {
        return Response.json(
            {message: 'Method not allowed'},
            {status: 405},
        );
    }

    try {
        const result = await refreshUserSession(request);

        if (!result) {
            return Response.json(
                {message: 'Invalid or expired refresh token'},
                {status: 401},
            );
        }

        return Response.json(
            {
                message: 'Token refreshed successfully',
                accessToken: result.accessToken,
            },
            {status: 200},
        );
    } catch (error) {
        console.error('Token refresh error:', error);

        const errorMessage = error instanceof Error ? error.message : 'Failed to refresh token';
        const isExpired = errorMessage.includes('expired');

        return Response.json(
            {
                message: errorMessage,
                expired: isExpired,
            },
            {status: isExpired ? 401 : 500},
        );
    }
};
