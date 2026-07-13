import clsx from 'clsx';
import {
    useEffect,
    useMemo,
    useState,
} from 'react';

import {Button} from '../atoms/Button';
import {Input} from '../atoms/Input';
import {Tooltip} from '../atoms/Tooltip';
import {
    PlusIcon,
    SearchIcon,
} from '../icons';
import {AttributeManagerCharacterDetail} from './AttributeManagerCharacterDetail';
import styles from './AttributeManagerCharactersPanel.module.css';
import {CreateCharacterModal} from './CreateCharacterModal';

export interface AttributeManagerCharacter {
    id: string,
    name: string,
    color: string | null,
    outline: string | null,
}

export interface AttributeManagerCharactersPanelProps {
    characters: AttributeManagerCharacter[],
    initialSelectedCharacterId?: string | null,
    isLoading?: boolean,
    characterColorSaturation?: number,
    deletingCharacterIds?: string[],
    colorUpdatingCharacterIds?: string[],
    onSetCharacterColor?: (characterId: string, colorHex: string | null) => void,
    onSetCharacterOutline?: (characterId: string, outline: string | null) => void,
    onDeleteCharacter?: (characterId: string) => void,
    onCreateCharacter?: (characterName: string) => void,
}

type WorkspaceId = 'characters' | 'groups' | 'cast';

const WORKSPACES: Array<{id: WorkspaceId, label: string}> = [
    {id: 'characters', label: 'Characters'},
    {id: 'groups', label: 'Groups'},
    {id: 'cast', label: 'Cast'},
];

const EMPTY_LABELS: Record<WorkspaceId, string> = {
    characters: 'No confirmed characters',
    groups: 'No groups yet',
    cast: 'No cast assignments yet',
};

