import clsx from 'clsx';
import {
    type ComponentPropsWithoutRef,
    forwardRef,
    useId,
    useMemo,
} from 'react';

import styles from './TextInput.module.css';

type TextInputProps = {
    label: string,
    description?: string,
    className?: string,
    inputClassName?: string,
} & Omit<ComponentPropsWithoutRef<'input'>, 'className'>;

export const TextInput = forwardRef<HTMLInputElement, TextInputProps>(({
    label,
    description,
    className,
    inputClassName,
    id,
    ...props
}, ref) => {
    const fallbackId = useId();
    const resolvedId = useMemo(() => id ?? fallbackId, [id, fallbackId]);
    const descriptionId = useMemo(() => description ? `${resolvedId}-description` : undefined, [description, resolvedId]);

    return (
        <label className={clsx(styles.field, className)} htmlFor={resolvedId}>
            {label}
            <input
                {...props}
                id={resolvedId}
                ref={ref}
                className={clsx(styles.input, inputClassName)}
                aria-describedby={descriptionId}
            />
            {description ? (
                <span id={descriptionId} className={styles.description}>
                    {description}
                </span>
            ) : null}
        </label>
    );
});

TextInput.displayName = 'TextInput';
