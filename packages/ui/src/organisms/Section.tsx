import clsx from 'clsx';
import type {ReactNode} from 'react';

import styles from './Section.module.css';

type SectionProps = {
    children: ReactNode,
    variant?: 'default' | 'danger',
    className?: string,
};

export const Section = ({
    children,
    variant = 'default',
    className,
}: SectionProps) => {
    return (
        <section
            className={clsx(styles.section, variant === 'danger' && styles.danger, className)}
        >
            {children}
        </section>
    );
};

type SectionHeaderProps = {
    children: ReactNode,
    className?: string,
};

export const SectionHeader = ({
    children,
    className,
}: SectionHeaderProps) => {
    return (
        <div className={clsx(styles.header, className)}>
            {children}
        </div>
    );
};
