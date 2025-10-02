/**
 * Better Auth Magic Link - Public API
 * Export all authentication utilities for easy import
 */

// Client
export {authClient} from './client';

// Components
export {MagicLinkLogin} from '~components/auth/MagicLinkLogin';
export {MagicLinkVerify} from '~components/auth/MagicLinkVerify';

// Hook
export {useMagicLink} from './useMagicLink';

// Utilities
export {
    getCurrentUser,
    getSession,
    isAuthenticated,
    sendMagicLinkEmail,
    signOut,
    verifyMagicLinkToken,
} from './utils';

// Types
export type {
    MagicLinkLoginProps,
    MagicLinkResult,
    MagicLinkSignInOptions,
    MagicLinkVerifyOptions,
    MagicLinkVerifyProps,
    UseMagicLinkOptions,
    UseMagicLinkReturn,
    UserSession,
} from './types';