export const AttributeManagerCharactersPanel = ({
    characters,
    initialSelectedCharacterId,
    isLoading = false,
    characterColorSaturation,
    deletingCharacterIds = [],
    colorUpdatingCharacterIds = [],
    onSetCharacterColor,
    onSetCharacterOutline,
    onDeleteCharacter,
    onCreateCharacter,
}: AttributeManagerCharactersPanelProps) => {
    const [activeWorkspaceId, setActiveWorkspaceId] = useState<WorkspaceId>('characters');
    const [selectedCharacterId, setSelectedCharacterId] = useState<string | null>(
        initialSelectedCharacterId ?? null,
    );
    const [searchQuery, setSearchQuery] = useState('');
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const activeWorkspace = WORKSPACES.find(item => item.id === activeWorkspaceId) ?? WORKSPACES[0];
    const normalizedSearchQuery = searchQuery.trim().toLocaleLowerCase();
    const filteredCharacters = useMemo(() => {
        if (!normalizedSearchQuery) {
            return characters;
        }

        return characters.filter(character => character.name.toLocaleLowerCase().includes(normalizedSearchQuery));
    }, [characters, normalizedSearchQuery]);
    const selectedCharacter = characters.find(character => character.id === selectedCharacterId) ?? null;
    const visibleCharacters = activeWorkspaceId === 'characters' ? filteredCharacters : [];

    useEffect(() => {
        const selectionStillExists = characters.some(character => character.id === selectedCharacterId);

        if (selectionStillExists) {
            return;
        }

        const initialSelectionExists = characters.some(character => character.id === initialSelectedCharacterId);

        setSelectedCharacterId(initialSelectionExists
            ? initialSelectedCharacterId ?? null
            : characters[0]?.id ?? null);
    }, [
        characters,
        initialSelectedCharacterId,
        selectedCharacterId,
    ]);

    const handleSelectWorkspace = (workspaceId: WorkspaceId) => {
        setActiveWorkspaceId(workspaceId);
        setSearchQuery('');
    };

    const listStatus = isLoading && activeWorkspaceId === 'characters'
        ? 'Loading characters...'
        : EMPTY_LABELS[activeWorkspaceId];
    const hasSelectedCharacter = activeWorkspaceId === 'characters' && selectedCharacter;

    return (
        <div className={styles.panel}>
            <header className={styles.workspaceNavigation}>
                <div
                    className={styles.workspaceTabs}
                    role="tablist"
                    aria-label="Character manager views"
                >
                    {WORKSPACES.map(workspace => {
                        const isActive = workspace.id === activeWorkspaceId;

                        return (
                            <button
                                key={workspace.id}
                                type="button"
                                className={clsx(styles.workspaceTab, isActive && styles.active)}
                                role="tab"
                                aria-selected={isActive}
                                onClick={() => handleSelectWorkspace(workspace.id)}
                            >
                                {workspace.label}
                            </button>
                        );
                    })}
                </div>
            </header>
            <div className={styles.workspace}>
                <aside className={styles.browser} aria-label={`${activeWorkspace.label} list`}>
                    <div className={styles.searchRow}>
                        <div className={styles.searchField}>
                            <SearchIcon className={styles.searchIcon} aria-hidden="true" />
                            <Input
                                value={searchQuery}
                                onChange={event => setSearchQuery(event.target.value)}
                                placeholder={`Search ${activeWorkspace.label.toLocaleLowerCase()}`}
                                disabled={activeWorkspaceId !== 'characters'}
                                aria-label={`Search ${activeWorkspace.label.toLocaleLowerCase()}`}
                            />
                        </div>
                        <Tooltip
                            label="Create character"
                            isDisabled={activeWorkspaceId !== 'characters' || !onCreateCharacter}
                        >
                            <Button
                                className={styles.addButton}
                                variant="ghost"
                                size="sm"
                                isDisabled={activeWorkspaceId !== 'characters' || !onCreateCharacter}
                                aria-label={`Create ${activeWorkspace.label.toLocaleLowerCase()}`}
                                onPress={() => setIsCreateOpen(true)}
                            >
                                <PlusIcon className={styles.actionIcon} aria-hidden="true" />
                            </Button>
                        </Tooltip>
                    </div>
                    <div className={styles.browserList}>
                        {visibleCharacters.map(character => {
                            const isSelected = character.id === selectedCharacterId;

                            return (
                                <button
                                    key={character.id}
                                    type="button"
                                    className={clsx(styles.listItem, isSelected && styles.selected)}
                                    aria-pressed={isSelected}
                                    onClick={() => setSelectedCharacterId(character.id)}
                                >
                                    <span
                                        className={styles.characterColor}
                                        style={character.color ? {backgroundColor: character.color} : undefined}
                                        aria-hidden="true"
                                    />
                                    <span className={styles.characterName}>{character.name}</span>
                                </button>
                            );
                        })}
                        {visibleCharacters.length === 0 ? (
                            <p className={styles.emptyList}>{listStatus}</p>
                        ) : null}
                    </div>
                </aside>
                <section className={styles.detail} aria-label={`${activeWorkspace.label} detail`}>
                    {hasSelectedCharacter ? (
                        <AttributeManagerCharacterDetail
                            character={selectedCharacter}
                            characterColorSaturation={characterColorSaturation}
                            isDeleting={deletingCharacterIds.includes(selectedCharacter.id)}
                            isColorUpdating={colorUpdatingCharacterIds.includes(selectedCharacter.id)}
                            onSetCharacterColor={onSetCharacterColor}
                            onSetCharacterOutline={onSetCharacterOutline}
                            onDeleteCharacter={onDeleteCharacter}
                        />
                    ) : (
                        <div className={styles.emptyDetail}>
                            <p>{EMPTY_LABELS[activeWorkspaceId]}</p>
                        </div>
                    )}
                </section>
            </div>
            {onCreateCharacter ? (
                <CreateCharacterModal
                    isOpen={isCreateOpen}
                    existingCharacterNames={characters.map(character => character.name)}
                    onClose={() => setIsCreateOpen(false)}
                    onCreate={onCreateCharacter}
                />
            ) : null}
        </div>
    );
};
