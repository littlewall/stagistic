import clsx from 'clsx';
import type {ReactNode} from 'react';
import {
    ToggleButton as RACToggleButton,
    ToggleButtonGroup as RACToggleButtonGroup,
} from 'react-aria-components';

import styles from './ToggleButtonGroup.module.css';

export interface ToggleButtonGroupOption<Value extends string> {
    value: Value,
    label: string,
    content?: ReactNode,
    isIconOnly?: boolean,
}

interface ToggleButtonGroupBaseProps<Value extends string> {
    options: readonly ToggleButtonGroupOption<Value>[],
    ariaLabel?: string,
    ariaLabelledBy?: string,
    className?: string,
    isDisabled?: boolean,
}

interface SingleToggleButtonGroupProps<Value extends string> {
    selectionMode?: 'single',
    value: Value,
    onChange: (value: Value) => void,
}

interface MultipleToggleButtonGroupProps<Value extends string> {
    selectionMode: 'multiple',
    value: readonly Value[],
    onChange: (value: Value[]) => void,
}

export type ToggleButtonGroupProps<Value extends string> = ToggleButtonGroupBaseProps<Value> & (
    SingleToggleButtonGroupProps<Value> | MultipleToggleButtonGroupProps<Value>
);

export const ToggleButtonGroup = <Value extends string,>(
    props: ToggleButtonGroupProps<Value>,
) => {
    const {
        options,
        ariaLabel,
        ariaLabelledBy,
        className,
        isDisabled,
    } = props;
    const selectionMode = props.selectionMode ?? 'single';
    const selectedKeys = props.selectionMode === 'multiple' ? props.value : [props.value];

    const handleSelectionChange = (keys: Set<React.Key>) => {
        const values = [...keys].filter((key): key is Value => {
            return typeof key === 'string' && options.some(option => option.value === key);
        });

        if (props.selectionMode === 'multiple') {
            props.onChange(values);

            return;
        }

        const nextValue = values[0];

        if (nextValue) {
            props.onChange(nextValue);
        }
    };

    return (
        <RACToggleButtonGroup
            className={clsx(styles.group, className)}
            selectionMode={selectionMode}
            selectedKeys={selectedKeys}
            disallowEmptySelection={selectionMode === 'single'}
            isDisabled={isDisabled}
            aria-label={ariaLabel}
            aria-labelledby={ariaLabelledBy}
            onSelectionChange={handleSelectionChange}
        >
            {options.map(option => (
                <RACToggleButton
                    key={option.value}
                    id={option.value}
                    className={clsx(styles.item, option.isIconOnly && styles.iconOnly)}
                    aria-label={option.label}
                >
                    {option.content ?? option.label}
                </RACToggleButton>
            ))}
        </RACToggleButtonGroup>
    );
};
