import clsx from 'clsx';
import {
    Radio as RACRadio,
    RadioGroup as RACRadioGroup,
} from 'react-aria-components';

import styles from './RadioChoiceGroup.module.css';

export interface RadioChoiceOption<T extends string> {
    value: T,
    label: string,
    description?: string,
}

interface RadioChoiceGroupProps<T extends string> {
    ariaLabel: string,
    className?: string,
    value: T,
    options: RadioChoiceOption<T>[],
    onChange: (value: T) => void,
    isDisabled?: boolean,
}

export const RadioChoiceGroup = <T extends string,>({
    ariaLabel,
    className,
    value,
    options,
    onChange,
    isDisabled,
}: RadioChoiceGroupProps<T>) => (
    <RACRadioGroup
        aria-label={ariaLabel}
        className={clsx(styles.group, className)}
        value={value}
        onChange={nextValue => onChange(nextValue as T)}
        isDisabled={isDisabled}
    >
        {options.map(option => (
            <RACRadio
                key={option.value}
                value={option.value}
                className={styles.option}
            >
                <span className={styles.indicator} aria-hidden="true" />
                <span className={styles.copy}>
                    <span className={styles.label}>{option.label}</span>
                    {option.description ? (
                        <span className={styles.description}>{option.description}</span>
                    ) : null}
                </span>
            </RACRadio>
        ))}
    </RACRadioGroup>
);
