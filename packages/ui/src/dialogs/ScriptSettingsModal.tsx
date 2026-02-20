import clsx from 'clsx';
import {
    type MouseEvent as ReactMouseEvent,
    useCallback,
    useEffect,
} from 'react';

import styles from './ScriptSettingsModal.module.css';
import type {ScriptSettingsModalProps} from './types';
export type {
    SettingsNavGroup,
    SettingsNavItem,
    SettingsNavSubItem,
} from './types';

export const ScriptSettingsModal = ({
    isOpen,
    title = 'Settings',
    groups,
    activePanelId,
    expandedItemIds,
    onClose,
    onSelectPanel,
    onToggleExpand,
    children,
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
                                                        className={clsx(
                                                            styles.navItem,
                                                            isActive && styles.navItemActive,
                                                        )}
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
                                                    <svg
                                                        viewBox="0 0 24 24"
                                                        className={arrowClass}
                                                        aria-hidden="true"
                                                        focusable="false"
                                                    >
                                                        <path d="m9 6 6 6-6 6" />
                                                    </svg>
                                                </button>
                                                {isExpanded ? (
                                                    <ul className={styles.subList}>
                                                        {item.subItems.map(subItem => {
                                                            const isSubActive = activePanelId === subItem.panelId;

                                                            return (
                                                                <li key={subItem.id}>
                                                                    <button
                                                                        type="button"
                                                                        className={clsx(
                                                                            styles.subItem,
                                                                            isSubActive && styles.subItemActive,
                                                                        )}
                                                                        onClick={() => onSelectPanel(subItem.panelId)}
                                                                    >
                                                                        <span className={styles.subItemContent}>
                                                                            {subItem.icon ? (
                                                                                <span
                                                                                    className={styles.subItemIcon}
                                                                                    aria-hidden="true"
                                                                                >
                                                                                    {subItem.icon}
                                                                                </span>
                                                                            ) : null}
                                                                            <span>{subItem.label}</span>
                                                                        </span>
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
                        {children}
                    </section>
                </div>
            </div>
        </div>
    );
};
