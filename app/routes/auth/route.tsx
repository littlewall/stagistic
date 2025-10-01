import {Paper} from '@mantine/core';
import {LoaderFunctionArgs} from '@remix-run/node';
import {
    Outlet,
    redirect,
} from '@remix-run/react';

import authBgImageSrc from '~assets/ui/auth/auth-cover.png';
import {getUserSession} from '~lib/auth/auth-session.server';

import classes from './auth.module.css';

export const loader = async ({request}: LoaderFunctionArgs) => {
    try {
        const userSession = await getUserSession(request);

        if (userSession) {
            return redirect('/app/dashboard');
        }

        const url = new URL(request.url);

        if (url.pathname === '/auth') {
            return redirect('/auth/login');
        }

        return {};
    } catch (error) {
        console.error('Error in app route loader:', error);

        return redirect('/auth/login');
    }
};

const AuthRoute = () => {
    return (
        <div
            className={classes.wrapper}
            style={{
                backgroundImage: `url(${authBgImageSrc})`,
            }}
        >
            <Paper className={classes.form}>
                <Outlet />
            </Paper>
        </div>
    );
};

export default AuthRoute;
