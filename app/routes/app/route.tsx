import {
    AppShell,
    Burger,
    ScrollArea,
    Button,
} from '@mantine/core';
import {useDisclosure} from '@mantine/hooks';
import {
    data,
    Outlet,
    redirect,
    Form,
} from '@remix-run/react';
import {
    LayoutDashboard,
    BookOpenText,
    SwitchCamera,
    LogOutIcon,
} from 'lucide-react';
import {LoaderFunctionArgs} from '@remix-run/node';
import classes from './app.module.css';
import LinksGroup from './LinksGroup';
import {authenticate} from '~lib/auth/auth-session.server';

export const loader = async ({request}: LoaderFunctionArgs) => {
    try {
        const {user, response} = await authenticate(request);

        if (response) {
            return response;
        }

        return data({
            user,
        });
    } catch (error) {
        console.error('Error in app route loader:', error);

        return redirect('/auth/login');
    }
};

const mainLinksData = [
    {
        label: 'Dashboard',
        key: 'dashboard',
        icon: LayoutDashboard,
        link: '/app/dashboard',
    }, {
        label: 'Programs',
        key: 'programs',
        icon: BookOpenText,
        link: '/app/programs',
    },
];

const AppRoute = () => {
    const [opened, {toggle}] = useDisclosure();

    const links = mainLinksData.map(item => <LinksGroup {...item} key={item.key || item.label} />);

    return (
        <AppShell
            navbar={{
                width: 300,
                breakpoint: 'sm',
                collapsed: {mobile: !opened},
            }}
            padding="md"
        >
            <AppShell.Navbar>
                <AppShell.Section style={{minHeight: '100vh'}} my="md">
                    <nav className={classes.navbar}>
                        <div className={classes.title}>
                            Stagistic
                        </div>

                        <div className={classes.menu}>{links}</div>

                        <div className={classes.footer}>
                            <a href="#" className={classes.link} onClick={event => event.preventDefault()}>
                                <SwitchCamera className={classes.linkIcon} strokeWidth={1.5} />
                                <span>Change production</span>
                            </a>

                            <Form method="post" action="/auth/logout">
                                <Button
                                    type="submit"
                                    size="xs"
                                    variant="light"
                                    color="red"
                                    leftSection={<LogOutIcon size={14} />}
                                >
                                    Logout
                                </Button>
                            </Form>
                        </div>
                    </nav>
                </AppShell.Section>
            </AppShell.Navbar>
            <AppShell.Main>
                <Burger opened={opened} onClick={toggle} hiddenFrom="sm" size="sm" />
                <Outlet />
            </AppShell.Main>
        </AppShell>
    );
};

export default AppRoute;
