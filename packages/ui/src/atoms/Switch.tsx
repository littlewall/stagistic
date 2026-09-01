import clsx from 'clsx';
import type {ReactNode} from 'react';
import {
    Switch as RACSwitch,
    type SwitchProps as RACSwitchProps,
} from 'react-aria-components';

import styles from './Switch.module.css';

export type SwitchProps = Omit<RACSwitchProps, 'children' | 'className'> & {
    className?: string,
    children?: ReactNode,
    variant?: 'default' | 'setting',
};

export const Switch = ({
    className,
    children,
    variant = 'default',
    ...props
}: SwitchProps) => (
    <RACSwitch
        {...props}
        className={clsx(
            styles.switch,
            variant === 'setting' && styles.setting,
            className,
        )}
    >
        <span className={styles.track} aria-hidden="true">
            <span className={styles.thumb} />
        </span>
        {children ? <span className={styles.label}>{children}</span> : null}
    </RACSwitch>
);
