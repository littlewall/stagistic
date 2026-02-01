import clsx from 'clsx';
import type {
    ComponentPropsWithoutRef,
    ElementType,
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
    const Component = as ?? defaultElement;
    const componentProps = {
        ...props,
        className: clsx(styles.button, styles[variant], styles[size], className),
    } as ComponentPropsWithoutRef<T>;

    if (Component === 'button' && !('type' in componentProps)) {
        (componentProps as ComponentPropsWithoutRef<'button'>).type = 'button';
    }

    return <Component {...componentProps} />;
};
