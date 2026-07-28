import type {
    CharacterFilterValue,
    ExportCharacter,
} from '@stagistic/export';
import {
    InlineTooltip,
    Switch,
} from '@stagistic/ui';

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
        <div className={styles.module}>
            <div>
                <h3 className={styles.title}>Characters</h3>
            </div>
            <Switch
                isSelected={onlySelected}
                onChange={isSelected => onChange({
                    mode: isSelected ? 'only' : 'all',
                    characterIds: value.characterIds,
                    preserveFullScriptPagination: value.preserveFullScriptPagination,
                })}
            >
                Selected characters only
            </Switch>
            {onlySelected ? (
                <div className={styles.checkList}>
                    {characters.map(character => (
                        <label className={styles.checkRow} key={character.id}>
                            <input
                                type="checkbox"
                                checked={selected.has(character.id)}
                                onChange={event => {
                                    const next = new Set(selected);

                                    if (event.currentTarget.checked) {
                                        next.add(character.id);
                                    } else {
                                        next.delete(character.id);
                                    }

                                    onChange({
                                        mode: 'only',
                                        characterIds: Array.from(next),
                                        preserveFullScriptPagination: value.preserveFullScriptPagination,
                                    });
                                }}
                            />
                            <span>{character.displayName}</span>
                        </label>
                    ))}
                    {characters.length === 0 ? (
                        <p className={styles.description}>No characters found in this script.</p>
                    ) : null}
                </div>
            ) : null}
            {onlySelected ? (
                <div className={styles.preservePagination}>
                    <Switch
                        isSelected={value.preserveFullScriptPagination !== false}
                        onChange={preserveFullScriptPagination => onChange({...value, preserveFullScriptPagination})}
                    >
                        Preserve full-script pagination
                    </Switch>
                    <InlineTooltip
                        label="?"
                        tooltip="Keep page numbers and content positions aligned with the complete script."
                    />
                </div>
            ) : null}
        </div>
    );
};
