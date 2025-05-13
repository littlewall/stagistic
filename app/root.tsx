import {
    Links,
    Meta,
    Outlet,
    Scripts,
} from '@remix-run/react';
import type {LinksFunction} from '@remix-run/node';
import {
    ColorSchemeScript,
    MantineColorsTuple,
    MantineProvider,
    createTheme,
    mantineHtmlProps,
} from '@mantine/core';
import appStylesHref from './app.css?url';
import mantineStylesHref from '@mantine/core/styles.css?url';

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

const App = () => {
    return (
        <html lang="en" {...mantineHtmlProps}>
            <head>
                <link
                    rel="icon"
                    href="data:image/x-icon;base64,AA"
                />
                <ColorSchemeScript />
                <Meta />
                <Links />
            </head>
            <body>
                <MantineProvider theme={theme} >
                    <Outlet />
                </MantineProvider>
                <Scripts />
            </body>
        </html>
    );
};

export default App;
