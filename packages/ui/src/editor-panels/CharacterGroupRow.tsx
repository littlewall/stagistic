import {Button} from 'react-aria-components';

import {Tag} from '../atoms/Tag/Tag';
import {Tooltip} from '../atoms/Tooltip/Tooltip';
import {EditPencilIcon} from '../icons';
import {CharacterColorControl} from './characterRowConfirmed/CharacterColorControl';
import {useCharacterColorPickerState} from './characterRowConfirmed/useCharacterColorPickerState';
import styles from './EditorSidebar.module.css';
import type {EditorSidebarGroup} from './types';

interface CharacterGroupRowProps {
    group: EditorSidebarGroup,
    onEditGroup?: (groupId: string) => void,
    onSetGroupColor?: (groupId: string, colorHex: string | null) => void,
}

export const CharacterGroupRow = ({
    group,
    onEditGroup,
    onSetGroupColor,
}: CharacterGroupRowProps) => {
    const isColorActionDisabled = Boolean(group.isColorUpdatePending) || !onSetGroupColor;
    const isEditDisabled = !group.id;
    const colorPicker = useCharacterColorPickerState({
        character: group,
        isColorActionDisabled,
        onSetCharacterColor: onSetGroupColor,
    });

    return (
        <div className={styles.characterRow}>
            <CharacterColorControl
                characterKey={group.key}
                color={colorPicker.control}
            />
            <span className={styles.characterName}>{group.key}</span>
            {group.isEmpty ? <Tag className={styles.groupEmptyTag}>Empty</Tag> : null}
            {onEditGroup ? (
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
                            if (!group.id) {
                                return;
                            }

                            onEditGroup(group.id);
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
