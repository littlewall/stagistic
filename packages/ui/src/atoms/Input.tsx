import clsx from 'clsx';
import {forwardRef} from 'react';
import {
    Input as ReactAriaInput,
    type InputProps as ReactAriaInputProps,
} from 'react-aria-components';

import styles from './Input.module.css';

type InputSize = 'sm' | 'md' | 'lg';

type InputVariant = 'default' | 'raised';

type InputProps = {
    size?: InputSize,
    variant?: InputVariant,
    className?: string,
} & Omit<ReactAriaInputProps, 'className' | 'size'>;

export const Input = forwardRef<HTMLInputElement, InputProps>(({
    size = 'sm',
    variant = 'default',
    className,
    ...props
}, ref) => (
    <ReactAriaInput
        {...props}
        ref={ref}
        className={clsx(styles.input, variant !== 'default' && styles[variant], className)}
        data-size={size}
    />
));

Input.displayName = 'Input';
