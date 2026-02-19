import clsx from 'clsx';
import {List} from 'iconoir-react';
import {
    type CSSProperties,
    useCallback,
    useMemo,
    useState,
} from 'react';
import {
    Tab,
    TabList,
    TabPanel,
    Tabs,
} from 'react-aria-components';

import {CharacterRowConfirmed} from './CharacterRowConfirmed';
import {CharacterRowPending} from './CharacterRowPending';
import styles from './EditorSidebar.module.css';
import type {
    CharacterGenderOption,
    EditorSidebarCharacter,
} from './types';
import {useRenameDrafts} from './useRenameDrafts';
import {
    getCharacterIdentityKey,
    getRenameDraftKey,
} from './utils';

export type {EditorSidebarCharacter};

type EditorSidebarProps = {
    confirmedCharacters: EditorSidebarCharacter[],
    unconfirmedCharacters: EditorSidebarCharacter[],
    onConfirmCharacter?: (characterKey: string) => void,
    onDeleteCharacter?: (characterId: string) => void | Promise<void>,
    normalizeRenameInput?: (value: string) => string,
    onRenameCharacterPreview?: (
        characterId: string,
        previousCharacterName: string,
        nextCharacterName: string,
    ) => void,
    onRenameCharacter?: (
        characterId: string,
        previousCharacterName: string,
        nextCharacterName: string,
    ) => void | Promise<void>,
    characterGenderOptions?: CharacterGenderOption[],
    onSetCharacterColor?: (characterId: string, colorHex: string | null) => void,
    onSetCharacterGender?: (characterId: string, genderKey: string | null) => void,
    onUpsertCharacterGender?: (label: string) => Promise<CharacterGenderOption | null>,
    characterColorSaturation?: number,
    isLoading?: boolean,
    className?: string,
};

export const EditorSidebar = ({
    confirmedCharacters,
    unconfirmedCharacters,
    onConfirmCharacter,
    onDeleteCharacter,
    normalizeRenameInput,
    onRenameCharacterPreview,
    onRenameCharacter,
    characterGenderOptions = [],
    onSetCharacterColor,
    onSetCharacterGender,
    onUpsertCharacterGender,
    characterColorSaturation,
    isLoading,
    className,
}: EditorSidebarProps) => {
    const [expandedKeys, setExpandedKeys] = useState<Set<string>>(new Set());
    const hasCharacters = confirmedCharacters.length > 0 || unconfirmedCharacters.length > 0;
    const rows = useMemo(
        () => [...confirmedCharacters, ...unconfirmedCharacters],
        [confirmedCharacters, unconfirmedCharacters],
    );
    const {
        renameDraftByKey,
        handleRenameDraftChange,
        commitRenameDraft,
    } = useRenameDrafts({
        confirmedCharacters,
        normalizeRenameInput,
        onRenameCharacterPreview,
        onRenameCharacter,
    });

    const toggleExpanded = useCallback((characterKey: string) => {
        setExpandedKeys(previous => {
            const next = new Set(previous);

            if (!next.has(characterKey)) {
                next.add(characterKey);

                return next;
            }

            next.delete(characterKey);

            return next;
        });
    }, []);

    return (
        <aside className={clsx(styles.sidebar, className)}>
            <Tabs className={styles.tabs} defaultSelectedKey="elements">
                <TabList className={styles.tabList}>
                    <Tab id="elements" className={styles.tab}>
                        <List className={styles.tabIcon} aria-hidden="true" />
                        Elements
                    </Tab>
                </TabList>
                <TabPanel id="elements" className={styles.tabPanel}>
                    <section className={styles.section}>
                        <h3 className={styles.sectionTitle}>Characters</h3>
                        {isLoading ? (
                            <p className={styles.emptyState}>Loading characters...</p>
                        ) : null}
                        {!isLoading && !hasCharacters ? (
                            <p className={styles.emptyState}>
                                No characters yet. Add a Character block to start building your cast.
                            </p>
                        ) : null}
                        {!isLoading && hasCharacters ? (
                            <ul className={styles.characterList}>
                                {rows.map(character => {
                                    const characterIdentityKey = getCharacterIdentityKey(character);
                                    const isExpanded = character.isConfirmed && expandedKeys.has(characterIdentityKey);
                                    const isConfirmPending = character.isConfirmPending ?? character.isPending ?? false;
                                    const isDeletePending = character.isDeletePending ?? false;
                                    const isRenamePending = character.isRenamePending ?? false;
                                    const renameDraftKey = getRenameDraftKey(character.id, character.key);
                                    const renameDraft = renameDraftByKey[renameDraftKey] ?? character.key;

                                    return (
                                        <li
                                            key={characterIdentityKey}
                                            className={clsx(
                                                styles.characterItem,
                                                !character.isConfirmed && styles.characterItemUnconfirmed,
                                            )}
                                            style={{'--character-color': character.color} as CSSProperties}
                                        >
                                            {character.isConfirmed ? (
                                                <CharacterRowConfirmed
                                                    character={character}
                                                    characterIdentityKey={characterIdentityKey}
                                                    isExpanded={isExpanded}
                                                    isDeletePending={isDeletePending}
                                                    isRenamePending={isRenamePending}
                                                    renameDraft={renameDraft}
                                                    onToggleExpanded={toggleExpanded}
                                                    onRenameDraftChange={handleRenameDraftChange}
                                                    onCommitRenameDraft={commitRenameDraft}
                                                    onDeleteCharacter={onDeleteCharacter}
                                                    onRenameCharacter={onRenameCharacter}
                                                    characterGenderOptions={characterGenderOptions}
                                                    onSetCharacterColor={onSetCharacterColor}
                                                    onSetCharacterGender={onSetCharacterGender}
                                                    onUpsertCharacterGender={onUpsertCharacterGender}
                                                    characterColorSaturation={characterColorSaturation}
                                                />
                                            ) : (
                                                <CharacterRowPending
                                                    character={character}
                                                    isConfirmPending={isConfirmPending}
                                                    onConfirmCharacter={onConfirmCharacter}
                                                />
                                            )}
                                        </li>
                                    );
                                })}
                            </ul>
                        ) : null}
                    </section>
                </TabPanel>
            </Tabs>
        </aside>
    );
};
