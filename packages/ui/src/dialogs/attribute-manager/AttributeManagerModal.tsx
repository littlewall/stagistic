import clsx from 'clsx';
import {
    type MouseEvent as ReactMouseEvent,
    type ReactNode,
    useCallback,
    useEffect,
} from 'react';

import styles from './AttributeManagerModal.module.css';

export interface AttributeManagerTab {
    id: string,
    label: string,
}

export interface AttributeManagerModalProps {
    isOpen: boolean,
    title?: string,
    tabs: AttributeManagerTab[],
    activeTabId: string,
    onClose: () => void,
    onSelectTab: (tabId: string) => void,
    /** A strip between the header and the tabs, e.g. the read-only notice of a stored draft or version. */
    notice?: ReactNode,
    children?: ReactNode,
}

export const AttributeManagerModal = ({
    isOpen,
    title = 'Attribute manager',
    tabs,
    activeTabId,
    onClose,
    onSelectTab,
    notice,
    children,
}: AttributeManagerModalProps) => {
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

    const handleBackdropClick = useCallback((event: ReactMouseEvent<HTMLDivElement>) => {
        if (event.target === event.currentTarget) {
            onClose();
        }
    }, [onClose]);
    const activeTab = tabs.find(tab => tab.id === activeTabId) ?? tabs[0];

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
                aria-label={title}
            >
                <header className={styles.header}>
                    <h2 className={styles.title}>{title}</h2>
                    <button
                        type="button"
                        className={styles.closeButton}
                        onClick={onClose}
                        aria-label={`Close ${title.toLocaleLowerCase()}`}
                    >
                        Close
                    </button>
                </header>
                {notice ? <div className={styles.notice}>{notice}</div> : null}
                <nav
                    className={styles.tabs}
                    aria-label={`${title} sections`}
                >
                    <div
                        className={styles.tabList}
                        role="tablist"
                    >
                        {tabs.map(tab => {
                            const isActive = tab.id === activeTabId;

                            return (
                                <button
                                    key={tab.id}
                                    type="button"
                                    id={`attribute-manager-tab-${tab.id}`}
                                    className={clsx(styles.tab, isActive && styles.active)}
                                    role="tab"
                                    aria-selected={isActive}
                                    aria-controls={`attribute-manager-panel-${tab.id}`}
                                    onClick={() => onSelectTab(tab.id)}
                                >
                                    {tab.label}
                                </button>
                            );
                        })}
                    </div>
                </nav>
                <section
                    id={`attribute-manager-panel-${activeTab.id}`}
                    className={styles.content}
                    role="tabpanel"
                    aria-labelledby={`attribute-manager-tab-${activeTab.id}`}
                >
                    {children}
                </section>
            </div>
        </div>
    );
};
