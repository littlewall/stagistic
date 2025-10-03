import {
    AppShell,
    Burger,
    Menu,
    UnstyledButton,
} from '@mantine/core';
import {useDisclosure} from '@mantine/hooks';
import {LoaderFunctionArgs} from '@remix-run/node';
import {
    Form,
    NavLink,
    Outlet,
    redirect,
    useLoaderData,
} from '@remix-run/react';
import {
    LayoutDashboard,
    LogOut,
} from 'lucide-react';

import LinksGroup from '~components/nav/LinksGroup/LinksGroup';
import UserButton from '~components/nav/UserButton/UserButton';
import {ToastContainer, ToastProvider} from '~components/ToastProvider';
import {auth} from '~lib/auth/auth.server';

import classes from './app.module.css';

export const loader = async ({request}: LoaderFunctionArgs) => {
    try {
        const session = await auth.api.getSession({
            headers: request.headers,
        });

        if (!session?.user) {
            return redirect('/auth/login');
        }

        return {
            user: session.user,
        };
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
    },
];

const AppRoute = () => {
    const [opened, {toggle}] = useDisclosure();
    const {user} = useLoaderData<typeof loader>();

    const links = mainLinksData.map(item => <LinksGroup {...item} key={item.key || item.label} />);

    return (
        <ToastProvider>
            <ToastContainer />
            <AppShell
                navbar={{
                    width: 300,
                    breakpoint: 'sm',
                    collapsed: {mobile: !opened},
                }}
                padding="md"
                layout='alt'
                footer={{
                    height: 20,
                }}
            >
                <AppShell.Navbar>
                    <nav className={classes.navbar}>
                        <div className={classes.title}>
                            Stagistic
                        </div>

                        <div className={classes.menu}>{links}</div>

                        <div className={classes.footer}>
                            <Menu position="right-end" offset={0}>
                                <Menu.Target>
                                    <UserButton
                                        image={user.image || 'https://i.pravatar.cc/300'}
                                        name={user.name}
                                        email={user.email}
                                    />
                                </Menu.Target>
                                <Menu.Dropdown>
                                    <Menu.Label>Application</Menu.Label>
                                    <Menu.Item
                                        component={NavLink}
                                        to="/app/settings"
                                    >
                                        Settings
                                    </Menu.Item>
                                    <Menu.Item
                                        component={NavLink}
                                        to="/app/organizations"
                                    >
                                        Organizations
                                    </Menu.Item>

                                    <Menu.Divider />
                                    <Menu.Item
                                        color="red"
                                        leftSection={<LogOut size={14} />}
                                    >
                                        <Form method="post" action="/auth/logout">
                                            <UnstyledButton
                                                type="submit"
                                            >
                                                Logout
                                            </UnstyledButton>
                                        </Form>
                                    </Menu.Item>
                                </Menu.Dropdown>
                            </Menu>
                        </div>
                    </nav>
                </AppShell.Navbar>
                <AppShell.Main>
                    <Burger opened={opened} onClick={toggle} hiddenFrom="sm" size="sm" />
                    <Outlet />
                </AppShell.Main>
                <AppShell.Footer >
                    <div className={classes.footer}>
                        <div className={classes.footerText}>
                            Remix App &copy; {new Date().getFullYear()}
                        </div>
                    </div>
                </AppShell.Footer>
            </AppShell>
        </ToastProvider>
    );
};

export default AppRoute;
