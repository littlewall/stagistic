import {Cookie} from '@mjackson/headers';
import {LoaderFunctionArgs} from '@remix-run/node';
import {data, redirect} from '@remix-run/react';
import {
    COOKIE_MAGIC_LINK_SENT,
    MagicLinkError,
    verifyMagicLinkFlow,
} from '~lib/auth/authentication.server';
import {deleteMagicLinkCookie} from '~lib/auth/cookie-helpers';
import {MAGIC_LINK_ERRORS, MagicLinkErrorCode} from '~lib/auth/configs';
import {createUserSession, getUserSession} from '~lib/auth/session.server';

export type LoaderData = {
    magicLinkSent: boolean,
    error?: {message: string},
};

const loader = async ({request}: LoaderFunctionArgs) => {
    try {
        const authUser = await getUserSession(request);

        if (authUser) {
            return redirect('/app/dashboard');
        }

        const user = await verifyMagicLinkFlow(request);

        if (user) {
            const magicCookie = deleteMagicLinkCookie(COOKIE_MAGIC_LINK_SENT);

            const headers = new Headers({'Set-Cookie': magicCookie.toString()});
            const baseResponse = redirect('/app/dashboard', {headers});

            const {response} = createUserSession(user, baseResponse);

            return response;
        }

        const hasCookie = new Cookie(request.headers.get('cookie') ?? '').has(COOKIE_MAGIC_LINK_SENT);

        if (!hasCookie) {
            return redirect('/auth/login');
        }

        return data({
            magicLinkSent: hasCookie,
        });
    } catch (error) {
        const magicCookie = deleteMagicLinkCookie(COOKIE_MAGIC_LINK_SENT);

        let errorCode: MagicLinkErrorCode = MagicLinkErrorCode.UNKNOWN;

        if (error instanceof MagicLinkError) {
            const code = error.code;

            if (code in MAGIC_LINK_ERRORS) {
                errorCode = code;
            }
        }

        const params = new URLSearchParams({error: errorCode});

        return redirect(`/auth/login?${params.toString()}`, {
            headers: new Headers({'Set-Cookie': magicCookie.toString()}),
        });
    }
};

export default loader;
