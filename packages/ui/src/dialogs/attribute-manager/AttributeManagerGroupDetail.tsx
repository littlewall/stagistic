import {normalizeCharacterKey} from '@stagistic/script';
import {
    type FormEvent,
    useMemo,
    useState,
} from 'react';

import {Button} from '../../atoms/Button/Button';
import {Tooltip} from '../../atoms/Tooltip/Tooltip';
import {CharacterColorControl} from '../../editor-panels/characterRowConfirmed/CharacterColorControl';
import {useCharacterColorPickerState} from '../../editor-panels/characterRowConfirmed/useCharacterColorPickerState';
import type {EditorSidebarCharacter} from '../../editor-panels/types';
import {TrashIcon} from '../../icons';
import {MultiComboBox} from '../../molecules/forms/MultiComboBox/MultiComboBox';
import styles from './AttributeManagerCharactersPanel.module.css';
import type {AttributeManagerCharacter, AttributeManagerGroup} from './attributeManagerCharacterTypes';
import {AttributeNameForm} from './AttributeNameForm';
import {RemoveGroupModal} from './RemoveGroupModal';

interface AttributeManagerGroupDetailProps {
    group: AttributeManagerGroup,
    confirmedName: string,
    speakingEntities: Array<{id: string, name: string}>,
    characters: AttributeManagerCharacter[],
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
    const editorGroup = useMemo<EditorSidebarCharacter>(
        () => ({
            id: group.id,
            key: group.name,
            color: group.color ?? '',
            colorHex: group.color,
            outline: null,
            isConfirmed: true,
        }),
        [group],
    );
    const isColorActionDisabled = isDeleting || isColorUpdating || !onSetGroupColor;
    const trimmedName = group.name.trim();
    const normalizedName = normalizeCharacterKey(trimmedName);
    const isDuplicate = speakingEntities.some(entity => {
        return entity.id !== group.id && normalizeCharacterKey(entity.name) === normalizedName;
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
                        color={colorPicker.control}
                    />
                    <h3 className={styles.detailTitle}>{group.name}</h3>
                </div>
                <Tooltip
                    label={`Remove ${group.name}`}
                    placement="left"
                >
                    <Button
                        className={styles.deleteButton}
                        variant="ghost"
                        size="sm"
                        isDisabled={isDeleting || isRenaming || !onDeleteGroup}
                        aria-label={`Remove ${group.name}`}
                        onPress={() => setIsRemoveOpen(true)}
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
                    fieldId={`group-name-${group.id}`}
                    name={group.name}
                    isBusy={isRenaming}
                    isDisabled={isDeleting || isRenaming || !onRenameGroup}
                    isInvalid={isInvalid}
                    isDuplicate={isDuplicate}
                    errorId={errorId}
                    onSubmit={handleNameSubmit}
                    onChange={onNameDraftChange}
                    onCommit={() => void persistName()}
                    onReset={onResetNameDraft}
                />
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
