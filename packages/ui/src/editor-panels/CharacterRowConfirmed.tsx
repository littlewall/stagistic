import {Button} from 'react-aria-components';

import {Tooltip} from '../atoms/Tooltip';
import {EditPencilIcon} from '../icons';
import {CharacterColorControl} from './characterRowConfirmed/CharacterColorControl';
import {useCharacterColorPickerState} from './characterRowConfirmed/useCharacterColorPickerState';
import styles from './EditorSidebar.module.css';
import type {EditorSidebarCharacter} from './types';

interface CharacterRowConfirmedProps {
    character: EditorSidebarCharacter,
    characterColorSaturation?: number,
    onEditCharacter?: (characterId: string) => void,
    onSetCharacterColor?: (characterId: string, colorHex: string | null) => void,
}

export const CharacterRowConfirmed = ({
    character,
    characterColorSaturation,
    onEditCharacter,
    onSetCharacterColor,
}: CharacterRowConfirmedProps) => {
    const isColorActionDisabled = Boolean(character.isColorUpdatePending) || !onSetCharacterColor;
    const isEditDisabled = !character.id || !onEditCharacter;
    const colorPicker = useCharacterColorPickerState({
        character,
        isColorActionDisabled,
        onSetCharacterColor,
        characterColorSaturation,
    });

    return (
        <div className={styles.characterRow}>
            <CharacterColorControl
                characterKey={character.key}
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
            <span className={styles.characterName}>{character.key}</span>
            <Tooltip
                label={`Manage ${character.key}`}
                placement="left"
                isDisabled={isEditDisabled}
            >
                <Button
                    className={styles.editIconButton}
                    aria-disabled={isEditDisabled}
                    aria-label={`Manage ${character.key}`}
                    onPress={() => {
                        if (!character.id || isEditDisabled) {
                            return;
                        }

                        onEditCharacter(character.id);
                    }}
                >
                    <EditPencilIcon className={styles.iconGlyph} aria-hidden="true" />
                </Button>
            </Tooltip>
        </div>
    );
};
