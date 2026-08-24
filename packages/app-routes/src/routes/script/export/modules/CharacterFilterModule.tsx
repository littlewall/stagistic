import type {
    CharacterFilterValue,
    ExportCharacter,
} from '@stagistic/export';
import {
    InlineTooltip,
    SettingSwitch,
    Switch,
    ToggleButtonGroup,
} from '@stagistic/ui';

import {
    ExportSettingRow,
    ExportSettingsGroup,
} from './ExportSettingsLayout';
import styles from './modules.module.css';

export const CharacterFilterModule = ({
    value,
    onChange,
    characters,
}: {
    value: CharacterFilterValue,
    onChange: (value: CharacterFilterValue) => void,
    characters: ExportCharacter[],
}) => {
    const selected = new Set(value.characterIds);
    const onlySelected = value.mode === 'only';

    return (
        <ExportSettingsGroup>
            <div>
                <h3 className={styles.title}>Characters</h3>
            </div>
            <ExportSettingRow>
                <Switch
                    variant="setting"
                    isSelected={onlySelected}
                    onChange={isSelected => onChange({
                        mode: isSelected ? 'only' : 'all',
                        characterIds: isSelected && value.characterIds.length === 0
                            ? characters.map(character => character.id)
                            : value.characterIds,
                        preserveFullScriptPagination: value.preserveFullScriptPagination,
                    })}
                >
                    Selected characters only
                </Switch>
            </ExportSettingRow>
            {onlySelected ? (
                <div className={styles.initialPageOptions}>
                    <div>
                        <ToggleButtonGroup
                            ariaLabel="Characters to export"
                            options={characters.map(character => ({
                                value: character.id,
                                label: character.displayName,
                            }))}
                            selectionMode="multiple"
                            value={Array.from(selected)}
                            variant="chips"
                            onChange={characterIds => onChange({
                                mode: 'only',
                                characterIds,
                                preserveFullScriptPagination: value.preserveFullScriptPagination,
                            })}
                        />
                        {characters.length === 0 ? (
                            <p className={styles.description}>No characters found in this script.</p>
                        ) : null}
                    </div>
                    <ExportSettingRow>
                        <SettingSwitch
                            addon={(
                                <InlineTooltip
                                    label="?"
                                    tooltip="Keep page numbers and content positions aligned with the complete script."
                                />
                            )}
                            isSelected={value.preserveFullScriptPagination !== false}
                            onChange={preserveFullScriptPagination => onChange({...value, preserveFullScriptPagination})}
                        >
                            Preserve full-script pagination
                        </SettingSwitch>
                    </ExportSettingRow>
                </div>
            ) : null}
        </ExportSettingsGroup>
    );
};
