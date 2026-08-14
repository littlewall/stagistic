import clsx from 'clsx';
import {forwardRef} from 'react';
import {
    Input as ReactAriaInput,
    type InputProps as ReactAriaInputProps,
} from 'react-aria-components';

import styles from './Input.module.css';

type InputSize = 'sm' | 'md';

type InputProps = {
    size?: InputSize,
    className?: string,
} & Omit<ReactAriaInputProps, 'className' | 'size'>;

export const Input = forwardRef<HTMLInputElement, InputProps>(({
    size = 'sm',
    className,
    ...props
}, ref) => (
    <ReactAriaInput
        {...props}
        ref={ref}
        className={clsx(styles.input, className)}
        data-size={size}
    />
));

Input.displayName = 'Input';
