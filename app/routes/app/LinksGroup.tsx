import {useState} from 'react';
import {
    Box,
    Collapse,
    Group,
    ThemeIcon,
    UnstyledButton,
} from '@mantine/core';
import {NavLink} from '@remix-run/react';
import classes from './LinksGroup.module.css';
import {ChevronRight, LucideIcon} from 'lucide-react';

interface LinksGroupProps {
    icon: LucideIcon,
    label: string,
    initiallyOpened?: boolean,
    links?: {
        label: string, link: string, key: string,
    }[],
    link?: string,
}

export function LinksGroup({
    icon: Icon,
    label,
    initiallyOpened,
    links,
    link,
}: LinksGroupProps) {
    const hasLinks = Array.isArray(links);
    const [opened, setOpened] = useState(initiallyOpened || false);
    const items = (hasLinks ? links : []).map(link => (
        <NavLink
            to={link.link}
            key={link.key || link.label}
            className={({isActive}) => `${classes.link} ${isActive ? classes.activeLink : ''}`
            }
        >
            {link.label}
        </NavLink>
    ));

    return (
        <>
            <UnstyledButton
                onClick={() => setOpened(o => !o)}
                className={classes.control}
                component={link ? NavLink : undefined}
                to={link || ''}
            >
                <Group justify="space-between" gap={0}>
                    <Box style={{display: 'flex', alignItems: 'center'}}>
                        <ThemeIcon variant="light" size={30}>
                            <Icon size={18} />
                        </ThemeIcon>
                        <Box ml="md">{label}</Box>
                    </Box>
                    {hasLinks && (
                        <ChevronRight
                            className={classes.chevron}
                            size={16}
                            style={{transform: opened ? 'rotate(-90deg)' : 'none'}}
                        />
                    )}
                </Group>
            </UnstyledButton>
            {hasLinks ? (
                <Collapse in={opened}>{items}</Collapse>
            ) : null}
        </>
    );
}
