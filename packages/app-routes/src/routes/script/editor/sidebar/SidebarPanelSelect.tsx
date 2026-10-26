import {useExclusiveOverlay} from '@stagistic/editor';
import {Select, type SelectOption} from '@stagistic/ui';
import {
    useMemo,
    useState,
} from 'react';

import styles from './SidebarPanelSelect.module.css';
import type {SidebarPanel, SidebarPanelId} from './types';

interface SidebarPanelSelectProps {
    panels: readonly SidebarPanel[],
    selectedPanelId: SidebarPanelId,
    onSelectPanel: (panelId: SidebarPanelId) => void,
    ariaLabel: string,
}

export const SidebarPanelSelect = ({
    panels,
    selectedPanelId,
    onSelectPanel,
    ariaLabel,
}: SidebarPanelSelectProps) => {
    const [isOpen, setIsOpen] = useState(false);
    const options = useMemo<SelectOption[]>(
        () => panels.map(panel => ({value: panel.id, label: panel.label})),
        [panels],
    );

    useExclusiveOverlay(isOpen, () => setIsOpen(false));

    return (
        <Select
            className={styles.select}
            variant="panel"
            // The select sits at the left edge of either panel, so the free space is always to its right.
            align="start"
            preserveFocus
            value={selectedPanelId}
            options={options}
            ariaLabel={ariaLabel}
            menuAriaLabel={ariaLabel}
            isOpen={isOpen}
            onIsOpenChange={setIsOpen}
            onChange={value => onSelectPanel(String(value))}
        />
    );
};
