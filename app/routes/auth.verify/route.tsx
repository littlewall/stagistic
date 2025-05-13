import {
    Container,
    Paper,
    Text,
    Title,
} from '@mantine/core';
import classes from './verify.module.css';
import {
    redirect,
    useLoaderData,
} from '@remix-run/react';
import {LoaderFunctionArgs} from '@remix-run/node';
import {authenticator} from '~lib/auth/authenticator.server';
import {Cookie, SetCookie} from '@mjackson/headers';
import {data} from '@remix-run/node';
import {COOKIE_MAGIC_LINK_SENT} from '~lib/auth/strategy.server';

export const loader = async ({request}: LoaderFunctionArgs) => {
    try {
        const user = await authenticator.authenticate('magic-link', request);

        if (user) {
            const cookie = new SetCookie({
                name: COOKIE_MAGIC_LINK_SENT,
                httpOnly: true,
                value: '',
                maxAge: 1,
                path: '/',
                sameSite: 'Lax',
            });

            const headers = new Headers({'Set-Cookie': cookie.toString()});

            return redirect('/app/dashboard', {headers});
        }

        const hasCookie = new Cookie(request.headers.get('cookie') ?? '').has(COOKIE_MAGIC_LINK_SENT);

        if (!hasCookie) {
            return redirect('/auth/login');
        }

        return data({
            magicLinkSent: hasCookie,
        });
    } catch (error) {
        console.log(error);

        if (error instanceof Headers) {
            return data({
                magicLinkSent: false,
            }, {headers: error});
        }

        throw error;
    }
};

const AuthVerify = () => {
    const {magicLinkSent} = useLoaderData<typeof loader>();

    return (
        <Container size={460} my={30}>
            <Paper
                withBorder
                shadow="md"
                p={30}
                radius="md"
                mt="xl"
            >
                {magicLinkSent && (
                    <>
                        <Title className={classes.title} ta="center">
                            Check your email
                        </Title>
                        <Text c="dimmed" fz="sm" ta="center">
                            We sent a magic link to your email. Click the link in email to log in.
                        </Text>
                    </>
                )}
            </Paper>
        </Container>
    );
};

export default AuthVerify;
