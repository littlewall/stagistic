import {redirect} from '@remix-run/react';

import {removeUserSession} from '~lib/auth/auth-session.server';

export const loader = () => {
    return redirect('/auth/login');
};

export const action = async ({request}: {request: Request}) => {
    const response = redirect('/');

    return await removeUserSession(request, response);
};
