import {Button} from 'react-aria-components';

import {Tag} from '../atoms/Tag';
import {Tooltip} from '../atoms/Tooltip';
import {EditPencilIcon} from '../icons';
import {CharacterColorControl} from './characterRowConfirmed/CharacterColorControl';
import {useCharacterColorPickerState} from './characterRowConfirmed/useCharacterColorPickerState';
import styles from './EditorSidebar.module.css';
import type {EditorSidebarGroup} from './types';

interface CharacterGroupRowProps {
    group: EditorSidebarGroup,
    characterColorSaturation?: number,
    onEditGroup?: (groupId: string) => void,
    onSetGroupColor?: (groupId: string, colorHex: string | null) => void,
}

export const CharacterGroupRow = ({
    group,
    characterColorSaturation,
    onEditGroup,
    onSetGroupColor,
}: CharacterGroupRowProps) => {
    const isColorActionDisabled = Boolean(group.isColorUpdatePending) || !onSetGroupColor;
    const isEditDisabled = !group.id || !onEditGroup;
    const colorPicker = useCharacterColorPickerState({
        character: group,
        isColorActionDisabled,
        onSetCharacterColor: onSetGroupColor,
        characterColorSaturation,
    });

    return (
        <div className={styles.characterRow}>
            <CharacterColorControl
                characterKey={group.key}
                color={{
                    state: {
                        isActionDisabled: isColorActionDisabled,
                        isPickerOpen: colorPicker.isColorPickerOpen,
                        currentColorHex: colorPicker.currentCharacterColorHex,
                        colorDraftHex: colorPicker.colorDraftHex,
                        pickerColorValue: colorPicker.pickerColorValue,
                        presetColorHexes: colorPicker.presetColorHexes,
                        resolvedColorSaturation: colorPicker.resolvedColorSaturation,
                    },
                    refs: {
                        triggerRef: colorPicker.colorTriggerRef,
                    },
                    actions: {
                        togglePicker: colorPicker.toggleColorPicker,
                        setPickerOpen: colorPicker.setIsColorPickerOpen,
                        applyColor: colorPicker.applyColor,
                        resetColor: colorPicker.resetColor,
                        setDraftHue: colorPicker.setColorDraftHue,
                    },
                }}
            />
            <span className={styles.characterName}>{group.key}</span>
            {group.isEmpty ? (
                <Tag className={styles.groupEmptyTag}>Empty</Tag>
            ) : null}
            <Tooltip
                label={`Manage group ${group.key}`}
                placement="left"
                isDisabled={isEditDisabled}
            >
                <Button
                    className={styles.editIconButton}
                    aria-disabled={isEditDisabled}
                    aria-label={`Manage group ${group.key}`}
                    onPress={() => {
                        if (!group.id || isEditDisabled) {
                            return;
                        }

                        onEditGroup(group.id);
                    }}
                >
                    <EditPencilIcon className={styles.iconGlyph} aria-hidden="true" />
                </Button>
            </Tooltip>
        </div>
    );
};
