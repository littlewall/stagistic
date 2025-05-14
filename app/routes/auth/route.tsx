import {
    Outlet,
    redirect,
} from '@remix-run/react';
import {LoaderFunctionArgs} from '@remix-run/node';
import {getUserSession} from '~lib/auth/session.server';

export async function loader({request}: LoaderFunctionArgs) {
    try {
        const userSession = await getUserSession(request);

        if (userSession) {
            return redirect('/app/dashboard');
        }

        return {};
    } catch (error) {
        console.error('Error in app route loader:', error);

        return redirect('/auth/login');
    }
}

const AuthRoute = () => {
    return (
        <Outlet />
    );
};

export default AuthRoute;
