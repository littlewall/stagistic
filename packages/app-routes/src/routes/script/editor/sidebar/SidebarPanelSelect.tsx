import {useExclusiveOverlay} from '@stagistic/editor';
import {
    ChevronDownIcon, clsx, useAnchoredMenuHeight, useDropdownDismiss,
} from '@stagistic/ui';
import {
    useId,
    useMemo,
    useRef,
    useState,
} from 'react';

import styles from './SidebarPanelSelect.module.css';
import type {
    SidebarPanel,
    SidebarPanelId,
    SidebarSide,
} from './types';

interface SidebarPanelSelectProps {
    side: SidebarSide,
    panels: readonly SidebarPanel[],
    selectedPanelId: SidebarPanelId,
    onSelectPanel: (panelId: SidebarPanelId) => void,
    ariaLabel: string,
}

export const SidebarPanelSelect = ({
    side,
    panels,
    selectedPanelId,
    onSelectPanel,
    ariaLabel,
}: SidebarPanelSelectProps) => {
    const [isOpen, setIsOpen] = useState(false);
    const selectRef = useRef<HTMLDivElement | null>(null);
    const rawId = useId();
    const anchorName = `--spa-${rawId.replace(/[^a-zA-Z0-9]/g, '')}` as const;
    const selectedPanel = useMemo(
        () => panels.find(panel => panel.id === selectedPanelId) ?? panels[0] ?? null,
        [panels, selectedPanelId],
    );
    const menuHeightStyle = useAnchoredMenuHeight({
        anchorRef: selectRef,
        isOpen,
    });

    useExclusiveOverlay(isOpen, () => setIsOpen(false));
    useDropdownDismiss(isOpen, setIsOpen, selectRef);

    return (
        <div className={styles.select} ref={selectRef}>
            <button
                type="button"
                className={styles.button}
                style={{anchorName}}
                aria-label={ariaLabel}
                aria-haspopup="listbox"
                aria-expanded={isOpen}
                onMouseDown={event => {
                    event.preventDefault();
                    setIsOpen(previous => !previous);
                }}
            >
                <span className={styles.label}>{selectedPanel?.label ?? ''}</span>
                <ChevronDownIcon
                    aria-hidden="true"
                    className={styles.chevron}
                />
            </button>
            {isOpen ? (
                <div
                    className={clsx(
                        styles.menu,
                        side === 'right' && styles.right,
                    )}
                    style={{
                        positionAnchor: anchorName,
                        ...menuHeightStyle,
                    }}
                    role="listbox"
                    aria-label={ariaLabel}
                >
                    {panels.map(panel => (
                        <button
                            key={panel.id}
                            type="button"
                            role="option"
                            aria-selected={panel.id === selectedPanelId}
                            className={clsx(styles.item, panel.id === selectedPanelId && styles.active)}
                            onMouseDown={event => {
                                event.preventDefault();
                                onSelectPanel(panel.id);
                                setIsOpen(false);
                            }}
                        >
                            {panel.label}
                        </button>
                    ))}
                </div>
            ) : null}
        </div>
    );
};
