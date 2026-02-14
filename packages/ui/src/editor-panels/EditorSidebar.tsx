import clsx from 'clsx';
import {
    List,
    NavArrowDown,
    NavArrowRight,
} from 'iconoir-react';
import {
    type CSSProperties,
    useCallback,
    useEffect,
    useMemo,
    useState,
} from 'react';
import {
    Button,
    Tab,
    TabList,
    TabPanel,
    Tabs,
    Tooltip,
    TooltipTrigger,
} from 'react-aria-components';

import styles from './EditorSidebar.module.css';

export type EditorSidebarCharacter = {
    id?: string,
    key: string,
    count: number,
    color: string,
    isConfirmed: boolean,
    isPending?: boolean,
    isConfirmPending?: boolean,
    isDeletePending?: boolean,
    isRenamePending?: boolean,
};

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
    isLoading?: boolean,
    className?: string,
};

const isInlineInteractiveTarget = (target: EventTarget | null) => {
    if (!(target instanceof HTMLElement)) {
        return false;
    }

    return Boolean(target.closest('button, input, textarea, [contenteditable="true"]'));
};

const getRenameDraftKey = (characterId: string | undefined, characterKey: string) => {
    return characterId && characterId.length > 0
        ? `id:${characterId}`
        : `key:${characterKey}`;
};

const getCharacterIdentityKey = (character: EditorSidebarCharacter) => {
    return character.id && character.id.length > 0
        ? `id:${character.id}`
        : `key:${character.key}`;
};

