import {LoaderFunctionArgs} from '@remix-run/node';
import {Cookie} from '@mjackson/headers';
import {data, redirect} from '@remix-run/node';
import {COOKIE_MAGIC_LINK_SENT} from '~lib/auth/authentication.server';
import {MagicLinkErrorCode} from '~lib/auth/configs';
import {deleteMagicLinkCookie} from '~lib/auth/utils';

export type LoaderData = {
    magicLinkSent: boolean,
    error?: {message: string},
};

const loader = ({request}: LoaderFunctionArgs) => {
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
                url.searchParams.delete('error');

                const magicCookie = deleteMagicLinkCookie(COOKIE_MAGIC_LINK_SENT);

                return redirect(url.pathname + url.search, {
                    headers: new Headers({'Set-Cookie': magicCookie.toString()}),
                });
            }

            return data({
                magicLinkSent: false,
            }, {headers: error});
        }

        throw error;
    }
};

export default loader;
