import clsx from 'clsx';
import {
    type CSSProperties,
    useCallback,
    useMemo,
    useState,
} from 'react';

import {RemoveCharacterModal} from '../dialogs/RemoveCharacterModal';
import {CharacterRowConfirmed} from './CharacterRowConfirmed';
import {CharacterRowPending} from './CharacterRowPending';
import styles from './EditorSidebar.module.css';
import type {EditorSidebarCharacter} from './types';
import {useRenameDrafts} from './useRenameDrafts';
import {
    getCharacterIdentityKey,
    getRenameDraftKey,
} from './utils';

export type {EditorSidebarCharacter};

interface EditorSidebarData {
    confirmedCharacters: EditorSidebarCharacter[],
    unconfirmedCharacters: EditorSidebarCharacter[],
    isLoading?: boolean,
}

interface EditorSidebarActions {
    onConfirmCharacter?: (characterKey: string, colorHex?: string | null) => void,
    onDeleteCharacter?: (characterId: string) => void | Promise<void>,
    onFocusCharacter?: (characterKey: string) => void,
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
    onSetCharacterColor?: (characterId: string, colorHex: string | null) => void,
    onSetCharacterOutline?: (characterId: string, outline: string | null) => void,
}

interface EditorSidebarOptions {
    characterColorSaturation?: number,
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
        onDeleteCharacter,
        onFocusCharacter,
        normalizeRenameInput,
        onRenameCharacterPreview,
        onRenameCharacter,
        onSetCharacterColor,
        onSetCharacterOutline,
    } = actions ?? {};
    const {
        characterColorSaturation,
        className,
    } = options ?? {};
    const [expandedKeys, setExpandedKeys] = useState<Set<string>>(new Set());
    const [deleteTarget, setDeleteTarget] = useState<{id: string, key: string} | null>(null);
    const hasCharacters = confirmedCharacters.length > 0 || unconfirmedCharacters.length > 0;

    const handleRequestDeleteCharacter = useCallback((characterId: string, characterKey: string) => {
        setDeleteTarget({id: characterId, key: characterKey});
    }, []);

    const handleConfirmDeleteCharacter = useCallback(() => {
        if (!deleteTarget) {
            return;
        }

        void onDeleteCharacter?.(deleteTarget.id);
        setDeleteTarget(null);
    }, [deleteTarget, onDeleteCharacter]);
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
            <section className={styles.section}>
                <h3 className={styles.title}>On-stage</h3>
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
                                        !character.isConfirmed && styles.unconfirmed,
                                    )}
                                    style={{'--character-color': character.color} as CSSProperties}
                                >
                                    {character.isConfirmed ? (
                                        <CharacterRowConfirmed
                                            model={{
                                                character,
                                                characterIdentityKey,
                                                renameDraft,
                                            }}
                                            state={{
                                                isExpanded,
                                                isDeletePending,
                                                isRenamePending,
                                            }}
                                            actions={{
                                                onToggleExpanded: toggleExpanded,
                                                onRenameDraftChange: handleRenameDraftChange,
                                                onCommitRenameDraft: commitRenameDraft,
                                                onRequestDeleteCharacter: onDeleteCharacter
                                                    ? handleRequestDeleteCharacter
                                                    : undefined,
                                                onRenameCharacter,
                                                onSetCharacterColor,
                                                onSetCharacterOutline,
                                            }}
                                            options={{
                                                characterColorSaturation,
                                            }}
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
            <RemoveCharacterModal
                isOpen={deleteTarget !== null}
                characterKey={deleteTarget?.key}
                onClose={() => setDeleteTarget(null)}
                onConfirm={handleConfirmDeleteCharacter}
            />
        </aside>
    );
};
