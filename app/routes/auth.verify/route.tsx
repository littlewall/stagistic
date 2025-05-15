import {
    Text,
    Title,
} from '@mantine/core';
import classes from './verify.module.css';
import {
    useLoaderData,
} from '@remix-run/react';
import {useMemo} from 'react';
import loader, {LoaderData} from './loader';

export {
    loader,
};

const AuthVerify = () => {
    const {magicLinkSent, error: loaderError} = useLoaderData<LoaderData>();
    const errorMessage = useMemo(() => {
        return loaderError?.message || undefined;
    }, [loaderError]);

    return (
        <>
            {errorMessage && (
                <Text c="red" ta="center" mb="sm">
                    {errorMessage}
                </Text>
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

export default AuthVerify;
