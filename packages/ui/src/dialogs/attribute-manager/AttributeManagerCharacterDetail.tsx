import {normalizeCharacterKey} from '@stagistic/script';
import clsx from 'clsx';
import {
    type CSSProperties,
    type FormEvent,
    useMemo,
    useRef,
    useState,
} from 'react';

import {Button} from '../../atoms/Button/Button';
import {Tooltip} from '../../atoms/Tooltip/Tooltip';
import {CharacterColorControl} from '../../editor-panels/characterRowConfirmed/CharacterColorControl';
import {CharacterOutlineInput} from '../../editor-panels/characterRowConfirmed/CharacterOutlineInput';
import {useCharacterColorPickerState} from '../../editor-panels/characterRowConfirmed/useCharacterColorPickerState';
import type {EditorSidebarCharacter} from '../../editor-panels/types';
import {TrashIcon} from '../../icons';
import {formControlStyles} from '../../molecules/forms/shared/formControlStyles';
import {VocalRangeSection} from '../../vocal-range/VocalRangeSection';
import styles from './AttributeManagerCharactersPanel.module.css';
import type {AttributeManagerCharacter} from './attributeManagerCharacterTypes';
import {AttributeNameForm} from './AttributeNameForm';
import {RemoveCharacterModal} from './RemoveCharacterModal';

interface AttributeManagerCharacterDetailProps {
    character: AttributeManagerCharacter,
    confirmedName: string,
    characters: AttributeManagerCharacter[],
    isDeleting: boolean,
    isRenaming: boolean,
    isColorUpdating: boolean,
    onNameDraftChange: (name: string) => void,
    onResetNameDraft: () => void,
    onRenameCharacter?: (characterId: string, previousName: string, nextName: string) => void | Promise<unknown>,
    onSetCharacterColor?: (characterId: string, colorHex: string | null) => void | Promise<unknown>,
    onSetCharacterOutline?: (characterId: string, outline: string | null) => void,
    onSetCharacterVoiceType?: (characterId: string, voiceType: string | null) => void,
    onSetCharacterVocalRange?: (characterId: string, vocalRangeLow: string | null, vocalRangeHigh: string | null) => void,
    onDeleteCharacter?: (characterId: string) => void,
}

export const AttributeManagerCharacterDetail = ({
    character,
    confirmedName,
    characters,
    isDeleting,
    isRenaming,
    isColorUpdating,
    onNameDraftChange,
    onResetNameDraft,
    onRenameCharacter,
    onSetCharacterColor,
    onSetCharacterOutline,
    onSetCharacterVoiceType,
    onSetCharacterVocalRange,
    onDeleteCharacter,
}: AttributeManagerCharacterDetailProps) => {
    const [isRemoveOpen, setIsRemoveOpen] = useState(false);
    const removeTriggerRef = useRef<HTMLElement | null>(null);
    const editorCharacter = useMemo<EditorSidebarCharacter>(
        () => ({
            id: character.id,
            key: character.name,
            color: character.color ?? '',
            colorHex: character.color,
            outline: character.outline,
            isConfirmed: true,
        }),
        [character],
    );
    const isColorActionDisabled = isDeleting || isColorUpdating || !onSetCharacterColor;
    const trimmedName = character.name.trim();
    const normalizedName = normalizeCharacterKey(trimmedName);
    const isDuplicate = characters.some(candidate => {
        return candidate.id !== character.id && normalizeCharacterKey(candidate.name) === normalizedName;
    });
    const isInvalid = trimmedName.length === 0 || isDuplicate;
    const errorId = isInvalid ? `character-name-error-${character.id}` : undefined;
    const colorPicker = useCharacterColorPickerState({
        character: editorCharacter,
        isColorActionDisabled,
        onSetCharacterColor,
    });

    const handleConfirmDelete = () => {
        onDeleteCharacter?.(character.id);
        setIsRemoveOpen(false);
    };
    const persistName = async () => {
        if (isInvalid || !onRenameCharacter) {
            return;
        }

        if (trimmedName === confirmedName) {
            onResetNameDraft();

            return;
        }

        try {
            await onRenameCharacter(character.id, confirmedName, trimmedName);
        } catch {
            // Keep the dirty draft visible; the catalog exposes the persistence error.
        }
    };
    const handleNameSubmit = (event: FormEvent) => {
        event.preventDefault();
        void persistName();
    };

    return (
        <>
            <header className={styles.detailHeader}>
                <div className={styles.detailIdentity}>
                    <CharacterColorControl
                        characterKey={character.name}
                        className={styles.detailColorControl}
                        swatchClassName={styles.detailColorSwatch}
                        color={colorPicker.control}
                    />
                    <div>
                        <h3 className={styles.detailTitle}>{character.name}</h3>
                    </div>
                </div>
                <Tooltip
                    label={`Remove ${character.name}`}
                    placement="left"
                >
                    <Button
                        className={styles.deleteButton}
                        variant="ghost"
                        size="sm"
                        isDisabled={isDeleting || isRenaming || !onDeleteCharacter}
                        aria-label={`Remove ${character.name}`}
                        onPress={event => {
                            removeTriggerRef.current = event.target as HTMLElement;
                            setIsRemoveOpen(true);
                        }}
                    >
                        <TrashIcon
                            className={styles.actionIcon}
                            aria-hidden="true"
                        />
                    </Button>
                </Tooltip>
            </header>
            <div className={styles.detailBody}>
                <AttributeNameForm
                    fieldId={`character-name-${character.id}`}
                    name={character.name}
                    isBusy={isRenaming}
                    isDisabled={isDeleting || isRenaming || !onRenameCharacter}
                    isInvalid={isInvalid}
                    isDuplicate={isDuplicate}
                    errorId={errorId}
                    onSubmit={handleNameSubmit}
                    onChange={onNameDraftChange}
                    onCommit={() => void persistName()}
                    onReset={onResetNameDraft}
                />
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
                <VocalRangeSection
                    character={{
                        id: character.id,
                        voiceType: character.voiceType,
                        vocalRangeLow: character.vocalRangeLow,
                        vocalRangeHigh: character.vocalRangeHigh,
                    }}
                    onSetCharacterVoiceType={onSetCharacterVoiceType}
                    onSetCharacterVocalRange={onSetCharacterVocalRange}
                />
            </div>
            <RemoveCharacterModal
                returnFocus={removeTriggerRef}
                isOpen={isRemoveOpen}
                characterKey={character.name}
                groupNames={character.groupNames ?? []}
                onClose={() => setIsRemoveOpen(false)}
                onConfirm={handleConfirmDelete}
            />
        </>
    );
};
