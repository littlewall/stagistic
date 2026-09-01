import clsx from 'clsx';
import {
    type ComponentPropsWithoutRef,
    createElement,
    type ElementType,
    type ReactElement,
    type ReactNode,
} from 'react';

import styles from './ActionCard.module.css';

type ActionCardVariant = 'default' | 'primary';

export type ActionCardProps<T extends ElementType = 'button'> = {
    as?: T,
    variant?: ActionCardVariant,
    icon: ReactNode,
    title: ReactNode,
    description?: ReactNode,
    error?: ReactNode,
    className?: string,
} & Omit<ComponentPropsWithoutRef<T>, 'as' | 'className' | 'title'>;

const VARIANT_CLASS: Record<ActionCardVariant, string> = {
    default: styles.default,
    primary: styles.primary,
};

export const ActionCard = <T extends ElementType = 'button'>({
    as,
    variant = 'default',
    icon,
    title,
    description,
    error,
    className,
    ...props
}: ActionCardProps<T>): ReactElement => createElement(
    as ?? 'button',
    {
        ...props,
        className: clsx(styles.card, VARIANT_CLASS[variant], className),
    },
    <span key="icon" className={styles.icon}>{icon}</span>,
    <span key="copy" className={styles.copy}>
        <span className={styles.title}>{title}</span>
        {description != null && <span className={styles.description}>{description}</span>}
        {error != null && <span className={styles.error}>{error}</span>}
    </span>,
);
