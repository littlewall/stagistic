import clsx from 'clsx';
import type {ReactNode} from 'react';
import {
    Checkbox as RACCheckbox,
    type CheckboxProps as RACCheckboxProps,
} from 'react-aria-components';

import styles from './Checkbox.module.css';

export type CheckboxProps = Omit<RACCheckboxProps, 'children' | 'className'> & {
    className?: string,
    children?: ReactNode,
};

export const Checkbox = ({
    className,
    children,
    ...props
}: CheckboxProps) => (
    <RACCheckbox
        {...props}
        className={clsx(styles.checkbox, className)}
    >
        {({isIndeterminate}) => (
            <>
                <span className={styles.box} aria-hidden="true">
                    <svg
                        viewBox="0 0 24 24"
                        className={styles.mark}
                        focusable="false"
                    >
                        {isIndeterminate
                            ? <path d="M6 12h12" />
                            : <path d="m5 12.5 4.5 4.5L19 7" />}
                    </svg>
                </span>
                {children ? <span className={styles.label}>{children}</span> : null}
            </>
        )}
    </RACCheckbox>
);
