import clsx from 'clsx';

import styles from './FormSelect.module.css';
import {
    Select,
    type SelectOption,
} from './Select';

export type FormSelectOption = SelectOption;

interface FormSelectProps {
    id?: string,
    value: number | string,
    options: FormSelectOption[],
    ariaLabel: string,
    onChange: (value: number | string) => void,
    className?: string,
    isOpen?: boolean,
    onIsOpenChange?: (isOpen: boolean) => void,
    size?: 'md' | 'lg',
    width?: 'full' | 'content',
}

export const FormSelect = ({
    id,
    value,
    options,
    ariaLabel,
    onChange,
    className,
    isOpen,
    onIsOpenChange,
    size = 'lg',
    width,
}: FormSelectProps) => (
    <Select
        id={id}
        value={value}
        options={options}
        ariaLabel={ariaLabel}
        onChange={onChange}
        className={clsx(styles.root, styles[size], className)}
        isOpen={isOpen}
        onIsOpenChange={onIsOpenChange}
        width={width}
    />
);
