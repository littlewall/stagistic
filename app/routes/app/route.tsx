import {
    AppShell,
    Burger,
    ScrollArea,
    Button,
    Group,
} from '@mantine/core';
import {useDisclosure} from '@mantine/hooks';
import {
    Outlet, Link,
} from '@remix-run/react';
import {
    LayoutDashboard, BookOpenText, LogOut,
} from 'lucide-react';
import classes from './app.module.css';
import {LinksGroup} from './LinksGroup';

const mainLinksData = [
    {
        label: 'Dashboard',
        key: 'dashboard',
        icon: LayoutDashboard,
        link: '/app/dashboard',
    }, {
        label: 'Rehearsals',
        key: 'rehearsals',
        icon: BookOpenText,
        initiallyOpened: true,
        links: [
            {
                label: 'Overview',
                link: '/app/rehearsals',
                key: 'overview',
            },
            {
                label: 'Calendar',
                link: '/app/rehearsals/calendar',
                key: 'calendar',
            },
            {
                label: 'Timeline',
                link: '/app/rehearsals/timeline',
                key: 'timeline',
            },
        ],
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
                        <Button
                            component={Link}
                            to="/auth/logout"
                            size="xs"
                            variant="light"
                            color="red"
                            leftSection={<LogOut size={14} />}
                        >
                            Logout
                        </Button>
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
