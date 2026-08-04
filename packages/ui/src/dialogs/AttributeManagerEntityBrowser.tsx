import clsx from 'clsx';
import {
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
import styles from './AttributeManagerCharactersPanel.module.css';

export interface AttributeManagerBrowserItem {
    id: string,
    name: string,
    color: string | null,
}

interface AttributeManagerEntityBrowserProps {
    items: AttributeManagerBrowserItem[],
    selectedItemId: string | null,
    listLabel: string,
    searchLabel: string,
    createAriaLabel: string,
    createTooltipLabel: string,
    emptyLabel: string,
    loadingLabel: string,
    noMatchesLabel: string,
    isLoading: boolean,
    isCreateDisabled: boolean,
    onSelectItem: (itemId: string) => void,
    onCreate: () => void,
}

export const AttributeManagerEntityBrowser = ({
    items,
    selectedItemId,
    listLabel,
    searchLabel,
    createAriaLabel,
    createTooltipLabel,
    emptyLabel,
    loadingLabel,
    noMatchesLabel,
    isLoading,
    isCreateDisabled,
    onSelectItem,
    onCreate,
}: AttributeManagerEntityBrowserProps) => {
    const [searchQuery, setSearchQuery] = useState('');
    const normalizedSearchQuery = searchQuery.trim().toLocaleLowerCase();
    const visibleItems = useMemo(() => {
        if (!normalizedSearchQuery) {
            return items;
        }

        return items.filter(item => item.name.toLocaleLowerCase().includes(normalizedSearchQuery));
    }, [items, normalizedSearchQuery]);
    const listStatus = isLoading
        ? loadingLabel
        : normalizedSearchQuery
            ? noMatchesLabel
            : emptyLabel;

    return (
        <aside className={styles.browser} aria-label={listLabel}>
            <div className={styles.searchRow}>
                <div className={styles.searchField}>
                    <SearchIcon className={styles.searchIcon} aria-hidden="true" />
                    <Input
                        value={searchQuery}
                        onChange={event => setSearchQuery(event.target.value)}
                        placeholder={searchLabel}
                        aria-label={searchLabel}
                    />
                </div>
                <Tooltip label={createTooltipLabel} isDisabled={isCreateDisabled}>
                    <Button
                        className={styles.addButton}
                        variant="ghost"
                        size="sm"
                        isDisabled={isCreateDisabled}
                        aria-label={createAriaLabel}
                        onPress={onCreate}
                    >
                        <PlusIcon className={styles.actionIcon} aria-hidden="true" />
                    </Button>
                </Tooltip>
            </div>
            <div className={styles.browserList}>
                {visibleItems.map(item => {
                    const isSelected = item.id === selectedItemId;

                    return (
                        <button
                            key={item.id}
                            type="button"
                            className={clsx(styles.listItem, isSelected && styles.selected)}
                            aria-pressed={isSelected}
                            onClick={() => onSelectItem(item.id)}
                        >
                            <span
                                className={styles.characterColor}
                                style={item.color ? {backgroundColor: item.color} : undefined}
                                aria-hidden="true"
                            />
                            <span className={styles.characterName}>{item.name}</span>
                        </button>
                    );
                })}
                {visibleItems.length === 0 ? (
                    <p className={styles.emptyList}>{listStatus}</p>
                ) : null}
            </div>
        </aside>
    );
};
