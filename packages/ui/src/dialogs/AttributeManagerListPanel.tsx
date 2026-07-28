import clsx from 'clsx';
import {
    type ReactNode,
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
import styles from './AttributeManagerListPanel.module.css';

export interface AttributeManagerListItem {
    id: string,
    number: string,
    title: string,
    group?: {
        id: string,
        label: string,
    },
    subtitle?: string | null,
    detailSubtitle?: string | null,
    /** Trailing glyph, e.g. a music-kind icon. */
    icon?: ReactNode,
    detailMetadata?: Array<{
        label: string,
        value: string,
    }>,
}

interface AttributeManagerListGroup {
    id: string,
    label: string | null,
    items: AttributeManagerListItem[],
}

const groupListItems = (items: AttributeManagerListItem[]): AttributeManagerListGroup[] => {
    return items.reduce<AttributeManagerListGroup[]>((groups, item) => {
        const groupId = item.group?.id ?? 'ungrouped';
        const currentGroup = groups.at(-1);

        if (currentGroup?.id === groupId) {
            currentGroup.items.push(item);

            return groups;
        }

        groups.push({
            id: groupId,
            label: item.group?.label ?? null,
            items: [item],
        });

        return groups;
    }, []);
};

export interface AttributeManagerListPanelProps {
    items: AttributeManagerListItem[],
    initialSelectedItemId?: string | null,
    isLoading?: boolean,
    /** Singular label shown above the selected item's title, e.g. "Scene". */
    detailTypeLabel: string,
    hideDetailTypeLabel?: boolean,
    wrapDetailTitle?: boolean,
    /** Shown in the list column when there is nothing to list. */
    emptyListLabel: string,
    /** Shown in the detail column when no item is selected. */
    emptyDetailLabel: string,
    /** Muted placeholder in the detail body while its contents are not built yet. */
    detailPlaceholder: string,
    search?: {
        ariaLabel: string,
        placeholder: string,
    },
    createAction?: {
        ariaLabel: string,
        tooltipLabel: string,
        onPress: () => void,
    },
    /** When provided, renders custom detail-body content for the selected item instead of the placeholder. */
    renderDetail?: (item: AttributeManagerListItem) => ReactNode,
    renderDetailAction?: (item: AttributeManagerListItem) => ReactNode,
}

export const AttributeManagerListPanel = ({
    items,
    initialSelectedItemId,
    isLoading = false,
    detailTypeLabel,
    hideDetailTypeLabel = false,
    wrapDetailTitle = false,
    emptyListLabel,
    emptyDetailLabel,
    detailPlaceholder,
    search,
    createAction,
    renderDetail,
    renderDetailAction,
}: AttributeManagerListPanelProps) => {
    const [selectedItemId, setSelectedItemId] = useState<string | null>(
        initialSelectedItemId ?? null,
    );
    const [searchQuery, setSearchQuery] = useState('');
    const selectedItem = items.find(item => item.id === selectedItemId) ?? null;
    const normalizedSearchQuery = searchQuery.trim().toLocaleLowerCase();
    const visibleItems = useMemo(() => {
        if (!normalizedSearchQuery) {
            return items;
        }

        return items.filter(item => item.title.toLocaleLowerCase().includes(normalizedSearchQuery));
    }, [items, normalizedSearchQuery]);
    const itemGroups = groupListItems(visibleItems);
    const hasToolbar = Boolean(search || createAction);

    useEffect(() => {
        const selectionStillExists = items.some(item => item.id === selectedItemId);

        if (selectionStillExists) {
            return;
        }

        const initialSelectionExists = items.some(item => item.id === initialSelectedItemId);

        setSelectedItemId(initialSelectionExists
            ? initialSelectedItemId ?? null
            : items[0]?.id ?? null);
    }, [
        initialSelectedItemId,
        items,
        selectedItemId,
    ]);

    const listStatus = isLoading ? 'Loading...' : emptyListLabel;

    return (
        <div className={styles.panel}>
            <aside className={styles.browser} aria-label={`${detailTypeLabel} list`}>
                {hasToolbar ? (
                    <div className={styles.searchRow}>
                        {search ? (
                            <div className={styles.searchField}>
                                <SearchIcon className={styles.searchIcon} aria-hidden="true" />
                                <Input
                                    value={searchQuery}
                                    onChange={event => setSearchQuery(event.target.value)}
                                    placeholder={search.placeholder}
                                    aria-label={search.ariaLabel}
                                />
                            </div>
                        ) : null}
                        {createAction ? (
                            <Tooltip label={createAction.tooltipLabel}>
                                <Button
                                    className={styles.addButton}
                                    variant="ghost"
                                    size="sm"
                                    aria-label={createAction.ariaLabel}
                                    onPress={createAction.onPress}
                                >
                                    <PlusIcon className={styles.actionIcon} aria-hidden="true" />
                                </Button>
                            </Tooltip>
                        ) : null}
                    </div>
                ) : null}
                <div className={clsx(styles.browserList, hasToolbar && styles.browserListWithToolbar)}>
                    {itemGroups.map(group => (
                        <div key={`${group.id}-${group.items[0]?.id}`} className={styles.itemGroup}>
                            {group.label ? (
                                <h4 className={styles.groupTitle}>{group.label}</h4>
                            ) : null}
                            {group.items.map(item => {
                                const isSelected = item.id === selectedItemId;

                                return (
                                    <button
                                        key={item.id}
                                        type="button"
                                        className={clsx(
                                            styles.listItem,
                                            !item.number && styles.listItemWithoutNumber,
                                            isSelected && styles.selected,
                                        )}
                                        aria-pressed={isSelected}
                                        onClick={() => setSelectedItemId(item.id)}
                                    >
                                        {item.number ? (
                                            <span className={styles.itemNumber}>{item.number}</span>
                                        ) : null}
                                        <span className={styles.itemTitle}>{item.title}</span>
                                        {item.subtitle ? (
                                            <span className={styles.itemSubtitle}>{item.subtitle}</span>
                                        ) : null}
                                        {item.icon ? (
                                            <span className={styles.itemIcon} aria-hidden="true">
                                                {item.icon}
                                            </span>
                                        ) : null}
                                    </button>
                                );
                            })}
                        </div>
                    ))}
                    {visibleItems.length === 0 ? (
                        <p className={styles.emptyList}>{listStatus}</p>
                    ) : null}
                </div>
            </aside>
            <section className={styles.detail} aria-label={`${detailTypeLabel} detail`}>
                {selectedItem ? (
                    <>
                        <header className={styles.detailHeader}>
                            <div className={styles.detailIdentity}>
                                {!hideDetailTypeLabel ? (
                                    <p className={styles.detailType}>{detailTypeLabel}</p>
                                ) : null}
                                <h3
                                    className={clsx(
                                        styles.detailTitle,
                                        wrapDetailTitle && styles.detailTitleWrapped,
                                    )}
                                >
                                    {selectedItem.title}
                                </h3>
                                {selectedItem.detailSubtitle ? (
                                    <p className={styles.detailSubtitle}>
                                        {selectedItem.detailSubtitle}
                                    </p>
                                ) : null}
                            </div>
                            <div className={styles.detailHeaderAside}>
                                {selectedItem.detailMetadata?.length ? (
                                    <dl className={styles.detailMetadata}>
                                        {selectedItem.detailMetadata.map(metadata => (
                                            <div key={metadata.label} className={styles.detailMetadataRow}>
                                                <dt>{metadata.label}:</dt>
                                                <dd>{metadata.value}</dd>
                                            </div>
                                        ))}
                                    </dl>
                                ) : null}
                                {renderDetailAction?.(selectedItem)}
                            </div>
                        </header>
                        <div className={styles.detailBody}>
                            {renderDetail
                                ? renderDetail(selectedItem)
                                : <p className={styles.detailPlaceholder}>{detailPlaceholder}</p>}
                        </div>
                    </>
                ) : (
                    <div className={styles.emptyDetail}>
                        <p>{emptyDetailLabel}</p>
                    </div>
                )}
            </section>
        </div>
    );
};
