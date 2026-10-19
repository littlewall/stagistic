import clsx from 'clsx';
import {
    useMemo,
    useState,
} from 'react';

import {useItemSelection} from '../../hooks/useItemSelection';
import {useKeyedFieldDrafts} from '../../hooks/useKeyedFieldDrafts';
import {AttributeManagerCharacterDetail} from './AttributeManagerCharacterDetail';
import styles from './AttributeManagerCharactersPanel.module.css';
import type {AttributeManagerCharactersPanelProps, WorkspaceId} from './attributeManagerCharacterTypes';
import {AttributeManagerEntityBrowser} from './AttributeManagerEntityBrowser';
import {AttributeManagerGroupDetail} from './AttributeManagerGroupDetail';
import {CreateCharacterModal} from './CreateCharacterModal';
import {CreateGroupModal} from './CreateGroupModal';
import {useAttributeManagerCharacterNames} from './useAttributeManagerCharacterNames';
import {useOptimisticAttributeManagerColors} from './useOptimisticAttributeManagerColors';

const includesId = (ids: string[] | undefined, id: string) => ids?.includes(id) ?? false;

const WORKSPACES: Array<{id: WorkspaceId, label: string}> = [
    {id: 'characters', label: 'Characters'},
    {id: 'groups', label: 'Groups'},
    // {id: 'cast', label: 'Cast'},
];

