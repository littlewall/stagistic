import clsx from 'clsx';
import type {ReactNode} from 'react';

import styles from './Notice.module.css';

type NoticeVariant = 'warning' | 'error' | 'empty';

const DEFAULT_ROLE: Record<NoticeVariant, string | undefined> = {
    warning: 'status',
    error: 'alert',
    empty: undefined,
};

const VARIANT_CLASS: Record<NoticeVariant, string> = {
    warning: styles.warning,
    error: styles.error,
    empty: styles.empty,
};

export const Notice = ({
    variant,
    children,
    className,
    role,
}: {
    variant: NoticeVariant,
    children: ReactNode,
    className?: string,
    role?: string,
}) => (
    <div
        role={role ?? DEFAULT_ROLE[variant]}
        className={clsx(styles.notice, VARIANT_CLASS[variant], className)}
    >
        {children}
    </div>
);
