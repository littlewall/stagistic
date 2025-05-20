import {
    ColorSchemeScript,
    createTheme,
    MantineColorsTuple,
    mantineHtmlProps,
    MantineProvider,
} from '@mantine/core';
import mantineStylesHref from '@mantine/core/styles.css?url';
import type {LinksFunction, LoaderFunctionArgs} from '@remix-run/node';
import {
    Links,
    Meta,
    Outlet,
    Scripts,
    useLoaderData,
} from '@remix-run/react';

import {AuthProvider} from '~components/AuthContext';
import {createAuthenticityToken} from '~lib/csrf/csrf.server';
import {AuthenticityTokenProvider} from '~lib/csrf/react';
import {commitSession, getSession} from '~lib/session.server';

import appStylesHref from './app.css?url';

export const links: LinksFunction = () => [{rel: 'stylesheet', href: appStylesHref}, {rel: 'stylesheet', href: mantineStylesHref}];

const myColor: MantineColorsTuple = [
    '#eff2ff',
    '#dfe2f2',
    '#bdc2de',
    '#99a0ca',
    '#7a84b9',
    '#6672af',
    '#5c69ac',
    '#4c5897',
    '#424e88',
    '#36437a',
];

const theme = createTheme({
    colors: {
        myColor,
    },
});

interface LoaderData {
    csrfToken: string,
}

export const loader = async ({request}: LoaderFunctionArgs) => {
    const session = await getSession(request.headers.get('cookie'));
    const csrfToken = createAuthenticityToken(session);

    return Response.json({
        csrfToken,
    }, {
        headers: {
            'Set-Cookie': await commitSession(session),
        },
    });
};

const App = () => {
    const {csrfToken} = useLoaderData<LoaderData>();

    return (
        <html lang="en" {...mantineHtmlProps} suppressHydrationWarning={true}>
            <head>
                <link
                    rel="icon"
                    href="data:image/x-icon;base64,AA"
                />
                <ColorSchemeScript />
                <Meta />
                <Links />
            </head>
            <body suppressHydrationWarning={true}>
                <AuthenticityTokenProvider token={csrfToken}>
                    <AuthProvider>
                        <MantineProvider theme={theme}>
                            <Outlet />
                        </MantineProvider>
                    </AuthProvider>
                </AuthenticityTokenProvider>
                <Scripts />
            </body>
        </html>
    );
};

export default App;
