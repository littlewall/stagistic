import clsx from 'clsx';

import {
    Select,
    type SelectOption,
} from './Select';
import styles from './FormSelect.module.css';

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
}: FormSelectProps) => (
    <Select
        id={id}
        value={value}
        options={options}
        ariaLabel={ariaLabel}
        onChange={onChange}
        className={clsx(styles.root, className)}
        isOpen={isOpen}
        onIsOpenChange={onIsOpenChange}
    />
);
