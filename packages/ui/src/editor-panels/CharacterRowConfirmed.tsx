import {Button} from 'react-aria-components';

import {Tooltip} from '../atoms/Tooltip/Tooltip';
import {EditPencilIcon} from '../icons';
import {CharacterColorControl} from './characterRowConfirmed/CharacterColorControl';
import {useCharacterColorPickerState} from './characterRowConfirmed/useCharacterColorPickerState';
import styles from './EditorSidebar.module.css';
import type {EditorSidebarCharacter} from './types';

interface CharacterRowConfirmedProps {
    character: EditorSidebarCharacter,
    onEditCharacter?: (characterId: string, returnFocus?: HTMLElement | null) => void,
    onSetCharacterColor?: (characterId: string, colorHex: string | null) => void,
}

export const CharacterRowConfirmed = ({
    character,
    onEditCharacter,
    onSetCharacterColor,
}: CharacterRowConfirmedProps) => {
    const isColorActionDisabled = Boolean(character.isColorUpdatePending) || !onSetCharacterColor;
    const isEditDisabled = !character.id;
    const colorPicker = useCharacterColorPickerState({
        character,
        isColorActionDisabled,
        onSetCharacterColor,
    });

    return (
        <div className={styles.characterRow}>
            <CharacterColorControl
                characterKey={character.key}
                color={colorPicker.control}
            />
            <span className={styles.characterName}>{character.key}</span>
            {onEditCharacter ? (
                <Tooltip
                    label={`Manage ${character.key}`}
                    placement="left"
                    isDisabled={isEditDisabled}
                >
                    <Button
                        className={styles.editIconButton}
                        aria-disabled={isEditDisabled}
                        aria-label={`Manage ${character.key}`}
                        onPress={event => {
                            if (!character.id) {
                                return;
                            }

                            onEditCharacter(character.id, event.target as HTMLElement);
                        }}
                    >
                        <EditPencilIcon
                            className={styles.iconGlyph}
                            aria-hidden="true"
                        />
                    </Button>
                </Tooltip>
            ) : null}
        </div>
    );
};
