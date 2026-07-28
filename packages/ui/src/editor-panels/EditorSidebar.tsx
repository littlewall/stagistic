import clsx from 'clsx';
import {
    type CSSProperties,
    useMemo,
} from 'react';

import {CharacterRowConfirmed} from './CharacterRowConfirmed';
import {CharacterRowPending} from './CharacterRowPending';
import styles from './EditorSidebar.module.css';
import type {EditorSidebarCharacter} from './types';
import {getCharacterIdentityKey} from './utils';

export type {EditorSidebarCharacter};

interface EditorSidebarData {
    confirmedCharacters: EditorSidebarCharacter[],
    unconfirmedCharacters: EditorSidebarCharacter[],
    isLoading?: boolean,
}

interface EditorSidebarActions {
    onConfirmCharacter?: (characterKey: string, colorHex?: string | null) => void,
    onEditCharacter?: (characterId: string) => void,
    onFocusCharacter?: (characterKey: string) => void,
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
        unconfirmedCharacters,
        isLoading,
    } = data;
    const {
        onConfirmCharacter,
        onEditCharacter,
        onFocusCharacter,
    } = actions ?? {};
    const {
        activeCharacterId,
        activeCharacterKey,
        className,
    } = options ?? {};
    const hasCharacters = confirmedCharacters.length > 0 || unconfirmedCharacters.length > 0;
    const rows = useMemo(
        () => [...confirmedCharacters, ...unconfirmedCharacters],
        [confirmedCharacters, unconfirmedCharacters],
    );

    return (
        <aside className={clsx(styles.sidebar, className)}>
            <section className={styles.section}>
                {isLoading ? (
                    <p className={styles.emptyState}>Loading characters...</p>
                ) : null}
                {!isLoading && !hasCharacters ? (
                    <p className={styles.emptyState}>
                        No characters on stage yet. Add a Character block to start building your cast.
                    </p>
                ) : null}
                {!isLoading && hasCharacters ? (
                    <ul className={styles.characterList}>
                        {rows.map(character => {
                            const characterIdentityKey = getCharacterIdentityKey(character);
                            const isConfirmPending = character.isConfirmPending ?? character.isPending ?? false;
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
                                    {character.isConfirmed ? (
                                        <CharacterRowConfirmed
                                            character={character}
                                            onEditCharacter={onEditCharacter}
                                        />
                                    ) : (
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
                                    )}
                                </li>
                            );
                        })}
                    </ul>
                ) : null}
            </section>
        </aside>
    );
};
