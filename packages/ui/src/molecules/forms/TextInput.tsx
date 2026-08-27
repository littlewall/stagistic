import clsx from 'clsx';
import {
    type ComponentPropsWithoutRef,
    forwardRef,
    useId,
    useMemo,
} from 'react';

import {Input} from '../../atoms/Input';
import styles from './TextInput.module.css';

type TextInputProps = {
    label: string,
    description?: string,
    className?: string,
    inputClassName?: string,
} & Omit<ComponentPropsWithoutRef<typeof Input>, 'className' | 'size'>;

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
            <Input
                {...props}
                id={resolvedId}
                ref={ref}
                size="md"
                variant="raised"
                className={inputClassName}
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
