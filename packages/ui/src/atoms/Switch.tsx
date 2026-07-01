import clsx from 'clsx';
import type {ReactNode} from 'react';
import {
    Switch as RACSwitch,
    type SwitchProps as RACSwitchProps,
} from 'react-aria-components';

import styles from './Switch.module.css';

type SwitchProps = Omit<RACSwitchProps, 'children' | 'className'> & {
    className?: string,
    children?: ReactNode,
};

export const Switch = ({
    className, children, ...props
}: SwitchProps) => (
    <RACSwitch {...props} className={clsx(styles.switch, className)}>
        <span className={styles.track} aria-hidden="true">
            <span className={styles.thumb} />
        </span>
        {children ? <span className={styles.label}>{children}</span> : null}
    </RACSwitch>
);
