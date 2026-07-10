import clsx from 'clsx';
import {
    type MouseEvent as ReactMouseEvent,
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
}

export const AttributeManagerModal = ({
    isOpen,
    title = 'Attribute manager',
    tabs,
    activeTabId,
    onClose,
    onSelectTab,
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

    const handleBackdropClick = useCallback(() => {
        onClose();
    }, [onClose]);
    const handleModalClick = useCallback((event: ReactMouseEvent<HTMLDivElement>) => {
        event.stopPropagation();
    }, []);
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
                aria-label="Attribute manager"
                onClick={handleModalClick}
            >
                <header className={styles.header}>
                    <h2 className={styles.title}>{title}</h2>
                    <button
                        type="button"
                        className={styles.closeButton}
                        onClick={onClose}
                        aria-label="Close attribute manager"
                    >
                        Close
                    </button>
                </header>
                <nav className={styles.tabs} aria-label="Attribute manager sections">
                    <div className={styles.tabList}>
                        {tabs.map(tab => {
                            const isActive = tab.id === activeTabId;

                            return (
                                <button
                                    key={tab.id}
                                    type="button"
                                    id={`attribute-manager-tab-${tab.id}`}
                                    className={clsx(styles.tab, isActive && styles.active)}
                                    aria-current={isActive ? 'page' : undefined}
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
                    aria-labelledby={`attribute-manager-tab-${activeTab.id}`}
                />
            </div>
        </div>
    );
};
