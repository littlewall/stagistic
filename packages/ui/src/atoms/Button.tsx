import clsx from 'clsx';
import {useCallback} from 'react';
import {
    Button as RACButton,
    type ButtonProps as RACButtonProps,
    type PressEvent,
} from 'react-aria-components';

import styles from './Button.module.css';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline';

type ButtonSize = 'sm' | 'md';

type ButtonProps = {
    variant?: ButtonVariant,
    size?: ButtonSize,
    className?: string,
    isLoading?: boolean,
    onPress?: (event: PressEvent) => void,
} & Omit<RACButtonProps, 'className' | 'onPress'>;

export const Button = ({
    variant = 'primary',
    size = 'md',
    className,
    isLoading,
    onPress,
    ...props
}: ButtonProps) => {
    const handlePress = useCallback((event: PressEvent) => {
        if (isLoading) {
            return;
        }

        onPress?.(event);
    }, [isLoading, onPress]);

    const isDisabled = isLoading ?? props.isDisabled;

    return (
        <RACButton
            className={clsx(styles.button, styles[variant], styles[size], className)}
            isDisabled={isDisabled}
            onPress={handlePress}
            {...props}
        />
    );
};
