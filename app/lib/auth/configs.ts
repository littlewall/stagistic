export enum MagicLinkErrorCode {
    EMAIL_REQUIRED = 'EMAIL_REQUIRED',
    EMAIL_NOT_STRING = 'EMAIL_NOT_STRING',
    EMAIL_INVALID = 'EMAIL_INVALID',
    USER_NOT_FOUND = 'USER_NOT_FOUND',
    TOKEN_EXPIRED = 'TOKEN_EXPIRED',
    TOKEN_INVALID = 'TOKEN_INVALID',
    UNKNOWN = 'UNKNOWN',
}

export const MAGIC_LINK_ERRORS: Record<MagicLinkErrorCode, {key: MagicLinkErrorCode, message: string}> = {
    [MagicLinkErrorCode.EMAIL_REQUIRED]: {
        key: MagicLinkErrorCode.EMAIL_REQUIRED,
        message: 'Email is required to initiate the authentication process',
    },
    [MagicLinkErrorCode.EMAIL_NOT_STRING]: {
        key: MagicLinkErrorCode.EMAIL_NOT_STRING,
        message: 'Email must be a string.',
    },
    [MagicLinkErrorCode.EMAIL_INVALID]: {
        key: MagicLinkErrorCode.EMAIL_INVALID,
        message: 'Email is invalid',
    },
    [MagicLinkErrorCode.USER_NOT_FOUND]: {
        key: MagicLinkErrorCode.USER_NOT_FOUND,
        message: 'User not found. Please check your email and try again.',
    },
    [MagicLinkErrorCode.TOKEN_EXPIRED]: {
        key: MagicLinkErrorCode.TOKEN_EXPIRED,
        message: 'Your magic link has expired. Please request a new one.',
    },
    [MagicLinkErrorCode.TOKEN_INVALID]: {
        key: MagicLinkErrorCode.TOKEN_INVALID,
        message: 'Invalid magic link.',
    },
    [MagicLinkErrorCode.UNKNOWN]: {
        key: MagicLinkErrorCode.UNKNOWN,
        message: 'An unknown error occurred. Please try again.',
    },
};
