import clsx from 'clsx';
import {
    type ComponentPropsWithoutRef,
    type ElementType,
    useMemo,
} from 'react';

import styles from './Button.module.css';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

type ButtonSize = 'sm' | 'md';

type ButtonProps<T extends ElementType> = {
    as?: T,
    variant?: ButtonVariant,
    size?: ButtonSize,
    className?: string,
} & Omit<ComponentPropsWithoutRef<T>, 'as' | 'className'>;

const defaultElement = 'button';

export const Button = <T extends ElementType = typeof defaultElement>({
    as,
    variant = 'primary',
    size = 'md',
    className,
    ...props
}: ButtonProps<T>) => {
    const Component = useMemo(() => as ?? defaultElement, [as]);
    const componentProps = useMemo(() => {
        return {
            ...props,
            className: clsx(styles.button, styles[variant], styles[size], className),
        } as ComponentPropsWithoutRef<T>;
    }, [
        props,
        variant,
        size,
        className,
    ]);

    if (Component === 'button' && !('type' in componentProps)) {
        (componentProps as ComponentPropsWithoutRef<'button'>).type = 'button';
    }

    return <Component {...componentProps} />;
};
