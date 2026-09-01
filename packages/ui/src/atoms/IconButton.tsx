import clsx from 'clsx';
import {
    Button as RACButton,
    type ButtonProps as RACButtonProps,
} from 'react-aria-components';

import styles from './IconButton.module.css';

type IconButtonVariant = 'ghost' | 'outline' | 'filled';

type IconButtonSize = 'xs' | 'sm' | 'md';

type IconButtonTone = 'neutral' | 'danger';

type IconButtonProps = {
    variant?: IconButtonVariant,
    size?: IconButtonSize,
    tone?: IconButtonTone,
    shape?: 'default' | 'pill',
    isSelected?: boolean,
    className?: string,
} & Omit<RACButtonProps, 'className'>;

export const IconButton = ({
    variant = 'ghost',
    size = 'sm',
    tone = 'neutral',
    shape = 'default',
    isSelected = false,
    className,
    ...props
}: IconButtonProps) => (
    <RACButton
        {...props}
        data-selected={isSelected || undefined}
        className={clsx(
            styles.iconButton,
            styles[variant],
            styles[size],
            styles[tone],
            shape === 'pill' && styles.pill,
            className,
        )}
    />
);
