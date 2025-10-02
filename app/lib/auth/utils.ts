import {authClient} from './client';

/**
 * Utility functions for magic link authentication
 */

/**
 * Check if user is currently authenticated
 * @returns Promise resolving to session data or null
 */
export async function getSession() {
    try {
        const session = await authClient.getSession();

        return session.data;
    } catch (error) {
        console.error('Failed to get session:', error);

        return null;
    }
}

/**
 * Sign out the current user
 * @returns Promise resolving to success status
 */
export async function signOut() {
    try {
        await authClient.signOut();

        return true;
    } catch (error) {
        console.error('Failed to sign out:', error);

        return false;
    }
}

/**
 * Send a magic link to the specified email
 * @param email - User's email address
 * @param name - User's name (for new users)
 * @param options - Optional callback URLs
 * @returns Promise resolving to success status and error if any
 */
export async function sendMagicLinkEmail(
    email: string,
    name: string,
    options?: {
        callbackURL?: string,
        newUserCallbackURL?: string,
        errorCallbackURL?: string,
    },
) {
    try {
        const {error} = await authClient.signIn.magicLink({
            email,
            name,
            callbackURL: options?.callbackURL ?? '/app/dashboard',
            newUserCallbackURL: options?.newUserCallbackURL ?? '/app/welcome',
            errorCallbackURL: options?.errorCallbackURL ?? '/auth/login',
        });

        if (error) {
            return {success: false, error: error.message};
        }

        return {success: true, error: null};
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
        };
    }
}

/**
 * Verify a magic link token
 * @param token - The verification token
 * @param callbackURL - Optional callback URL after verification
 * @returns Promise resolving to success status and error if any
 */
export async function verifyMagicLinkToken(
    token: string,
    callbackURL?: string,
) {
    try {
        const {error} = await authClient.magicLink.verify({
            query: {
                token,
                callbackURL: callbackURL ?? '/app/dashboard',
            },
        });

        if (error) {
            return {success: false, error: error.message};
        }

        return {success: true, error: null};
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
        };
    }
}

/**
 * Check if the current user is authenticated
 * Useful for protecting routes
 * @returns Promise resolving to boolean
 */
export async function isAuthenticated(): Promise<boolean> {
    const session = await getSession();

    return session !== null && session.session !== null;
}

/**
 * Get the current user data
 * @returns Promise resolving to user data or null
 */
export async function getCurrentUser() {
    const session = await getSession();

    return session?.user ?? null;
}
