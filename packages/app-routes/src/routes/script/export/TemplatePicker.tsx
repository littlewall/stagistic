import {Select} from '@stagistic/ui';

import {EXPORT_TEMPLATES} from './registry';

const options = Object.entries(EXPORT_TEMPLATES).map(([value, template]) => ({
    value,
    label: template.label,
}));

export const TemplatePicker = ({
    value,
    onChange,
}: {
    value: string,
    onChange: (value: string) => void,
}) => (
    <Select
        value={value}
        options={options}
        ariaLabel="Export template"
        onChange={next => onChange(String(next))}
    />
);
