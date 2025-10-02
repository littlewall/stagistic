import {
    Text,
    Title,
} from '@mantine/core';
import {
    LoaderFunctionArgs,
    redirect,
} from '@remix-run/node';
import {useSearchParams} from '@remix-run/react';
import {useEffect} from 'react';

import {authClient} from '~lib/auth';

import classes from './verify.module.css';

export const loader = ({request}: LoaderFunctionArgs) => {
    const url = new URL(request.url);
    const token = url.searchParams.get('token');

    /*
     * Better Auth handles verification automatically via the magic link URL
     * This route is mainly for displaying status or handling edge cases
     */
    if (!token) {
        return redirect('/auth/login');
    }

    return {};
};

const AuthVerify = () => {
    const [searchParams] = useSearchParams();
    const error = searchParams.get('error');
    const token = searchParams.get('token');

    useEffect(() => {
        /*
         * If there's a token, Better Auth's client will handle verification
         * automatically when the page loads
         */
        if (token && !error) {
            authClient.magicLink.verify({
                query: {
                    token,
                    callbackURL: '/app/dashboard',
                },
            }).then(({error: verifyError}) => {
                if (verifyError) {
                    window.location.href = '/auth/login?error=verification_failed';
                }
            }).catch(() => {
                window.location.href = '/auth/login?error=verification_failed';
            });
        }
    }, [token, error]);

    if (error) {
        return (
            <>
                <Title className={classes.title} ta="center">
                    Verification Failed
                </Title>
                <Text c="red" ta="center" mb="sm">
                    The magic link is invalid or has expired. Please try again.
                </Text>
            </>
        );
    }

    return (
        <>
            <Title className={classes.title} ta="center">
                Verifying...
            </Title>
            <Text c="dimmed" fz="sm" ta="center">
                Please wait while we verify your magic link.
            </Text>
        </>
    );
};

export default AuthVerify;
