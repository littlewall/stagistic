import {
    ActionFunctionArgs,
    redirect,
} from '@remix-run/node';

import {auth} from '~lib/auth/auth.server';

export const loader = () => {
    return redirect('/auth/login');
};

export const action = async ({request}: ActionFunctionArgs) => {
    await auth.api.signOut({
        headers: request.headers,
    });

    return redirect('/auth/login');
};
