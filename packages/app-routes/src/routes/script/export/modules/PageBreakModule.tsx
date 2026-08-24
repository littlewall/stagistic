import type {PageBreakValue} from '@stagistic/export';
import {Switch} from '@stagistic/ui';

import {
    ExportSettingRow,
    ExportSettingsGroup,
} from './ExportSettingsLayout';
import styles from './modules.module.css';

export const PageBreakModule = ({
    value,
    onChange,
}: {
    value: PageBreakValue,
    onChange: (value: PageBreakValue) => void,
}) => (
    <ExportSettingsGroup>
        <h3 className={styles.title}>Page breaks</h3>
        <ExportSettingRow>
            <Switch
                variant="setting"
                isSelected={value.sceneOnNewPage || value.sceneOnOddPage}
                isDisabled={value.sceneOnOddPage}
                onChange={sceneOnNewPage => onChange({...value, sceneOnNewPage})}
            >
                Scenes start on a new page
            </Switch>
        </ExportSettingRow>
        <ExportSettingRow>
            <Switch
                variant="setting"
                isSelected={value.sceneOnOddPage}
                onChange={sceneOnOddPage => onChange({
                    ...value,
                    sceneOnOddPage,
                    sceneOnNewPage: sceneOnOddPage ? true : value.sceneOnNewPage,
                })}
            >
                Scenes start on odd pages
            </Switch>
        </ExportSettingRow>
    </ExportSettingsGroup>
);
