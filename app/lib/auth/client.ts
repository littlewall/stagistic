/**
 * Client-side utility functions for JWT token management
 */

/**
 * Attempts to refresh the user's access token
 * @returns {Promise<boolean>} True if refresh was successful, false otherwise
 */
export async function refreshToken(): Promise<boolean> {
    try {
        // Call the token refresh API endpoint
        const response = await fetch('/api/token-refresh', {
            method: 'POST',
            credentials: 'same-origin', // Include cookies in the request
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
}

/**
 * Handles an unauthorized response (401) by attempting to refresh the token
 * and retrying the original request
 *
 * @param {Response} response - The 401 response
 * @param {() => Promise<Response>} retryFn - Function to retry the original request
 * @returns {Promise<Response>} The response from the retried request or the original 401
 */
export async function handleUnauthorized(
    response: Response,
    retryFn: () => Promise<Response>,
): Promise<Response> {
    // If not a 401, return the original response
    if (response.status !== 401) {
        return response;
    }

    // Try to refresh the token
    const refreshed = await refreshToken();

    if (!refreshed) {
        // If refresh failed, return the original 401 response
        return response;
    }

    // Retry the original request with the new token
    return retryFn();
}

/**
 * Creates a fetch wrapper that automatically handles token refresh
 * @returns {typeof fetch} A fetch function that handles token refresh
 */
export function createAuthFetch(): typeof fetch {
    return async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
        // Make the initial request
        const response = await fetch(input, {
            ...init,
            credentials: 'same-origin', // Always include cookies
        });

        // If it's not a 401, return the response
        if (response.status !== 401) {
            return response;
        }

        // If it is a 401, try to refresh the token and retry
        return handleUnauthorized(response, () => fetch(input, {
            ...init,
            credentials: 'same-origin',
        }));
    };
}
