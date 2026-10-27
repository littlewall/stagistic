import clsx from 'clsx';

import {MultiComboBox, type MultiComboBoxOption} from '../molecules/forms/MultiComboBox/MultiComboBox';
import {
    ToggleButtonGroup,
    type ToggleButtonGroupOption,
} from '../molecules/ToggleButtonGroup/ToggleButtonGroup';
import styles from './BoardToolbar.module.css';

export type BoardDensity = 'title' | 'characters';

export interface BoardToolbarProps {
    characterOptions: MultiComboBoxOption[],
    selectedCharacterIds: string[],
    onSelectedCharacterIdsChange: (ids: string[]) => void,
    density: BoardDensity,
    onDensityChange: (density: BoardDensity) => void,
    showMentioned: boolean,
    onShowMentionedChange: (show: boolean) => void,
    className?: string,
}

const DENSITY_OPTIONS: readonly ToggleButtonGroupOption<BoardDensity>[] = [
    {value: 'title', label: 'Title'},
    {value: 'characters', label: 'Characters'},
];

const MENTIONED_OPTIONS: readonly ToggleButtonGroupOption<'mentioned'>[] = [{value: 'mentioned', label: 'Mentioned'}];

/** Board controls: a character filter, card density, and whether mere mentions show. */
export const BoardToolbar = ({
    characterOptions,
    selectedCharacterIds,
    onSelectedCharacterIdsChange,
    density,
    onDensityChange,
    showMentioned,
    onShowMentionedChange,
    className,
}: BoardToolbarProps) => (
    <div
        className={clsx(styles.toolbar, className)}
        role="group"
        aria-label="Board options"
    >
        <MultiComboBox
            className={styles.filter}
            label="Characters"
            placeholder="Show scenes with…"
            options={characterOptions}
            value={selectedCharacterIds}
            onChange={onSelectedCharacterIdsChange}
        />
        <ToggleButtonGroup
            ariaLabel="Card density"
            options={DENSITY_OPTIONS}
            value={density}
            onChange={onDensityChange}
        />
        <ToggleButtonGroup
            selectionMode="multiple"
            ariaLabel="Mentioned characters"
            options={MENTIONED_OPTIONS}
            value={showMentioned ? ['mentioned'] : []}
            isDisabled={density === 'title'}
            onChange={values => onShowMentionedChange(values.includes('mentioned'))}
        />
    </div>
);
