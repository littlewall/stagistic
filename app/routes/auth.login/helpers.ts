import {MagicLinkErrorCode, MAGIC_LINK_ERRORS} from '~lib/auth/configs';
import {
    object,
    pipe,
    string,
    email,
    minLength,
} from 'valibot';

export function getMagicLinkErrorMessage(errorCode: string | null | undefined): string | undefined {
    if (!errorCode) return undefined;

    if (Object.values(MagicLinkErrorCode).includes(errorCode as MagicLinkErrorCode)) {
        return MAGIC_LINK_ERRORS[errorCode as MagicLinkErrorCode]?.message;
    }

    return undefined;
}

export const loginFormSchema = object({
    email: pipe(
        string('Email is required'),
        minLength(3, 'Email is required'),
        email('Email is not valid'),
    ),
});
