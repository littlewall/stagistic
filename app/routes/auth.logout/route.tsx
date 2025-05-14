import {redirect} from '@remix-run/react';
import {removeUserSession} from '~lib/auth/session.server';

export const loader = () => {
    return redirect('/auth/login');
};

export const action = () => {
    const response = redirect('/');

    return removeUserSession(response);
};
