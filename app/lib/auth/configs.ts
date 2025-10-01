export enum MagicLinkErrorCode {
    EMAIL_REQUIRED = 'EMAIL_REQUIRED',
    EMAIL_NOT_STRING = 'EMAIL_NOT_STRING',
    EMAIL_INVALID = 'EMAIL_INVALID',
    USER_NOT_FOUND = 'USER_NOT_FOUND',
    TOKEN_EXPIRED = 'TOKEN_EXPIRED',
    TOKEN_INVALID = 'TOKEN_INVALID',
    UNKNOWN = 'UNKNOWN',
}

export enum GenericErrorCode {
    GENERIC_REQUEST = 'GENERIC_REQUEST',
    GENERIC_UNKNOWN = 'GENERIC_UNKNOWN',
    GENERIC_UI = 'GENERIC_UI',
}

export enum JwtErrorCode {
    TOKEN_EXPIRED = 'TOKEN_EXPIRED',
    INVALID_TOKEN = 'INVALID_TOKEN',
}

export const COOKIE_MAGIC_LINK_SENT = 'magic-link-sent';

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
        message: 'No account found for this email. If you are new, check your email to activate your account.',
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

export const GENERIC_ERRORS: Record<GenericErrorCode, {key: GenericErrorCode, message: string}> = {
    [GenericErrorCode.GENERIC_REQUEST]: {
        key: GenericErrorCode.GENERIC_REQUEST,
        message: 'Unable to process your request. Please try again.',
    },
    [GenericErrorCode.GENERIC_UNKNOWN]: {
        key: GenericErrorCode.GENERIC_UNKNOWN,
        message: 'An unknown error occurred. Please try again.',
    },
    [GenericErrorCode.GENERIC_UI]: {
        key: GenericErrorCode.GENERIC_UI,
        message: 'Something went wrong. Please try again.',
    },
};

export const JWT_ERRORS: Record<JwtErrorCode, {key: JwtErrorCode, message: string}> = {
    [JwtErrorCode.TOKEN_EXPIRED]: {
        key: JwtErrorCode.TOKEN_EXPIRED,
        message: 'Token expired. Please request a new one.',
    },
    [JwtErrorCode.INVALID_TOKEN]: {
        key: JwtErrorCode.INVALID_TOKEN,
        message: 'Invalid token.',
    },
};
