import clsx from 'clsx';
import {useRef, useState} from 'react';

import {Button} from '../atoms/Button/Button';
import {Checkbox} from '../atoms/Checkbox/Checkbox';
import {IconButton} from '../atoms/IconButton/IconButton';
import {SearchInput} from '../atoms/SearchInput/SearchInput';
import {CloseIcon} from '../icons/ui';
import styles from './BoardCharacterFilter.module.css';
import {BoardMenuButton} from './BoardMenuButton';
import {ColorDot, ColorDotStack} from './ColorDot';

export interface BoardFilterCharacter {
    id: string,
    name: string,
    color: string | null,
    sceneCount: number,
}

export interface BoardCharacterFilterProps {
    /** In the order the panel lists them. */
    characters: readonly BoardFilterCharacter[],
    selectedIds: readonly string[],
    onChange: (ids: string[]) => void,
}

const MAX_STACKED_DOTS = 5;

const formatSceneCount = (count: number) => `${count} ${count === 1 ? 'scene' : 'scenes'}`;

const TriggerContent = ({selected}: {selected: readonly BoardFilterCharacter[]}) => {
    const [first] = selected;

    if (!first) {
        return <span>Characters</span>;
    }

    if (selected.length === 1) {
        return (
            <>
                <ColorDot color={first.color} />
                <span className={styles.name}>{first.name}</span>
            </>
        );
    }

    return (
        <>
            <ColorDotStack colors={selected.slice(0, MAX_STACKED_DOTS).map(character => character.color)} />
            <span>{`${selected.length} characters`}</span>
        </>
    );
};

/**
 * Filters the Board to scenes with chosen characters. The button shows the choice (none, one,
 * several); while filtering, a separate button beside it clears the filter without opening the panel.
 */
export const BoardCharacterFilter = ({
    characters,
    selectedIds,
    onChange,
}: BoardCharacterFilterProps) => {
    const [query, setQuery] = useState('');
    const triggerRef = useRef<HTMLButtonElement>(null);
    // Ids no longer in the list (a deleted character) are ignored, so the button never shows an empty choice.
    const selected = characters.filter(character => selectedIds.includes(character.id));
    const needle = query.trim().toLowerCase();
    const visible = characters.filter(character => character.name.toLowerCase().includes(needle));
    const isFiltering = selected.length > 0;

    // The cross leaves the page as it is pressed; focus goes back to the button it sat in.
    const clearFromCross = () => {
        onChange([]);
        triggerRef.current?.focus();
    };

    const toggle = (id: string, isChosen: boolean) => {
        const others = selected.map(character => character.id).filter(selectedId => selectedId !== id);

        onChange(isChosen ? [...others, id] : others);
    };

    return (
        <div className={clsx(styles.group, isFiltering && styles.active)}>
            <BoardMenuButton
                panelLabel="Filter by character"
                label={isFiltering ? `Characters: ${selected.map(character => character.name).join(', ')}` : 'Characters'}
                isGrouped
                hasTrailingSlot={isFiltering}
                triggerRef={triggerRef}
                onOpenChange={() => setQuery('')}
                panel={(
                    <>
                        <SearchInput
                            size="sm"
                            aria-label="Find character"
                            placeholder="Find character…"
                            value={query}
                            autoFocus
                            onChange={event => setQuery(event.target.value)}
                        />
                        {visible.length === 0 ? (
                            <p className={styles.empty}>No characters match.</p>
                        ) : (
                            <ul className={styles.list} aria-label="Characters">
                                {visible.map(character => {
                                    const isChosen = selectedIds.includes(character.id);

                                    return (
                                        <li key={character.id} className={clsx(styles.row, isChosen && styles.chosen)}>
                                            <Checkbox
                                                className={styles.check}
                                                isSelected={isChosen}
                                                onChange={isSelected => toggle(character.id, isSelected)}
                                            >
                                                <span className={styles.rowLabel}>
                                                    <ColorDot color={character.color} />
                                                    <span className={styles.name}>{character.name}</span>
                                                    <span className={styles.count}>{formatSceneCount(character.sceneCount)}</span>
                                                </span>
                                            </Checkbox>
                                        </li>
                                    );
                                })}
                            </ul>
                        )}
                        <div className={styles.footer}>
                            <Button
                                variant="ghost"
                                size="xs"
                                isDisabled={!isFiltering}
                                onPress={() => onChange([])}
                            >
                                Clear filter
                            </Button>
                        </div>
                    </>
                )}
            >
                <TriggerContent selected={selected} />
            </BoardMenuButton>
            {isFiltering ? (
                <IconButton
                    size="xs"
                    aria-label="Clear character filter"
                    className={styles.clear}
                    onPress={clearFromCross}
                >
                    <CloseIcon aria-hidden="true" />
                </IconButton>
            ) : null}
        </div>
    );
};
