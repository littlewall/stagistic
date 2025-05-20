import {
    Avatar,
    Group,
    Text,
    UnstyledButton,
} from '@mantine/core';
import {ChevronRight} from 'lucide-react';
import {forwardRef} from 'react';

import classes from './UserButton.module.css';

interface UserButtonProps extends React.ComponentPropsWithoutRef<'button'> {
    image: string,
    name: string,
    email: string,
    icon?: React.ReactNode,
}

const UserButton = forwardRef<HTMLButtonElement, UserButtonProps>(
    ({
        image,
        name,
        email,
        icon,
        ...others
    }: UserButtonProps, ref) => (
        <UnstyledButton
            ref={ref}
            style={{
                width: '100%',
            }}
            {...others}
        >
            <Group className={classes.user}>
                <Avatar src={image} radius="xl" />
                <div style={{flex: 1}}>
                    <Text size="sm" fw={500}>
                        {name}
                    </Text>

                    <Text c="dimmed" size="xs">
                        {email}
                    </Text>
                </div>
                {icon || <ChevronRight size={16} />}
            </Group>
        </UnstyledButton>
    ),
);

export default UserButton;
