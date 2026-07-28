import clsx from 'clsx';

import {ModalDialog} from './ModalDialog';
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
    return (
        <ModalDialog
            isOpen={isOpen}
            onClose={onClose}
            ariaLabel="Script settings"
            panelClassName={styles.modal}
        >
            <header className={styles.header}>
                <h2 className={styles.title}>{title}</h2>
                <button
                    autoFocus
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
                                                        isActive && styles.active,
                                                    )}
                                                    onClick={() => onSelectPanel(item.panelId)}
                                                    aria-current={isActive ? 'page' : undefined}
                                                >
                                                    {item.label}
                                                </button>
                                            </li>
                                        );
                                    }

                                    const isExpanded = expandedItemIds.includes(item.id);
                                    const arrowClass = clsx(styles.expandArrow, isExpanded && styles.open);

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
                                                                        isSubActive && styles.active,
                                                                    )}
                                                                    onClick={() => onSelectPanel(subItem.panelId)}
                                                                    aria-current={isSubActive ? 'page' : undefined}
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
        </ModalDialog>
    );
};
