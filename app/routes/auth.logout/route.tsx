import {ActionFunctionArgs, redirect} from '@remix-run/node';
import {removeUserSession} from '~lib/auth/session.server';

export function action({request}: ActionFunctionArgs) {
    if (request.method !== 'POST') {
        return redirect('/');
    }

    const response = redirect('/auth/login');

    return removeUserSession(response);
}

export function loader() {
    return redirect('/auth/login');
}
