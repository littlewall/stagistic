import {ActionFunctionArgs} from '@remix-run/node';
import {refreshUserSession} from '~lib/auth/session.server';

/**
 * API endpoint for refreshing JWT tokens
 * Uses the refresh token from cookies to generate a new access token
 * Returns the access token in the response body instead of in a cookie
 * This endpoint serves as a backup for client-side refreshing when needed
 */
export async function action({request}: ActionFunctionArgs) {
    if (request.method !== 'POST') {
        return Response.json(
            {message: 'Method not allowed'},
            {status: 405},
        );
    }

    try {
        // Try to refresh the user session
        const result = await refreshUserSession(request);

        if (!result) {
            return Response.json(
                {message: 'Invalid or expired refresh token'},
                {status: 401},
            );
        }

        // Return a successful response with the new access token
        return Response.json(
            {
                message: 'Token refreshed successfully',
                accessToken: result.accessToken,
            },
            {status: 200},
        );
    } catch (error) {
        console.error('Token refresh error:', error);

        // Check if it's a token expiration error
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
}
