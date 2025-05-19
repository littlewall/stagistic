import {LoaderFunctionArgs} from '@remix-run/node';
import {Cookie} from '@mjackson/headers';
import {data, redirect} from '@remix-run/node';
import {
    COOKIE_MAGIC_LINK_SENT,
    MagicLinkErrorCode,
    GENERIC_ERRORS,
} from '~lib/auth/configs';
import {deleteMagicLinkCookie, getMagicLinkSession} from '~lib/auth/auth-session.server';

export type LoaderData = {
    magicLinkSent: boolean,
    error?: {message: string},
};

const loader = async ({request}: LoaderFunctionArgs) => {
    try {
        const hasCookie = new Cookie(request.headers.get('cookie') ?? '').has(COOKIE_MAGIC_LINK_SENT);

        return data({
            magicLinkSent: hasCookie,
        });
    } catch (error) {
        if (error instanceof Headers) {
            const url = new URL(request.url);
            const errorCode = url.searchParams.get('error');

            if (errorCode && Object.values(MagicLinkErrorCode).includes(errorCode as MagicLinkErrorCode)) {
                const magicLinkSession = await getMagicLinkSession(request.headers.get('Cookie'));

                url.searchParams.delete('error');

                const magicCookie = await deleteMagicLinkCookie(magicLinkSession);

                return redirect(url.pathname + url.search, {
                    headers: new Headers({'Set-Cookie': magicCookie.toString()}),
                });
            }

            return data({
                magicLinkSent: false,
                error: {message: GENERIC_ERRORS.GENERIC_UI.message},
            }, {headers: error});
        }

        throw error;
    }
};

export default loader;
