import styles from '../EditorSidebar.module.css';
import {CharacterOutlineInput} from './CharacterOutlineInput';
import type {CharacterRowDetailsProps} from './contracts';

export const CharacterRowDetails = ({
    model,
    state,
    actions,
}: CharacterRowDetailsProps) => {
    return (
        <CharacterOutlineInput
            character={model.character}
            isVisible={state.isExpanded}
            containerClassName={styles.characterDetails}
            onSetCharacterOutline={actions.onSetCharacterOutline}
        />
    );
};
