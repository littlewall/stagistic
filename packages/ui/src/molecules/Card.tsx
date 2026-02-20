import clsx from 'clsx';
import type {
    ComponentPropsWithoutRef,
    ElementType,
    ReactNode,
} from 'react';

import styles from './Card.module.css';

type CardProps<T extends ElementType> = {
    children: ReactNode,
    className?: string,
    as?: T,
    variant?: 'default' | 'highlight',
} & Omit<ComponentPropsWithoutRef<T>, 'as' | 'className'>;

const defaultElement = 'article';

export const Card = <T extends ElementType = typeof defaultElement>({
    children,
    className,
    as,
    variant = 'default',
    ...props
}: CardProps<T>) => {
    const Component = as ?? defaultElement;
    const isInteractive = Boolean(props.onClick || props.href);

    return (
        <Component
            {...props}
            className={clsx(
                styles.card,
                {
                    [styles.highlight]: variant === 'highlight',
                    [styles.interactive]: isInteractive,
                },
                className,
            )}
        >
            {children}
        </Component>
    );
};

type CardSectionProps = {
    children: ReactNode,
    className?: string,
};

export const CardHeader = ({children, className}: CardSectionProps) => (
    <div className={clsx(styles.header, className)}>
        {children}
    </div>
);

export const CardContent = ({children, className}: CardSectionProps) => (
    <div className={clsx(styles.content, className)}>
        {children}
    </div>
);

export const CardFooter = ({children, className}: CardSectionProps) => (
    <div className={clsx(styles.footer, className)}>
        {children}
    </div>
);
