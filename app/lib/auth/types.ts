/**
 * TypeScript type definitions for Better Auth Magic Link
 */

/**
 * Magic link sign-in options
 */
export interface MagicLinkSignInOptions {
    /**
     * Email address to send the magic link
     */
    email: string,

    /**
     * User display name (only used for new users)
     */
    name: string,

    /**
     * URL to redirect after magic link verification
     * @default '/app/dashboard'
     */
    callbackURL?: string,

    /**
     * URL to redirect after new user signup
     * @default '/app/welcome'
     */
    newUserCallbackURL?: string,

    /**
     * URL to redirect if an error occurs during verification
     * @default '/auth/login'
     */
    errorCallbackURL?: string,
}

/**
 * Magic link verification options
 */
export interface MagicLinkVerifyOptions {
    /**
     * Verification token from the email
     */
    token: string,

    /**
     * URL to redirect after magic link verification
     * If not provided, will return the session data
     * @default '/app/dashboard'
     */
    callbackURL?: string,
}

/**
 * Result of magic link operations
 */
export interface MagicLinkResult {
    /**
     * Whether the operation was successful
     */
    success: boolean,

    /**
     * Error message if the operation failed
     */
    error: string | null,
}

/**
 * User session data
 */
export interface UserSession {
    user: {
        id: string,
        email: string,
        name: string,
        emailVerified: boolean,
        image?: string,
        createdAt: Date,
        updatedAt: Date,
    } | null,
    session: {
        id: string,
        userId: string,
        expiresAt: Date,
        token: string,
        ipAddress?: string,
        userAgent?: string,
    } | null,
}

/**
 * Configuration options for useMagicLink hook
 */
export interface UseMagicLinkOptions {
    /**
     * URL to redirect after magic link verification
     * @default '/app/dashboard'
     */
    callbackURL?: string,

    /**
     * URL to redirect after new user signup
     * @default '/app/welcome'
     */
    newUserCallbackURL?: string,

    /**
     * URL to redirect if an error occurs
     * @default '/auth/login'
     */
    errorCallbackURL?: string,
}

/**
 * Return type of useMagicLink hook
 */
export interface UseMagicLinkReturn {
    /**
     * Send a magic link to the specified email
     */
    sendMagicLink: (email: string, name: string) => Promise<void>,

    /**
     * Verify a magic link token
     */
    verifyToken: (token: string) => Promise<void>,

    /**
     * Whether a magic link operation is in progress
     */
    isLoading: boolean,

    /**
     * Error message if an operation failed
     */
    error: string | null,

    /**
     * Whether the last operation was successful
     */
    success: boolean,

    /**
     * Reset the hook state
     */
    resetState: () => void,
}

/**
 * Props for MagicLinkLogin component
 */
export interface MagicLinkLoginProps {
    /**
     * URL to redirect after magic link verification
     * @default '/app/dashboard'
     */
    callbackURL?: string,

    /**
     * URL to redirect after new user signup
     * @default '/app/welcome'
     */
    newUserCallbackURL?: string,

    /**
     * URL to redirect if an error occurs
     * @default '/auth/login'
     */
    errorCallbackURL?: string,
}

/**
 * Props for MagicLinkVerify component
 */
export interface MagicLinkVerifyProps {
    /**
     * URL to redirect after magic link verification
     * @default '/app/dashboard'
     */
    callbackURL?: string,
}
