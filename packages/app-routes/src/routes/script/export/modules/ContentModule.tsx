import {Switch} from '@stagistic/ui';

import {
    ExportSettingRow,
    ExportSettingsGroup,
} from './ExportSettingsLayout';

export const ContentModule = ({
    value,
    onChange,
}: {
    value: boolean,
    onChange: (value: boolean) => void,
}) => (
    <ExportSettingsGroup>
        <ExportSettingRow>
            <Switch
                variant="setting"
                isSelected={value}
                onChange={onChange}
            >
                Show notes
            </Switch>
        </ExportSettingRow>
    </ExportSettingsGroup>
);
