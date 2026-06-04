import clsx from 'clsx';
import {
    type ComponentPropsWithoutRef,
    type ElementType,
    useMemo,
} from 'react';

import styles from './Button.module.css';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline';

type ButtonSize = 'sm' | 'md';

type ButtonProps<T extends ElementType> = {
    as?: T,
    variant?: ButtonVariant,
    size?: ButtonSize,
    loading?: boolean,
    className?: string,
} & Omit<ComponentPropsWithoutRef<T>, 'as' | 'className'>;

const defaultElement = 'button';

export const Button = <T extends ElementType = typeof defaultElement>({
    as,
    variant = 'primary',
    size = 'md',
    loading = false,
    className,
    disabled,
    children,
    ...props
}: ButtonProps<T>) => {
    const Component = useMemo(() => as ?? defaultElement, [as]);
    const componentProps = useMemo(() => {
        return {
            ...props,
            disabled: disabled || loading,
            'aria-busy': loading || undefined,
            className: clsx(styles.button, styles[variant], styles[size], loading && styles.loading, className),
        } as ComponentPropsWithoutRef<T>;
    }, [
        props,
        variant,
        size,
        loading,
        disabled,
        className,
    ]);

    if (Component === 'button' && !('type' in componentProps)) {
        (componentProps as ComponentPropsWithoutRef<'button'>).type = 'button';
    }

    return (
        <Component {...componentProps}>
            {loading ? (
                <>
                    <span className={styles.spinner} aria-hidden="true" />
                    <span className={styles.loadingLabel}>{children}</span>
                </>
            ) : children}
        </Component>
    );
};
