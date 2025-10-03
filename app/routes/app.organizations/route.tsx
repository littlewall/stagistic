import {LoaderFunctionArgs, redirect} from '@remix-run/node';

import {auth} from '~lib/auth/auth.server';

export const loader = async ({request}: LoaderFunctionArgs) => {
    const session = await auth.api.getSession({
        headers: request.headers,
    });

    if (!session?.user) {
        return redirect('/auth/login');
    }

    if (request.url.endsWith('/app/organizations') || request.url.endsWith('/app/organizations/')) {
        return redirect('/app/organizations/overview');
    }

    return {};
};
