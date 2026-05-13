import {
    useEffect,
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
    const selectedPanel = useMemo(
        () => panels.find(panel => panel.id === selectedPanelId) ?? panels[0] ?? null,
        [panels, selectedPanelId],
    );

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
                aria-label={ariaLabel}
                aria-haspopup="listbox"
                aria-expanded={isOpen}
                onMouseDown={event => {
                    event.preventDefault();
                    setIsOpen(previous => !previous);
                }}
            >
                <span className={styles.label}>{selectedPanel?.label ?? ''}</span>
                <svg
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                    focusable="false"
                    className={styles.chevron}
                >
                    <path d="m6 9 6 6 6-6" />
                </svg>
            </button>
            {isOpen ? (
                <div
                    className={side === 'left' ? styles.menuLeft : styles.menuRight}
                    role="listbox"
                    aria-label={ariaLabel}
                >
                    {panels.map(panel => (
                        <button
                            key={panel.id}
                            type="button"
                            role="option"
                            aria-selected={panel.id === selectedPanelId}
                            className={panel.id === selectedPanelId ? styles.itemActive : styles.item}
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
