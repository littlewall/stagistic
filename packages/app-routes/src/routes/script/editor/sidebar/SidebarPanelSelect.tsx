import {useExclusiveOverlay} from '@stagistic/editor';
import {ChevronDownIcon} from '@stagistic/ui';
import {
    useEffect,
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

    useExclusiveOverlay(isOpen, () => setIsOpen(false));

    useEffect(() => {
        if (!isOpen) {
            return;
        }

        const onPointerDown = (event: MouseEvent | PointerEvent) => {
            if (!selectRef.current) {
                return;
            }

            if (selectRef.current.contains(event.target as Node)) {
                return;
            }

            setIsOpen(false);
        };
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                setIsOpen(false);
            }
        };

        document.addEventListener('pointerdown', onPointerDown);
        document.addEventListener('keydown', onKeyDown);

        return () => {
            document.removeEventListener('pointerdown', onPointerDown);
            document.removeEventListener('keydown', onKeyDown);
        };
    }, [isOpen]);

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
                    className={side === 'left' ? styles.menuLeft : styles.menuRight}
                    style={{positionAnchor: anchorName}}
                    role="listbox"
                    aria-label={ariaLabel}
                >
                    {panels.map(panel => (
                        <button
                            key={panel.id}
                            type="button"
                            role="option"
                            aria-selected={panel.id === selectedPanelId}
                            className={panel.id === selectedPanelId ? `${styles.item} ${styles.active}` : styles.item}
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
