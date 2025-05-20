import {
    getFormProps,
    getInputProps,
    useForm,
} from '@conform-to/react';
import {parseWithValibot} from '@conform-to/valibot';
import {
    Anchor,
    Box,
    Button,
    Group,
    Text,
    TextInput,
    Title,
} from '@mantine/core';
import {
    NavLink,
    useFetcher,
    useLoaderData,
} from '@remix-run/react';
import {ArrowLeft} from 'lucide-react';
import {useMemo} from 'react';

import {GENERIC_ERRORS} from '~lib/auth/configs';
import {AuthenticityTokenInput} from '~lib/csrf/react';

import action from './action';
import {loginFormSchema} from './helpers';
import loader from './loader';
import classes from './login.module.css';
import {useUrlErrorMessage} from './useUrlErrorMessage';

export {
    action,
    loader,
};

const AuthLogin = () => {
    const {magicLinkSent} = useLoaderData<typeof loader>();
    const fetcher = useFetcher<typeof action>();
    const isSubmitting = fetcher.state === 'submitting';

    const urlErrorMessage = useUrlErrorMessage('error');

    const [form, {email}] = useForm({
        id: 'login-form',
        lastResult: fetcher.data,
        onValidate({formData}) {
            return parseWithValibot(formData, {
                schema: loginFormSchema,
            });
        },
        shouldValidate: 'onBlur',
        shouldRevalidate: 'onInput',
    });

    const errors = useMemo(
        () => {
            const errorMessages = [];

            if (urlErrorMessage) {
                errorMessages.push(urlErrorMessage);
            }

            if (form.errors) {
                errorMessages.push(...form.errors);
            }

            // Fallback for unknown errors
            if (errorMessages.length === 0 && fetcher.data) {
                errorMessages.push(GENERIC_ERRORS.GENERIC_UI.message);
            }

            return errorMessages;
        }
        , [
            urlErrorMessage,
            form.errors,
            fetcher.data,
        ],
    );

    return (
        <>
            {!magicLinkSent && (
                <>
                    <Title
                        className={classes.title}
                        ta="center"
                    >
                        Welcome to Remix App
                    </Title>
                    <Text
                        c="dimmed"
                        fz="sm"
                        ta="center"
                    >
                        Enter your email to recieve "magic link" that will log you in
                    </Text>
                    {errors.map((error, index) => (
                        <Text
                            key={index}
                            c="red"
                            ta="center"
                            mb="md"
                            mt="lg"
                        >
                            {error}
                        </Text>
                    ))}
                    <fetcher.Form
                        method="post"
                        className={classes.form}
                        {...getFormProps(form)}
                    >
                        <AuthenticityTokenInput />
                        <TextInput
                            {...getInputProps(email, {
                                type: 'email',
                                required: true,
                                defaultValue: '',
                                autoComplete: 'email',
                                autoFocus: true,
                            })}
                            label="Your email"
                            placeholder="me@example.com"
                            error={email.errors}
                            size="md"
                            radius="md"
                        />
                        <Group
                            justify="space-between"
                            align='center'
                            mt="xl"
                            className={classes.controls}
                        >
                            <Button
                                type="submit"
                                fullWidth
                                size="md"
                                radius="md"
                                loading={isSubmitting}
                                disabled={isSubmitting}
                            >
                                Send magic link
                            </Button>
                            <Anchor
                                component={NavLink}
                                to="/"
                                size="sm"
                                style={{
                                    display: 'flex',
                                    justifyContent: 'center',
                                    alignItems: 'center',
                                    width: '100%',
                                }}
                            >
                                <ArrowLeft size={12} strokeWidth={1.5} />
                                <Box ml={5}>Back to homepage</Box>
                            </Anchor>
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
        </>
    );
};

export default AuthLogin;
