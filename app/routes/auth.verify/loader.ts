import {Cookie} from '@mjackson/headers';
import {LoaderFunctionArgs} from '@remix-run/node';
import {data, redirect} from '@remix-run/react';
import {
    MagicLinkError,
    verifyMagicLinkFlow,
} from '~lib/auth/authentication.server';
import {deleteMagicLinkCookie, getMagicLinkSession} from '~lib/auth/auth-session.server';
import {
    COOKIE_MAGIC_LINK_SENT,
    MAGIC_LINK_ERRORS,
    MagicLinkErrorCode,
    GENERIC_ERRORS,
} from '~lib/auth/configs';
import {createUserSession, getUserSession} from '~lib/auth/auth-session.server';

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
            const magicLinkSession = await getMagicLinkSession(request.headers.get('Cookie'));
            const magicCookie = await deleteMagicLinkCookie(magicLinkSession);

            const headers = new Headers({'Set-Cookie': magicCookie.toString()});
            const baseResponse = redirect('/app/dashboard', {headers});

            const {response} = await createUserSession(user, baseResponse);

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
        const magicLinkSession = await getMagicLinkSession(request.headers.get('Cookie'));
        const magicCookie = await deleteMagicLinkCookie(magicLinkSession);

        let errorCode: MagicLinkErrorCode = MagicLinkErrorCode.UNKNOWN;

        if (error instanceof MagicLinkError) {
            const code = error.code;

            if (code in MAGIC_LINK_ERRORS) {
                errorCode = code;
            }
        }

        try {
            const params = new URLSearchParams({error: errorCode});

            return redirect(`/auth/login?${params.toString()}`, {
                headers: new Headers({'Set-Cookie': magicCookie.toString()}),
            });
        } catch (e) {
            return data({
                magicLinkSent: false,
                error: {message: GENERIC_ERRORS.GENERIC_UI.message},
            }, {headers: new Headers({'Set-Cookie': magicCookie.toString()})});
        }
    }
};

export default loader;
