import {
    Anchor,
    Box,
    Text,
    Title,
} from '@mantine/core';
import {LoaderFunctionArgs} from '@remix-run/node';
import {
    NavLink,
    useLoaderData,
    useSearchParams,
} from '@remix-run/react';
import {ArrowLeft} from 'lucide-react';

import {MagicLinkLogin} from '~lib/auth';

import classes from './login.module.css';

export const loader = ({request}: LoaderFunctionArgs) => {
    const url = new URL(request.url);
    const sent = url.searchParams.get('sent');

    return {magicLinkSent: sent === 'true'};
};

const AuthLogin = () => {
    const {magicLinkSent} = useLoaderData<typeof loader>();
    const [searchParams] = useSearchParams();
    const error = searchParams.get('error');

    return (
        <>
            {!magicLinkSent && (
                <>
                    <Title
                        className={classes.title}
                        ta="center"
                    >
                        Welcome to Stagistic
                    </Title>
                    <Text
                        c="dimmed"
                        fz="sm"
                        ta="center"
                    >
                        Enter your email to receive a "magic link" that will log you in
                    </Text>
                    {error && (
                        <Text
                            c="red"
                            ta="center"
                            mb="md"
                            mt="lg"
                        >
                            {error === 'auth_failed' ? 'Authentication failed. Please try again.' : 'An error occurred. Please try again.'}
                        </Text>
                    )}
                    <Box className={classes.form}>
                        <MagicLinkLogin
                            callbackURL="/app/dashboard"
                            newUserCallbackURL="/app/organizations/overview"
                            errorCallbackURL="/auth/login?error=auth_failed"
                        />
                    </Box>
                    <Anchor
                        component={NavLink}
                        to="/"
                        size="sm"
                        style={{
                            display: 'flex',
                            justifyContent: 'center',
                            alignItems: 'center',
                            width: '100%',
                            marginTop: '1rem',
                        }}
                    >
                        <ArrowLeft size={12} strokeWidth={1.5} />
                        <Box ml={5}>Back to homepage</Box>
                    </Anchor>
                </>
            )}
            {magicLinkSent && (
                <>
                    <Title className={classes.title} ta="center">
                        Check your email
                    </Title>
                    <Text c="dimmed" fz="sm" ta="center">
                        We sent a magic link to your email. <br /><br />
                        <b>If you already have an account</b>, click the link to log in.<br />
                        <b>If you are new</b>, click the link to confirm and activate your account.
                    </Text>
                </>
            )}
        </>
    );
};

export default AuthLogin;
