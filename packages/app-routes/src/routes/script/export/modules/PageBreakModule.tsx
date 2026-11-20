import type {PageBreakValue} from '@stagistic/export';
import type {ContinuationMark} from '@stagistic/script';
import {FormSelect, Switch} from '@stagistic/ui';

import {ExportSettingRow, ExportSettingsGroup} from './ExportSettingsLayout';
import styles from './modules.module.css';

export const PageBreakModule = ({value, onChange}: {value: PageBreakValue, onChange: (value: PageBreakValue) => void}) => {
    return (
        <ExportSettingsGroup>
            <h3 className={styles.title}>Page breaks</h3>
            <ExportSettingRow>
                <Switch variant="setting" isSelected={value.actOnNewPage ?? true} onChange={actOnNewPage => onChange({...value, actOnNewPage})}>Acts start on a new page</Switch>
            </ExportSettingRow>
            <ExportSettingRow>
                <Switch variant="setting" isSelected={value.sceneOnNewPage || value.sceneOnOddPage} isDisabled={value.sceneOnOddPage} onChange={sceneOnNewPage => onChange({...value, sceneOnNewPage})}>Scenes start on a new page</Switch>
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
                >Scenes start on odd pages
                </Switch>
            </ExportSettingRow>
            <ExportSettingRow>
                <Switch variant="setting" isSelected={value.repeatCharacterOnBreak ?? false} onChange={repeatCharacterOnBreak => onChange({...value, repeatCharacterOnBreak})}>Repeat character name after a page break</Switch>
            </ExportSettingRow>
            <fieldset className={styles.continuationField}>
                <ExportSettingRow className={styles.continuationRow}><label htmlFor="continuation-mark">Continuation mark</label><FormSelect
                    id="continuation-mark"
                    ariaLabel="Continuation mark"
                    size="sm"
                    width="content"
                    value={value.continuationMark ?? 'none'}
                    options={[
                        {value: 'none', label: 'None'},
                        {value: 'contd', label: '(CONT\'D)'},
                        {value: 'cont', label: '(Cont.)'},
                    ]}
                    onChange={continuationMark => onChange({...value, continuationMark: continuationMark as ContinuationMark})}
                />
                </ExportSettingRow>
            </fieldset>
        </ExportSettingsGroup>
    );
};