export const EditorSidebar = ({
    confirmedCharacters,
    unconfirmedCharacters,
    onConfirmCharacter,
    onDeleteCharacter,
    normalizeRenameInput,
    onRenameCharacterPreview,
    onRenameCharacter,
    isLoading,
    className,
}: EditorSidebarProps) => {
    const [expandedKeys, setExpandedKeys] = useState<Set<string>>(new Set());
    const [renameDraftByKey, setRenameDraftByKey] = useState<Record<string, string>>({});
    const hasCharacters = confirmedCharacters.length > 0 || unconfirmedCharacters.length > 0;
    const rows = useMemo(
        () => [...confirmedCharacters, ...unconfirmedCharacters],
        [confirmedCharacters, unconfirmedCharacters],
    );

    useEffect(() => {
        setRenameDraftByKey(previous => {
            const next: Record<string, string> = {};

            confirmedCharacters.forEach(character => {
                const draftKey = getRenameDraftKey(character.id, character.key);

                next[draftKey] = previous[draftKey] ?? character.key;
            });

            return next;
        });
    }, [confirmedCharacters]);

    const toggleExpanded = useCallback((characterKey: string) => {
        setExpandedKeys(previous => {
            const next = new Set(previous);

            if (next.has(characterKey)) {
                next.delete(characterKey);
            } else {
                next.add(characterKey);
            }

            return next;
        });
    }, []);

    const handleRenameDraftChange = useCallback((characterId: string, characterKey: string, value: string) => {
        const draftKey = getRenameDraftKey(characterId, characterKey);
        const previousValueRaw = renameDraftByKey[draftKey] ?? characterKey;
        const previousValue = previousValueRaw.trim().length === 0
            ? characterKey
            : previousValueRaw;
        const normalizedValue = normalizeRenameInput
            ? normalizeRenameInput(value)
            : value;

        if (characterId && normalizedValue !== previousValueRaw) {
            onRenameCharacterPreview?.(characterId, previousValue, normalizedValue);
        }

        setRenameDraftByKey(previous => ({
            ...previous,
            [draftKey]: normalizedValue,
        }));
    }, [
        normalizeRenameInput,
        onRenameCharacterPreview,
        renameDraftByKey,
    ]);

    const commitRenameDraft = useCallback((characterId: string, characterKey: string) => {
        const draftKey = getRenameDraftKey(characterId, characterKey);
        const draftValue = (renameDraftByKey[draftKey] ?? characterKey).trim();

        if (draftValue.length === 0) {
            setRenameDraftByKey(previous => ({
                ...previous,
                [draftKey]: characterKey,
            }));

            return;
        }

        if (draftValue === characterKey || !characterId) {
            return;
        }

        void onRenameCharacter?.(characterId, characterKey, draftValue);
    }, [onRenameCharacter, renameDraftByKey]);

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
                                    const isConfirmActionDisabled = isConfirmPending || !onConfirmCharacter;
                                    const isDeleteActionDisabled = isDeletePending
                                        || isRenamePending
                                        || !character.id
                                        || !onDeleteCharacter;
                                    const isRenameActionDisabled = isRenamePending
                                        || isDeletePending
                                        || !character.id
                                        || !onRenameCharacter;

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
                                                <div
                                                    className={styles.characterRowButton}
                                                    role="button"
                                                    tabIndex={0}
                                                    aria-label={isExpanded ? `Collapse ${character.key}` : `Expand ${character.key}`}
                                                    aria-expanded={isExpanded}
                                                    onClick={event => {
                                                        if (isInlineInteractiveTarget(event.target)) {
                                                            return;
                                                        }

                                                        toggleExpanded(characterIdentityKey);
                                                    }}
                                                    onKeyDown={event => {
                                                        if (
                                                            isInlineInteractiveTarget(event.target)
                                                            || (event.key !== 'Enter' && event.key !== ' ')
                                                        ) {
                                                            return;
                                                        }

                                                        event.preventDefault();
                                                        toggleExpanded(characterIdentityKey);
                                                    }}
                                                >
                                                    <button
                                                        type="button"
                                                        className={styles.expandIndicatorButton}
                                                        aria-hidden="true"
                                                        tabIndex={-1}
                                                        onClick={event => {
                                                            event.stopPropagation();
                                                            toggleExpanded(characterIdentityKey);
                                                        }}
                                                    >
                                                        {isExpanded ? (
                                                            <NavArrowDown className={styles.expandIcon} aria-hidden="true" />
                                                        ) : (
                                                            <NavArrowRight className={styles.expandIcon} aria-hidden="true" />
                                                        )}
                                                    </button>
                                                    <span className={styles.characterColor} aria-hidden="true" />
                                                    {isExpanded ? (
                                                        <input
                                                            type="text"
                                                            className={styles.characterInlineRenameInput}
                                                            value={renameDraft}
                                                            disabled={isRenameActionDisabled}
                                                            aria-label={`Rename ${character.key}`}
                                                            onClick={event => {
                                                                event.stopPropagation();
                                                            }}
                                                            onChange={event => {
                                                                handleRenameDraftChange(
                                                                    character.id ?? '',
                                                                    character.key,
                                                                    event.target.value,
                                                                );
                                                            }}
                                                            onBlur={() => {
                                                                commitRenameDraft(character.id ?? '', character.key);
                                                            }}
                                                            onKeyDown={event => {
                                                                event.stopPropagation();

                                                                if (event.key === 'Enter') {
                                                                    event.preventDefault();
                                                                    commitRenameDraft(character.id ?? '', character.key);
                                                                    event.currentTarget.blur();
                                                                }

                                                                if (event.key === 'Escape') {
                                                                    event.preventDefault();
                                                                    handleRenameDraftChange(
                                                                        character.id ?? '',
                                                                        character.key,
                                                                        character.key,
                                                                    );
                                                                    event.currentTarget.blur();
                                                                }
                                                            }}
                                                        />
                                                    ) : (
                                                        <span className={styles.characterName}>{character.key}</span>
                                                    )}
                                                </div>
                                            ) : (
                                                <div className={styles.characterRow}>
                                                    <TooltipTrigger
                                                        trigger="hover"
                                                        delay={0}
                                                        closeDelay={120}
                                                    >
                                                        <Button
                                                            className={styles.confirmIconButton}
                                                            onPress={() => {
                                                                if (isConfirmActionDisabled) {
                                                                    return;
                                                                }

                                                                onConfirmCharacter(character.key);
                                                            }}
                                                            aria-disabled={isConfirmActionDisabled}
                                                            aria-label={isConfirmPending
                                                                ? `Saving ${character.key}`
                                                                : `Confirm ${character.key}`}
                                                        >
                                                            {isConfirmPending ? (
                                                                <span className={styles.confirmSpinner} aria-hidden="true" />
                                                            ) : (
                                                                <svg viewBox="0 0 24 24" className={styles.iconGlyph}>
                                                                    <path d="M20 6 9 17l-4-4" />
                                                                </svg>
                                                            )}
                                                        </Button>
                                                        <Tooltip
                                                            className={styles.confirmTooltip}
                                                            placement="right"
                                                            offset={8}
                                                        >
                                                            {isConfirmPending
                                                                ? `Saving ${character.key}`
                                                                : !onConfirmCharacter
                                                                    ? 'Confirmation unavailable'
                                                                    : `Confirm ${character.key}`}
                                                        </Tooltip>
                                                    </TooltipTrigger>
                                                    <span className={styles.characterColor} aria-hidden="true" />
                                                    <span className={styles.characterName}>{character.key}</span>
                                                </div>
                                            )}
                                            {character.isConfirmed && isExpanded ? (
                                                <div className={styles.characterDetails}>
                                                    <div className={styles.characterMetaRow}>
                                                        <span className={styles.detailLabel}>Occurrences in script</span>
                                                        <span className={styles.detailValue}>{character.count}</span>
                                                    </div>
                                                    <div className={styles.characterMiniToolbar}>
                                                        <TooltipTrigger
                                                            trigger="hover"
                                                            delay={0}
                                                            closeDelay={120}
                                                        >
                                                            <Button
                                                                className={styles.deleteIconButton}
                                                                aria-disabled={isDeleteActionDisabled}
                                                                aria-label={isDeletePending
                                                                    ? `Deleting ${character.key}`
                                                                    : `Delete ${character.key}`}
                                                                onPress={() => {
                                                                    if (isDeleteActionDisabled) {
                                                                        return;
                                                                    }

                                                                    void onDeleteCharacter?.(character.id ?? '');
                                                                }}
                                                            >
                                                                {isDeletePending ? (
                                                                    <span className={styles.confirmSpinner} aria-hidden="true" />
                                                                ) : (
                                                                    <svg viewBox="0 0 24 24" className={styles.iconGlyph}>
                                                                        <path d="M4 7h16" />
                                                                        <path d="M10 11v6" />
                                                                        <path d="M14 11v6" />
                                                                        <path d="M6 7v11a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V7" />
                                                                        <path d="M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                                                                    </svg>
                                                                )}
                                                            </Button>
                                                            <Tooltip
                                                                className={styles.confirmTooltip}
                                                                placement="right"
                                                                offset={8}
                                                            >
                                                                {isDeletePending
                                                                    ? `Deleting ${character.key}`
                                                                    : !onDeleteCharacter
                                                                        ? 'Deletion unavailable'
                                                                        : `Delete ${character.key}`}
                                                            </Tooltip>
                                                        </TooltipTrigger>
                                                    </div>
                                                </div>
                                            ) : null}
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
