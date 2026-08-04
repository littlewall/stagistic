import clsx from 'clsx';
import type {CSSProperties} from 'react';

import {CharacterGroupRow} from './CharacterGroupRow';
import {CharacterRowConfirmed} from './CharacterRowConfirmed';
import {CharacterRowPending} from './CharacterRowPending';
import styles from './EditorSidebar.module.css';
import type {
    EditorSidebarCharacter,
    EditorSidebarGroup,
} from './types';
import {getCharacterIdentityKey} from './utils';

export type {
    EditorSidebarCharacter,
    EditorSidebarGroup,
};

interface EditorSidebarData {
    confirmedCharacters: EditorSidebarCharacter[],
    groups: EditorSidebarGroup[],
    unconfirmedCharacters: EditorSidebarCharacter[],
    characterColorSaturation?: number,
    isLoading?: boolean,
}

interface EditorSidebarActions {
    onConfirmCharacter?: (characterKey: string, colorHex?: string | null) => void,
    onEditCharacter?: (characterId: string) => void,
    onEditGroup?: (groupId: string) => void,
    onFocusCharacter?: (characterKey: string) => void,
    onSetGroupColor?: (groupId: string, colorHex: string | null) => void,
}

interface EditorSidebarOptions {
    activeCharacterId?: string | null,
    activeCharacterKey?: string | null,
    className?: string,
}

export interface EditorSidebarProps {
    data: EditorSidebarData,
    actions?: EditorSidebarActions,
    options?: EditorSidebarOptions,
}

export const EditorSidebar = ({
    data,
    actions,
    options,
}: EditorSidebarProps) => {
    const {
        confirmedCharacters,
        groups,
        unconfirmedCharacters,
        characterColorSaturation,
        isLoading,
    } = data;
    const {
        onConfirmCharacter,
        onEditCharacter,
        onEditGroup,
        onFocusCharacter,
        onSetGroupColor,
    } = actions ?? {};
    const {
        activeCharacterId,
        activeCharacterKey,
        className,
    } = options ?? {};
    const hasContent = confirmedCharacters.length > 0
        || groups.length > 0
        || unconfirmedCharacters.length > 0;

    return (
        <aside className={clsx(styles.sidebar, className)}>
            <section className={styles.section}>
                {isLoading ? (
                    <p className={styles.emptyState}>Loading characters...</p>
                ) : null}
                {!isLoading && !hasContent ? (
                    <p className={styles.emptyState}>
                        No characters on stage yet. Add a character block to start building your cast.
                    </p>
                ) : null}
                {!isLoading && hasContent ? (
                    <>
                        {confirmedCharacters.length > 0 ? (
                            <ul className={styles.characterList}>
                                {confirmedCharacters.map(character => {
                                    const characterIdentityKey = getCharacterIdentityKey(character);
                                    const isActive = activeCharacterId
                                        ? character.id === activeCharacterId
                                        : character.key === activeCharacterKey;

                                    return (
                                        <li
                                            key={characterIdentityKey}
                                            className={clsx(styles.characterItem, isActive && styles.active)}
                                            aria-current={isActive ? 'true' : undefined}
                                            style={{'--character-color': character.color} as CSSProperties}
                                        >
                                            <CharacterRowConfirmed
                                                character={character}
                                                onEditCharacter={onEditCharacter}
                                            />
                                        </li>
                                    );
                                })}
                            </ul>
                        ) : null}
                        {groups.length > 0 ? (
                            <section className={styles.groupSection}>
                                <h2 className={styles.title}>Groups</h2>
                                <ul className={styles.characterList}>
                                    {groups.map(group => {
                                        const isActive = activeCharacterId
                                            ? group.id === activeCharacterId
                                            : group.key === activeCharacterKey;

                                        return (
                                            <li
                                                key={getCharacterIdentityKey(group)}
                                                className={clsx(styles.characterItem, isActive && styles.active)}
                                                aria-current={isActive ? 'true' : undefined}
                                                style={{'--character-color': group.color} as CSSProperties}
                                            >
                                                <CharacterGroupRow
                                                    group={group}
                                                    characterColorSaturation={characterColorSaturation}
                                                    onEditGroup={onEditGroup}
                                                    onFocusCharacter={onFocusCharacter}
                                                    onSetGroupColor={onSetGroupColor}
                                                />
                                            </li>
                                        );
                                    })}
                                </ul>
                            </section>
                        ) : null}
                        {unconfirmedCharacters.length > 0 ? (
                            <section className={styles.groupSection}>
                                <h2 className={styles.title}>Unconfirmed</h2>
                                <ul className={styles.characterList}>
                                    {unconfirmedCharacters.map(character => {
                                        const characterIdentityKey = getCharacterIdentityKey(character);
                                        const isConfirmPending = character.isConfirmPending
                                            ?? character.isPending
                                            ?? false;
                                        const isActive = activeCharacterId
                                            ? character.id === activeCharacterId
                                            : character.key === activeCharacterKey;

                                        return (
                                            <li
                                                key={characterIdentityKey}
                                                className={clsx(
                                                    styles.characterItem,
                                                    !character.isConfirmed && styles.unconfirmed,
                                                    isActive && styles.active,
                                                )}
                                                aria-current={isActive ? 'true' : undefined}
                                                style={{'--character-color': character.color} as CSSProperties}
                                            >
                                                <CharacterRowPending
                                                    model={{
                                                        character,
                                                        isConfirmPending,
                                                    }}
                                                    actions={{
                                                        onConfirmCharacter,
                                                        onFocusCharacter,
                                                    }}
                                                />
                                            </li>
                                        );
                                    })}
                                </ul>
                            </section>
                        ) : null}
                    </>
                ) : null}
            </section>
        </aside>
    );
};
