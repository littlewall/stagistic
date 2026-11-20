import {
    type FormatTemplateId,
    getFormatTemplate,
} from '@stagistic/script';
import {
    LockIcon,
    Select,
    type SelectOption,
} from '@stagistic/ui';

import styles from './formatTemplate.module.css';

const CURRENT_VALUE = 'current';
const RESET_VALUE = 'reset';
const CHOOSE_VALUE = 'choose';
const DEFAULT_TEMPLATE_ID: FormatTemplateId = 'stagistic-default';

export interface FormatTemplatePickerProps {
    value: FormatTemplateId | null,
    isDefault: boolean,
    /** Opens the template picker on a template; nothing is applied from the select itself. */
    onChoose: (id: FormatTemplateId | null) => void,
}

/** Shows the current format; templates are chosen in the picker, Reset only appears for a different format. */
export const FormatTemplatePicker = ({
    value,
    isDefault,
    onChoose,
}: FormatTemplatePickerProps) => {
    const applied = value ? getFormatTemplate(value) : undefined;
    const options: SelectOption[] = [
        {
            value: CURRENT_VALUE,
            label: applied?.label ?? (isDefault ? 'Stagistic Default' : 'Custom'),
            icon: applied ? <LockIcon aria-hidden="true" /> : undefined,
            isDisabled: true,
        },
        ...isDefault ? [] : [
            {
                value: RESET_VALUE,
                label: 'Reset to Stagistic Default',
                dividerBefore: true,
            },
        ],
        {
            value: CHOOSE_VALUE,
            label: 'Choose template…',
            dividerBefore: isDefault,
        },
    ];

    return (
        <Select
            ariaLabel="Format template"
            menuAriaLabel="Format template"
            value={CURRENT_VALUE}
            options={options}
            className={styles.picker}
            variant="plain"
            align="start"
            onChange={choice => onChoose(choice === RESET_VALUE ? DEFAULT_TEMPLATE_ID : null)}
        />
    );
};
