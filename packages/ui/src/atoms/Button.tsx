import clsx from 'clsx';
import {
    Button as RACButton,
    type ButtonProps as RACButtonProps,
    composeRenderProps,
} from 'react-aria-components';

import styles from './Button.module.css';
import {ProgressCircle} from './ProgressCircle';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline';

type ButtonSize = 'icon' | 'sm' | 'md';

type ButtonProps = {
    variant?: ButtonVariant,
    size?: ButtonSize,
    className?: string,
} & Omit<RACButtonProps, 'className'>;

export const Button = ({
    variant = 'primary',
    size = 'md',
    className,
    ...props
}: ButtonProps) => (
    <RACButton
        {...props}
        className={clsx(styles.button, styles[variant], styles[size], className)}
    >
        {composeRenderProps(props.children, (children, {isPending}) => (
            <>
                {isPending && <ProgressCircle aria-label="Loading..." isIndeterminate />}
                {children}
            </>
        ))}
    </RACButton>
);
