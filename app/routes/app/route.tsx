import {
    AppShell,
    Burger,
    ScrollArea,
    Button,
    Group,
} from '@mantine/core';
import {useDisclosure} from '@mantine/hooks';
import {
    data,
    Outlet,
    redirect,
} from '@remix-run/react';
import {
    LayoutDashboard,
    BookOpenText,
    LogOut,
} from 'lucide-react';
import {LoaderFunctionArgs} from '@remix-run/node';
import {getUserSession} from '~lib/auth/session.server';
import {useAuth} from '../../components/AuthContext';
import classes from './app.module.css';
import {LinksGroup} from './LinksGroup';

/**
 * Protect all app routes by checking for authenticated user session
 * This loader will get a new access token on every route navigation
 */
export async function loader({request}: LoaderFunctionArgs) {
    try {
        const userSession = await getUserSession(request);

        if (!userSession) {
            return redirect('/auth/login');
        }

        const {user, accessToken} = userSession;

        return data({
            user,
            accessToken,
        });
    } catch (error) {
        console.error('Error in app route loader:', error);

        return redirect('/auth/login');
    }
}

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

// Logout button with confirmation that uses the auth context
const LogoutButton = () => {
    const {logout} = useAuth();

    const handleLogout = async () => {
        await logout();
    };

    return (
        <Button
            onClick={handleLogout}
            size="xs"
            variant="light"
            color="red"
            leftSection={<LogOut size={14} />}
        >
            Logout
        </Button>
    );
};

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
                <AppShell.Section grow my="md">
                    <nav className={classes.navbar}>
                        <div className={classes.header}>
                        </div>

                        <ScrollArea className={classes.links}>
                            <div className={classes.linksInner}>{links}</div>
                        </ScrollArea>

                        <div className={classes.footer}>
                            footer
                        </div>
                    </nav>
                </AppShell.Section>
                <AppShell.Section p="md">
                    <Group justify="space-between" align="center">
                        <LogoutButton />
                    </Group>
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
