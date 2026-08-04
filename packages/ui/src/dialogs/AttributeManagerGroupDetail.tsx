import {normalizeCharacterKey} from '@stagistic/script';
import {
    type FormEvent,
    useMemo,
    useState,
} from 'react';

import {Button} from '../atoms/Button';
import {Tooltip} from '../atoms/Tooltip';
import {CharacterColorControl} from '../editor-panels/characterRowConfirmed/CharacterColorControl';
import {useCharacterColorPickerState} from '../editor-panels/characterRowConfirmed/useCharacterColorPickerState';
import type {EditorSidebarCharacter} from '../editor-panels/types';
import {TrashIcon} from '../icons';
import {formControlStyles} from '../molecules/forms/formControlStyles';
import {MultiComboBox} from '../molecules/forms/MultiComboBox';
import type {
    AttributeManagerCharacter,
    AttributeManagerGroup,
} from './AttributeManagerCharactersPanel';
import styles from './AttributeManagerCharactersPanel.module.css';
import {RemoveGroupModal} from './RemoveGroupModal';

interface AttributeManagerGroupDetailProps {
    group: AttributeManagerGroup,
    confirmedName: string,
    speakingEntities: Array<{id: string, name: string}>,
    characters: AttributeManagerCharacter[],
    characterColorSaturation?: number,
    isDeleting: boolean,
    isRenaming: boolean,
    isColorUpdating: boolean,
    onNameDraftChange: (name: string) => void,
    onResetNameDraft: () => void,
    onRenameGroup?: (groupId: string, previousName: string, nextName: string) => void | Promise<unknown>,
    onSetGroupColor?: (groupId: string, colorHex: string | null) => void | Promise<unknown>,
    onChangeMemberIds?: (memberIds: string[]) => void | Promise<unknown>,
    onDeleteGroup?: (groupId: string) => void | Promise<unknown>,
}

export const AttributeManagerGroupDetail = ({
    group,
    confirmedName,
    speakingEntities,
    characters,
    characterColorSaturation,
    isDeleting,
    isRenaming,
    isColorUpdating,
    onNameDraftChange,
    onResetNameDraft,
    onRenameGroup,
    onSetGroupColor,
    onChangeMemberIds,
    onDeleteGroup,
}: AttributeManagerGroupDetailProps) => {
    const [isRemoveOpen, setIsRemoveOpen] = useState(false);
    const editorGroup = useMemo<EditorSidebarCharacter>(() => ({
        id: group.id,
        key: group.name,
        color: group.color ?? '',
        colorHex: group.color,
        outline: null,
        isConfirmed: true,
    }), [group]);
    const isColorActionDisabled = isDeleting || isColorUpdating || !onSetGroupColor;
    const trimmedName = group.name.trim();
    const normalizedName = normalizeCharacterKey(trimmedName);
    const isDuplicate = speakingEntities.some(entity => {
        return entity.id !== group.id
            && normalizeCharacterKey(entity.name) === normalizedName;
    });
    const isInvalid = normalizedName.length === 0 || isDuplicate;
    const errorId = isInvalid ? `group-name-error-${group.id}` : undefined;
    const handleSetGroupColor = (groupId: string, colorHex: string | null) => {
        void Promise.resolve(onSetGroupColor?.(groupId, colorHex)).catch(() => undefined);
    };
    const colorPicker = useCharacterColorPickerState({
        character: editorGroup,
        isColorActionDisabled,
        onSetCharacterColor: handleSetGroupColor,
        characterColorSaturation,
    });

    const persistName = async () => {
        if (isInvalid || !onRenameGroup) {
            return;
        }

        if (trimmedName === confirmedName) {
            onResetNameDraft();

            return;
        }

        try {
            await onRenameGroup(group.id, confirmedName, trimmedName);
        } catch {
            // Keep the dirty draft visible; the catalog exposes the persistence error.
        }
    };
    const handleNameSubmit = (event: FormEvent) => {
        event.preventDefault();
        void persistName();
    };
    const handleConfirmDelete = async () => {
        await onDeleteGroup?.(group.id);
        setIsRemoveOpen(false);
    };

    return (
        <>
            <header className={styles.detailHeader}>
                <div className={styles.detailIdentity}>
                    <CharacterColorControl
                        characterKey={group.name}
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
                            refs: {triggerRef: colorPicker.colorTriggerRef},
                            actions: {
                                togglePicker: colorPicker.toggleColorPicker,
                                setPickerOpen: colorPicker.setIsColorPickerOpen,
                                applyColor: colorPicker.applyColor,
                                resetColor: colorPicker.resetColor,
                                setDraftHue: colorPicker.setColorDraftHue,
                            },
                        }}
                    />
                    <h3 className={styles.detailTitle}>{group.name}</h3>
                </div>
                <Tooltip label={`Remove ${group.name}`} placement="left">
                    <Button
                        className={styles.deleteButton}
                        variant="ghost"
                        size="sm"
                        isDisabled={isDeleting || isRenaming || !onDeleteGroup}
                        aria-label={`Remove ${group.name}`}
                        onPress={() => setIsRemoveOpen(true)}
                    >
                        <TrashIcon className={styles.actionIcon} aria-hidden="true" />
                    </Button>
                </Tooltip>
            </header>
            <div className={styles.detailBody}>
                <form className={styles.nameForm} onSubmit={handleNameSubmit} aria-busy={isRenaming}>
                    <label className={formControlStyles.label} htmlFor={`group-name-${group.id}`}>
                        Name
                    </label>
                    <input
                        id={`group-name-${group.id}`}
                        type="text"
                        className={formControlStyles.input}
                        value={group.name}
                        disabled={isDeleting || isRenaming || !onRenameGroup}
                        aria-describedby={errorId}
                        aria-invalid={isInvalid}
                        onChange={event => onNameDraftChange(event.target.value)}
                        onBlur={() => void persistName()}
                        onKeyDown={event => {
                            if (event.key === 'Escape') {
                                onResetNameDraft();
                            }
                        }}
                    />
                    {isInvalid ? (
                        <p id={errorId} className={styles.error}>
                            {isDuplicate
                                ? 'A character or group with this name already exists.'
                                : 'Name cannot be empty.'}
                        </p>
                    ) : null}
                </form>
                <div className={styles.membersSection}>
                    <MultiComboBox
                        label="Members"
                        placeholder="Select members"
                        options={characters.map(character => ({
                            id: character.id,
                            label: character.name,
                        }))}
                        value={group.memberIds}
                        isDisabled={isDeleting || !onChangeMemberIds}
                        emptyLabel={characters.length === 0 ? 'No confirmed characters yet' : 'No matching characters'}
                        onChange={memberIds => {
                            void Promise.resolve(onChangeMemberIds?.(memberIds)).catch(() => undefined);
                        }}
                    />
                </div>
            </div>
            <RemoveGroupModal
                isOpen={isRemoveOpen}
                groupName={group.name}
                usageCount={group.usageCount}
                isRemoving={isDeleting}
                onClose={() => setIsRemoveOpen(false)}
                onConfirm={handleConfirmDelete}
            />
        </>
    );
};
