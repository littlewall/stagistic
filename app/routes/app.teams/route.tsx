import {LoaderFunctionArgs, redirect} from '@remix-run/node';

import {authenticate} from '~lib/auth/auth-session.server';

export const loader = async ({request}: LoaderFunctionArgs) => {
    const {response} = await authenticate(request);

    if (response) {
        return response;
    }

    if (request.url.endsWith('/app/teams') || request.url.endsWith('/app/teams/')) {
        return redirect('/app/teams/overview');
    }

    return {};
};
