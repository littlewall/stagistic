import {
    Anchor,
    Box,
    Button,
    Center,
    Container,
    Group,
    Paper,
    Text,
    TextInput,
    Title,
} from '@mantine/core';
import classes from './login.module.css';
import {ArrowLeft} from 'lucide-react';
import {
    redirect,
    useFetcher,
    useLoaderData,
} from '@remix-run/react';
import {ActionFunctionArgs, LoaderFunctionArgs} from '@remix-run/node';
import {authenticator} from '~lib/auth/authenticator.server';
import {Cookie} from '@mjackson/headers';
import {data} from '@remix-run/node';
import {COOKIE_MAGIC_LINK_SENT} from '~lib/auth/strategy.server';

export const loader = async ({request}: LoaderFunctionArgs) => {
    try {
        const user = await authenticator.authenticate('magic-link', request);

        if (user) {
            throw redirect('/app/dashboard');
        }

        const hasCookie = new Cookie(request.headers.get('cookie') ?? '').has(COOKIE_MAGIC_LINK_SENT);

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

export const action = async ({request}: ActionFunctionArgs) => {
    const headers = (await authenticator
        .authenticate('magic-link', request)
        .catch(unknown => {
            if (unknown instanceof Headers) {
                return unknown;
            }

            throw unknown;
        })) as Headers;

    throw redirect('/auth/login', {headers});
};

const AuthLogin = () => {
    const {magicLinkSent} = useLoaderData<typeof loader>();
    const fetcher = useFetcher();
    const isSubmitting = fetcher.state !== 'idle' || fetcher.formData != null;

    return (
        <Container size={460} my={30}>
            <Paper
                withBorder
                shadow="md"
                p={30}
                radius="md"
                mt="xl"
            >
                {!magicLinkSent && (
                    <>
                        <Title className={classes.title} ta="center">
                            Welcome to Stagistic
                        </Title>
                        <Text c="dimmed" fz="sm" ta="center">
                            Enter your email to recieve "magic link" that will log you in
                        </Text>
                        <fetcher.Form method="post" className="space-y-2 w-full">
                            <TextInput
                                name="email"
                                label="Your email"
                                placeholder="me@example.com"
                                required
                            />
                            <Group
                                justify="space-between"
                                mt="lg"
                                className={classes.controls}
                            >
                                <Anchor
                                    c="dimmed"
                                    size="sm"
                                    className={classes.control}
                                >
                                    <Center inline>
                                        <ArrowLeft size={12} strokeWidth={1.5} />
                                        <Box ml={5}>Back to homepage</Box>
                                    </Center>
                                </Anchor>
                                <Button
                                    type="submit"
                                    disabled={isSubmitting}
                                    loading={isSubmitting}
                                    className={classes.control}
                                >
                                    {isSubmitting ? 'Sending...' : 'Send magic link'}
                                </Button>
                            </Group>
                        </fetcher.Form>
                    </>
                )}
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

export default AuthLogin;
