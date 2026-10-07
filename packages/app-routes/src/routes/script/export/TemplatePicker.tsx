import {FormSelect} from '@stagistic/ui';

import {EXPORT_TEMPLATES} from './registry';

const options = Object.entries(EXPORT_TEMPLATES).map(([value, template]) => ({
    value,
    label: template.label,
}));

export const TemplatePicker = ({
    id,
    value,
    onChange,
}: {
    id?: string,
    value: string,
    onChange: (value: string) => void,
}) => (
    <FormSelect
        id={id}
        value={value}
        options={options}
        ariaLabel="Export template"
        onChange={next => onChange(String(next))}
    />
);
