import clsx from 'clsx';
import {forwardRef} from 'react';

import styles from './Input.module.css';

type InputSize = 'sm' | 'md';

type InputProps = {
    size?: InputSize,
    className?: string,
} & Omit<React.ComponentPropsWithoutRef<'input'>, 'className'>;

export const Input = forwardRef<HTMLInputElement, InputProps>(({
    size = 'sm',
    className,
    ...props
}, ref) => (
    <input
        {...props}
        ref={ref}
        className={clsx(styles.input, className)}
        data-size={size}
    />
));

Input.displayName = 'Input';
