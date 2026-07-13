import {Button} from 'react-aria-components';

import {Tooltip} from '../atoms/Tooltip';
import {EditPencilIcon} from '../icons';
import styles from './EditorSidebar.module.css';
import type {EditorSidebarCharacter} from './types';

interface CharacterRowConfirmedProps {
    character: EditorSidebarCharacter,
    onEditCharacter?: (characterId: string) => void,
}

export const CharacterRowConfirmed = ({
    character,
    onEditCharacter,
}: CharacterRowConfirmedProps) => {
    const isEditDisabled = !character.id || !onEditCharacter;

    return (
        <div className={styles.characterRow}>
            <span className={styles.characterColor} aria-hidden="true" />
            <span className={styles.characterName}>{character.key}</span>
            <Tooltip
                label={`Edit ${character.key}`}
                placement="left"
                isDisabled={isEditDisabled}
            >
                <Button
                    className={styles.editIconButton}
                    aria-disabled={isEditDisabled}
                    aria-label={`Edit ${character.key}`}
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
