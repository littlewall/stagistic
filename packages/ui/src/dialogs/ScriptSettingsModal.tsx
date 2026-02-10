import {
    type MouseEvent as ReactMouseEvent,
    type ReactNode,
    useCallback,
    useEffect,
} from 'react';

import styles from './ScriptSettingsModal.module.css';

export type SettingsNavSubItem = {
    id: string,
    label: string,
    panelId: string,
};

type SettingsNavLinkItem = {
    id: string,
    label: string,
    panelId: string,
};

type SettingsNavExpandableItem = {
    id: string,
    label: string,
    subItems: SettingsNavSubItem[],
};

export type SettingsNavItem = ({
    kind: 'item',
} & SettingsNavLinkItem) | ({
    kind: 'expandable',
} & SettingsNavExpandableItem);

export type SettingsNavGroup = {
    id: string,
    label: string,
    items: SettingsNavItem[],
};

type ScriptSettingsModalProps = {
    isOpen: boolean,
    title?: string,
    groups: SettingsNavGroup[],
    activePanelId: string,
    expandedItemIds: string[],
    onClose: () => void,
    onSelectPanel: (panelId: string) => void,
    onToggleExpand: (itemId: string) => void,
    renderPanel: (panelId: string) => ReactNode,
};

export const ScriptSettingsModal = ({
    isOpen,
    title = 'Settings',
    groups,
    activePanelId,
    expandedItemIds,
    onClose,
    onSelectPanel,
    onToggleExpand,
    renderPanel,
}: ScriptSettingsModalProps) => {
    useEffect(() => {
        if (!isOpen) {
            return undefined;
        }

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                onClose();
            }
        };

        window.addEventListener('keydown', handleKeyDown);

        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose]);

    const handleBackdropClick = useCallback(() => {
        onClose();
    }, [onClose]);
    const handleModalClick = useCallback((event: ReactMouseEvent<HTMLDivElement>) => {
        event.stopPropagation();
    }, []);

    if (!isOpen) {
        return null;
    }

    return (
        <div
            className={styles.backdrop}
            role="presentation"
            onClick={handleBackdropClick}
        >
            <div
                className={styles.modal}
                role="dialog"
                aria-modal="true"
                aria-label="Script settings"
                onClick={handleModalClick}
            >
                <header className={styles.header}>
                    <h2 className={styles.title}>{title}</h2>
                    <button
                        type="button"
                        className={styles.closeButton}
                        onClick={onClose}
                        aria-label="Close settings"
                    >
                        Close
                    </button>
                </header>
                <div className={styles.body}>
                    <aside className={styles.sidebar} aria-label="Settings sections">
                        {groups.map(group => (
                            <section key={group.id} className={styles.group}>
                                <h3 className={styles.groupLabel}>{group.label}</h3>
                                <ul className={styles.navList}>
                                    {group.items.map(item => {
                                        if (item.kind === 'item') {
                                            const isActive = activePanelId === item.panelId;

                                            return (
                                                <li key={item.id}>
                                                    <button
                                                        type="button"
                                                        className={isActive ? styles.navItemActive : styles.navItem}
                                                        onClick={() => onSelectPanel(item.panelId)}
                                                    >
                                                        {item.label}
                                                    </button>
                                                </li>
                                            );
                                        }

                                        const isExpanded = expandedItemIds.includes(item.id);
                                        const arrowClass = isExpanded ? styles.expandArrowOpen : styles.expandArrow;

                                        return (
                                            <li key={item.id}>
                                                <button
                                                    type="button"
                                                    className={styles.navExpandButton}
                                                    onClick={() => onToggleExpand(item.id)}
                                                    aria-expanded={isExpanded}
                                                >
                                                    <span>{item.label}</span>
                                                    <span className={arrowClass} aria-hidden="true">▸</span>
                                                </button>
                                                {isExpanded ? (
                                                    <ul className={styles.subList}>
                                                        {item.subItems.map(subItem => {
                                                            const isSubActive = activePanelId === subItem.panelId;

                                                            return (
                                                                <li key={subItem.id}>
                                                                    <button
                                                                        type="button"
                                                                        className={isSubActive
                                                                            ? styles.subItemActive
                                                                            : styles.subItem}
                                                                        onClick={() => onSelectPanel(subItem.panelId)}
                                                                    >
                                                                        {subItem.label}
                                                                    </button>
                                                                </li>
                                                            );
                                                        })}
                                                    </ul>
                                                ) : null}
                                            </li>
                                        );
                                    })}
                                </ul>
                            </section>
                        ))}
                    </aside>
                    <section className={styles.content}>
                        {renderPanel(activePanelId)}
                    </section>
                </div>
            </div>
        </div>
    );
};
