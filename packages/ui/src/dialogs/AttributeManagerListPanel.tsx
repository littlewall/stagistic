import clsx from 'clsx';
import {
    type ReactNode,
    useEffect,
    useState,
} from 'react';

import styles from './AttributeManagerListPanel.module.css';

export interface AttributeManagerListItem {
    id: string,
    title: string,
    subtitle?: string | null,
    color?: string | null,
    /** Leading glyph shown instead of the color dot (e.g. a cue-kind icon). */
    icon?: ReactNode,
}

export interface AttributeManagerListPanelProps {
    items: AttributeManagerListItem[],
    isLoading?: boolean,
    /** Singular label shown above the selected item's title, e.g. "Scene". */
    detailTypeLabel: string,
    /** Shown in the list column when there is nothing to list. */
    emptyListLabel: string,
    /** Shown in the detail column when no item is selected. */
    emptyDetailLabel: string,
    /** Muted placeholder in the detail body while its contents are not built yet. */
    detailPlaceholder: string,
}

export const AttributeManagerListPanel = ({
    items,
    isLoading = false,
    detailTypeLabel,
    emptyListLabel,
    emptyDetailLabel,
    detailPlaceholder,
}: AttributeManagerListPanelProps) => {
    const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
    const selectedItem = items.find(item => item.id === selectedItemId) ?? null;

    useEffect(() => {
        const selectionStillExists = items.some(item => item.id === selectedItemId);

        if (selectionStillExists) {
            return;
        }

        setSelectedItemId(items[0]?.id ?? null);
    }, [items, selectedItemId]);

    const listStatus = isLoading ? 'Loading...' : emptyListLabel;

    return (
        <div className={styles.panel}>
            <aside className={styles.browser} aria-label={`${detailTypeLabel} list`}>
                <div className={styles.browserList}>
                    {items.map(item => {
                        const isSelected = item.id === selectedItemId;

                        return (
                            <button
                                key={item.id}
                                type="button"
                                className={clsx(styles.listItem, isSelected && styles.selected)}
                                aria-pressed={isSelected}
                                onClick={() => setSelectedItemId(item.id)}
                            >
                                {item.icon ? (
                                    <span className={styles.itemIcon} aria-hidden="true">
                                        {item.icon}
                                    </span>
                                ) : (
                                    <span
                                        className={styles.itemDot}
                                        style={item.color ? {backgroundColor: item.color} : undefined}
                                        aria-hidden="true"
                                    />
                                )}
                                <span className={styles.itemTitle}>{item.title}</span>
                                {item.subtitle ? (
                                    <span className={styles.itemSubtitle}>{item.subtitle}</span>
                                ) : null}
                            </button>
                        );
                    })}
                    {items.length === 0 ? (
                        <p className={styles.emptyList}>{listStatus}</p>
                    ) : null}
                </div>
            </aside>
            <section className={styles.detail} aria-label={`${detailTypeLabel} detail`}>
                {selectedItem ? (
                    <>
                        <header className={styles.detailHeader}>
                            <p className={styles.detailType}>{detailTypeLabel}</p>
                            <h3 className={styles.detailTitle}>{selectedItem.title}</h3>
                        </header>
                        <div className={styles.detailBody}>
                            <p className={styles.detailPlaceholder}>{detailPlaceholder}</p>
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
