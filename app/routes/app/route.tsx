import {
    AppShell,
    Burger,
    Menu,
    UnstyledButton,
} from '@mantine/core';
import {useDisclosure} from '@mantine/hooks';
import {LoaderFunctionArgs} from '@remix-run/node';
import {
    data,
    Form,
    NavLink,
    Outlet,
    redirect,
} from '@remix-run/react';
import {
    ArrowLeftRight,
    BookOpenText,
    LayoutDashboard,
    LogOut,
} from 'lucide-react';

import UserButton from '~components/nav/UserButton/UserButton';
import {authenticate} from '~lib/auth/auth-session.server';

import LinksGroup from '../../components/nav/LinksGroup/LinksGroup';
import classes from './app.module.css';

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
                                    image='https://i.pravatar.cc/300'
                                    name='John Doe'
                                    email="john.doe@example.com"
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
                                    to="/app/productions"
                                >
                                    Productions
                                </Menu.Item>

                                <Menu.Divider />

                                <Menu.Item
                                    leftSection={<ArrowLeftRight size={14} />}
                                >
                                    Switch production
                                </Menu.Item>
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
                        Stagistic &copy; {new Date().getFullYear()}
                    </div>
                </div>
            </AppShell.Footer>
        </AppShell>
    );
};

export default AppRoute;
