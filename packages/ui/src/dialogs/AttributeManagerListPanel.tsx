import clsx from 'clsx';
import {
    type ReactNode,
    useEffect,
    useState,
} from 'react';

import styles from './AttributeManagerListPanel.module.css';

export interface AttributeManagerListItem {
    id: string,
    number: string,
    title: string,
    subtitle?: string | null,
    /** Trailing glyph, e.g. a cue-kind icon. */
    icon?: ReactNode,
    detailMetadata?: Array<{
        label: string,
        value: string,
    }>,
}

export interface AttributeManagerListPanelProps {
    items: AttributeManagerListItem[],
    initialSelectedItemId?: string | null,
    isLoading?: boolean,
    /** Singular label shown above the selected item's title, e.g. "Scene". */
    detailTypeLabel: string,
    /** Shown in the list column when there is nothing to list. */
    emptyListLabel: string,
    /** Shown in the detail column when no item is selected. */
    emptyDetailLabel: string,
    /** Muted placeholder in the detail body while its contents are not built yet. */
    detailPlaceholder: string,
    /** When provided, renders custom detail-body content for the selected item instead of the placeholder. */
    renderDetail?: (item: AttributeManagerListItem) => ReactNode,
}

export const AttributeManagerListPanel = ({
    items,
    initialSelectedItemId,
    isLoading = false,
    detailTypeLabel,
    emptyListLabel,
    emptyDetailLabel,
    detailPlaceholder,
    renderDetail,
}: AttributeManagerListPanelProps) => {
    const [selectedItemId, setSelectedItemId] = useState<string | null>(
        initialSelectedItemId ?? null,
    );
    const selectedItem = items.find(item => item.id === selectedItemId) ?? null;

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
                                <span className={styles.itemNumber}>{item.number}</span>
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
                    {items.length === 0 ? (
                        <p className={styles.emptyList}>{listStatus}</p>
                    ) : null}
                </div>
            </aside>
            <section className={styles.detail} aria-label={`${detailTypeLabel} detail`}>
                {selectedItem ? (
                    <>
                        <header className={styles.detailHeader}>
                            <div className={styles.detailIdentity}>
                                <p className={styles.detailType}>{detailTypeLabel}</p>
                                <h3 className={styles.detailTitle}>{selectedItem.title}</h3>
                            </div>
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
