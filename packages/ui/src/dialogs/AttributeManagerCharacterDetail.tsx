import clsx from 'clsx';
import {
    type CSSProperties,
    useMemo,
    useState,
} from 'react';

import {Button} from '../atoms/Button';
import {Tooltip} from '../atoms/Tooltip';
import {CharacterColorControl} from '../editor-panels/characterRowConfirmed/CharacterColorControl';
import {CharacterOutlineInput} from '../editor-panels/characterRowConfirmed/CharacterOutlineInput';
import {useCharacterColorPickerState} from '../editor-panels/characterRowConfirmed/useCharacterColorPickerState';
import type {EditorSidebarCharacter} from '../editor-panels/types';
import {TrashIcon} from '../icons';
import {formControlStyles} from '../molecules/forms/formControlStyles';
import type {AttributeManagerCharacter} from './AttributeManagerCharactersPanel';
import styles from './AttributeManagerCharactersPanel.module.css';
import {RemoveCharacterModal} from './RemoveCharacterModal';

interface AttributeManagerCharacterDetailProps {
    character: AttributeManagerCharacter,
    characterColorSaturation?: number,
    isDeleting: boolean,
    isColorUpdating: boolean,
    onSetCharacterColor?: (characterId: string, colorHex: string | null) => void,
    onSetCharacterOutline?: (characterId: string, outline: string | null) => void,
    onDeleteCharacter?: (characterId: string) => void,
}

export const AttributeManagerCharacterDetail = ({
    character,
    characterColorSaturation,
    isDeleting,
    isColorUpdating,
    onSetCharacterColor,
    onSetCharacterOutline,
    onDeleteCharacter,
}: AttributeManagerCharacterDetailProps) => {
    const [isRemoveOpen, setIsRemoveOpen] = useState(false);
    const editorCharacter = useMemo<EditorSidebarCharacter>(() => ({
        id: character.id,
        key: character.name,
        color: character.color ?? '',
        colorHex: character.color,
        outline: character.outline,
        isConfirmed: true,
    }), [character]);
    const isColorActionDisabled = isDeleting || isColorUpdating || !onSetCharacterColor;
    const colorPicker = useCharacterColorPickerState({
        character: editorCharacter,
        isColorActionDisabled,
        onSetCharacterColor,
        characterColorSaturation,
    });

    const handleConfirmDelete = () => {
        onDeleteCharacter?.(character.id);
        setIsRemoveOpen(false);
    };

    return (
        <>
            <header className={styles.detailHeader}>
                <div className={styles.detailIdentity}>
                    <CharacterColorControl
                        characterKey={character.name}
                        className={styles.detailColorControl}
                        swatchClassName={styles.detailColorSwatch}
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
                    <div>
                        <p className={styles.detailType}>Character</p>
                        <h3 className={styles.detailTitle}>{character.name}</h3>
                    </div>
                </div>
                <Tooltip label={`Remove ${character.name}`} placement="left">
                    <Button
                        className={styles.deleteButton}
                        variant="ghost"
                        size="sm"
                        isDisabled={isDeleting || !onDeleteCharacter}
                        aria-label={`Remove ${character.name}`}
                        onPress={() => setIsRemoveOpen(true)}
                    >
                        <TrashIcon className={styles.actionIcon} aria-hidden="true" />
                    </Button>
                </Tooltip>
            </header>
            <div className={styles.detailBody}>
                <section
                    className={clsx(styles.outlineSection, formControlStyles.field)}
                    style={{'--character-color': colorPicker.currentCharacterColorHex} as CSSProperties}
                >
                    <span className={formControlStyles.label}>Outline</span>
                    <CharacterOutlineInput
                        character={editorCharacter}
                        multiline={false}
                        className={formControlStyles.input}
                        onSetCharacterOutline={onSetCharacterOutline}
                    />
                </section>
            </div>
            <RemoveCharacterModal
                isOpen={isRemoveOpen}
                characterKey={character.name}
                onClose={() => setIsRemoveOpen(false)}
                onConfirm={handleConfirmDelete}
            />
        </>
    );
};
