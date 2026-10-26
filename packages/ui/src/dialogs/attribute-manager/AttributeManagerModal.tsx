import clsx from 'clsx';
import type {ReactNode} from 'react';

import {ModalDialog} from '../modal/ModalDialog';
import type {ModalFocusRestoreOptions} from '../modal/modalFocusTypes';
import styles from './AttributeManagerModal.module.css';

export interface AttributeManagerTab {
    id: string,
    label: string,
}

export interface AttributeManagerModalProps extends ModalFocusRestoreOptions {
    isOpen: boolean,
    title?: string,
    tabs: AttributeManagerTab[],
    activeTabId: string,
    onClose: () => void,
    onSelectTab: (tabId: string) => void,
    /** A strip between the header and the tabs. */
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
    returnFocus,
    fallbackFocus,
}: AttributeManagerModalProps) => {
    const activeTab = tabs.find(tab => tab.id === activeTabId) ?? tabs[0];

    return (
        <ModalDialog
            isOpen={isOpen}
            onClose={onClose}
            ariaLabel={title}
            panelClassName={styles.modal}
            dialogClassName={styles.backdrop}
            returnFocus={returnFocus}
            fallbackFocus={fallbackFocus}
            initialFocus={dialog => dialog.querySelector('[role="tab"][aria-selected="true"]')}
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
                                data-modal-initial-focus={isActive ? '' : undefined}
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
        </ModalDialog>
    );
};
