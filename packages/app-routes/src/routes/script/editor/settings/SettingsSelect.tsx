import {useExclusiveOverlay} from '@stagistic/editor';
import {Select, type SelectOption} from '@stagistic/ui';
import {clsx} from '@stagistic/ui';
import {useState} from 'react';

import styles from './SettingsSelect.module.css';

export type SettingsSelectOption = SelectOption;

interface SettingsSelectProps {
    id?: string,
    value: number | string,
    options: SettingsSelectOption[],
    ariaLabel: string,
    onChange: (value: number | string) => void,
    className?: string,
}

export const SettingsSelect = ({
    id,
    value,
    options,
    ariaLabel,
    onChange,
    className,
}: SettingsSelectProps) => {
    const [isOpen, setIsOpen] = useState(false);

    useExclusiveOverlay(isOpen, () => setIsOpen(false));

    return (
        <Select
            id={id}
            value={value}
            options={options}
            ariaLabel={ariaLabel}
            onChange={onChange}
            className={clsx(styles.root, className)}
            isOpen={isOpen}
            onIsOpenChange={setIsOpen}
        />
    );
};