export const AttributeManagerCharactersPanel = ({
    characters,
    groups = [],
    initialSelectedCharacterId,
    initialSelectedGroupId,
    initialWorkspaceId = 'characters',
    isLoading = false,
    draftScopeKey = null,
    deletingCharacterIds,
    renamingCharacterIds,
    colorUpdatingCharacterIds,
    deletingGroupIds,
    renamingGroupIds,
    colorUpdatingGroupIds,
    onSetCharacterColor,
    onSetCharacterOutline,
    onSetCharacterVoiceType,
    onSetCharacterVocalRange,
    onDeleteCharacter,
    onCreateCharacter,
    onRenameCharacter,
    onCreateGroup,
    onRenameGroup,
    onDeleteGroup,
    onSetGroupColor,
    onChangeGroupMemberIds,
}: AttributeManagerCharactersPanelProps) => {
    const [activeWorkspaceId, setActiveWorkspaceId] = useState<WorkspaceId>(initialWorkspaceId);
    const [selectedCharacterId, setSelectedCharacterId] = useItemSelection(characters, initialSelectedCharacterId);
    const [selectedGroupId, setSelectedGroupId] = useItemSelection(groups, initialSelectedGroupId, true);
    const [isCreateCharacterOpen, setIsCreateCharacterOpen] = useState(false);
    const [isCreateGroupOpen, setIsCreateGroupOpen] = useState(false);
    const {colorizedItems: colorizedCharacters, setColor: handleSetCharacterColor} = useOptimisticAttributeManagerColors(characters, onSetCharacterColor);
    const {
        displayedCharacters,
        persistName,
        resetName,
        setName,
    } = useAttributeManagerCharacterNames({
        characters: colorizedCharacters,
        draftScopeKey,
        onRenameCharacter,
    });
    const {
        getValue: getGroupName,
        persistValue: persistGroupName,
        resetValue: resetGroupName,
        setValue: setGroupName,
    } = useKeyedFieldDrafts<string>(draftScopeKey);
    const displayedGroups = useMemo(
        () => groups.map(group => ({
            ...group,
            name: getGroupName(group.id, group.name),
        })),
        [getGroupName, groups],
    );
    const selectedCharacter = displayedCharacters.find(item => item.id === selectedCharacterId) ?? null;
    const selectedConfirmedCharacter = characters.find(item => item.id === selectedCharacterId) ?? null;
    const selectedGroup = displayedGroups.find(item => item.id === selectedGroupId) ?? null;
    const selectedConfirmedGroup = groups.find(item => item.id === selectedGroupId) ?? null;
    const allEntityNames = [
        ...characters.map(item => ({id: item.id, name: item.name})),
        ...groups.map(item => ({id: item.id, name: item.name})),
        ...displayedCharacters.map(item => ({id: item.id, name: item.name})),
        ...displayedGroups.map(item => ({id: item.id, name: item.name})),
    ];

    const [previousWorkspaceId, setPreviousWorkspaceId] = useState(initialWorkspaceId);

    if (previousWorkspaceId !== initialWorkspaceId) {
        setPreviousWorkspaceId(initialWorkspaceId);
        setActiveWorkspaceId(initialWorkspaceId);
    }

    const handleCreateGroup = async (name: string) => {
        const created = await onCreateGroup?.(name);

        if (!created) {
            return;
        }

        setSelectedGroupId(created.id);
        setIsCreateGroupOpen(false);
    };
    const activeWorkspace = WORKSPACES.find(item => item.id === activeWorkspaceId) ?? WORKSPACES[0];
    const isCharactersWorkspace = activeWorkspaceId === 'characters';
    const browserItems = isCharactersWorkspace ? displayedCharacters : displayedGroups;
    const selectedItemId = isCharactersWorkspace ? selectedCharacterId : selectedGroupId;

    const renderBrowser = () => (
        <AttributeManagerEntityBrowser
            key={activeWorkspaceId}
            items={browserItems}
            selectedItemId={selectedItemId}
            listLabel={`${activeWorkspace.label} list`}
            searchLabel={`Search ${activeWorkspace.label.toLocaleLowerCase()}`}
            createAriaLabel={isCharactersWorkspace ? 'Create characters' : 'Create group'}
            createTooltipLabel={isCharactersWorkspace ? 'Create character' : 'Create group'}
            emptyLabel={isCharactersWorkspace ? 'No characters yet.' : 'No groups yet.'}
            loadingLabel={isCharactersWorkspace ? 'Loading characters…' : 'Loading groups…'}
            noMatchesLabel={isCharactersWorkspace ? 'No characters match your search.' : 'No groups match your search.'}
            isLoading={isLoading}
            isCreateDisabled={isCharactersWorkspace ? !onCreateCharacter : !onCreateGroup}
            onSelectItem={isCharactersWorkspace ? setSelectedCharacterId : setSelectedGroupId}
            onCreate={isCharactersWorkspace ? () => setIsCreateCharacterOpen(true) : () => setIsCreateGroupOpen(true)}
        />
    );

    const renderDetails = () => (
        <section
            className={styles.detail}
            aria-label={`${activeWorkspace.label} detail`}
            data-selected-group-id={!isCharactersWorkspace ? selectedGroupId ?? undefined : undefined}
        >
            {isCharactersWorkspace && selectedCharacter && selectedConfirmedCharacter ? (
                <AttributeManagerCharacterDetail
                    character={selectedCharacter}
                    confirmedName={selectedConfirmedCharacter.name}
                    characters={allEntityNames.map(entity => ({
                        ...entity,
                        color: null,
                        outline: null,
                        voiceType: null,
                        vocalRangeLow: null,
                        vocalRangeHigh: null,
                    }))}
                    isDeleting={includesId(deletingCharacterIds, selectedCharacter.id)}
                    isRenaming={includesId(renamingCharacterIds, selectedCharacter.id)}
                    isColorUpdating={includesId(colorUpdatingCharacterIds, selectedCharacter.id)}
                    onNameDraftChange={name => setName(selectedCharacter.id, name)}
                    onResetNameDraft={() => resetName(selectedCharacter.id)}
                    onRenameCharacter={persistName}
                    onSetCharacterColor={handleSetCharacterColor}
                    onSetCharacterOutline={onSetCharacterOutline}
                    onSetCharacterVoiceType={onSetCharacterVoiceType}
                    onSetCharacterVocalRange={onSetCharacterVocalRange}
                    onDeleteCharacter={onDeleteCharacter}
                />
            ) : null}
            {!isCharactersWorkspace && selectedGroup && selectedConfirmedGroup ? (
                <AttributeManagerGroupDetail
                    group={selectedGroup}
                    confirmedName={selectedConfirmedGroup.name}
                    speakingEntities={allEntityNames}
                    characters={displayedCharacters}
                    isDeleting={includesId(deletingGroupIds, selectedGroup.id)}
                    isRenaming={includesId(renamingGroupIds, selectedGroup.id)}
                    isColorUpdating={includesId(colorUpdatingGroupIds, selectedGroup.id)}
                    onNameDraftChange={name => setGroupName(selectedGroup.id, name)}
                    onResetNameDraft={() => resetGroupName(selectedGroup.id)}
                    onRenameGroup={(id, previousName, nextName) => persistGroupName(id, nextName, name => onRenameGroup?.(id, previousName, name))}
                    onSetGroupColor={onSetGroupColor}
                    onChangeMemberIds={memberIds => onChangeGroupMemberIds?.(selectedGroup.id, memberIds)}
                    onDeleteGroup={onDeleteGroup}
                />
            ) : null}
            {(isCharactersWorkspace ? !selectedCharacter || !selectedConfirmedCharacter : !selectedGroup || !selectedConfirmedGroup) ? (
                <div className={styles.emptyDetail}>
                    <p>{isCharactersWorkspace ? 'Create a character to edit details here.' : 'Create a group to edit details here.'}</p>
                </div>
            ) : null}
        </section>
    );

    return (
        <div className={styles.panel}>
            <header className={styles.workspaceNavigation}>
                <div
                    className={styles.workspaceTabs}
                    role="tablist"
                    aria-label="Character manager views"
                >
                    {WORKSPACES.map(workspace => (
                        <button
                            key={workspace.id}
                            type="button"
                            className={clsx(styles.workspaceTab, workspace.id === activeWorkspaceId && styles.active)}
                            role="tab"
                            aria-selected={workspace.id === activeWorkspaceId}
                            onClick={() => setActiveWorkspaceId(workspace.id)}
                        >
                            {workspace.label}
                        </button>
                    ))}
                </div>
            </header>
            <div className={styles.workspace}>
                {renderBrowser()}
                {renderDetails()}
            </div>
            {onCreateCharacter ? (
                <CreateCharacterModal
                    isOpen={isCreateCharacterOpen}
                    existingCharacterNames={allEntityNames.map(entity => entity.name)}
                    onClose={() => setIsCreateCharacterOpen(false)}
                    onCreate={onCreateCharacter}
                />
            ) : null}
            {onCreateGroup ? (
                <CreateGroupModal
                    isOpen={isCreateGroupOpen}
                    existingEntityNames={allEntityNames.map(entity => entity.name)}
                    onClose={() => setIsCreateGroupOpen(false)}
                    onCreate={handleCreateGroup}
                />
            ) : null}
        </div>
    );
};
