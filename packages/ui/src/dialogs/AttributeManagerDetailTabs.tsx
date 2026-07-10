import clsx from 'clsx';

import styles from './AttributeManagerCharactersPanel.module.css';

export interface AttributeManagerDetailTab {
    id: string,
    label: string,
}

interface AttributeManagerDetailTabsProps {
    tabs: AttributeManagerDetailTab[],
    activeTabId: string,
    ariaLabel: string,
    onSelectTab: (tabId: string) => void,
}

export const AttributeManagerDetailTabs = ({
    tabs,
    activeTabId,
    ariaLabel,
    onSelectTab,
}: AttributeManagerDetailTabsProps) => (
    <nav className={styles.detailNavigation} aria-label={ariaLabel}>
        <div className={styles.detailTabs} role="tablist">
            {tabs.map(tab => {
                const isActive = tab.id === activeTabId;

                return (
                    <button
                        key={tab.id}
                        type="button"
                        className={clsx(styles.detailTab, isActive && styles.active)}
                        role="tab"
                        aria-selected={isActive}
                        onClick={() => onSelectTab(tab.id)}
                    >
                        {tab.label}
                    </button>
                );
            })}
        </div>
    </nav>
);
