import type {ReactNode} from 'react';
import {
    useEffect,
    useRef,
} from 'react';

import styles from './MusicPill.module.css';

interface MusicPillMenuPopoverProps {
    children: ReactNode,
    isOpen: boolean,
    onOpenChange: (isOpen: boolean) => void,
}

export const MusicPillMenuPopover = ({
    children,
    isOpen,
    onOpenChange,
}: MusicPillMenuPopoverProps) => {
    const menuRef = useRef<HTMLSpanElement>(null);

    useEffect(() => {
        const menu = menuRef.current;

        if (!menu) {
            return;
        }

        const handleToggle = (event: Event) => {
            if ((event as Event & {newState?: string}).newState === 'closed') {
                onOpenChange(false);
            }
        };
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                event.preventDefault();
                onOpenChange(false);
            }
        };

        menu.addEventListener('toggle', handleToggle);
        document.addEventListener('keydown', handleKeyDown, true);

        return () => {
            menu.removeEventListener('toggle', handleToggle);
            document.removeEventListener('keydown', handleKeyDown, true);
        };
    }, [onOpenChange]);

    useEffect(() => {
        const menu = menuRef.current;

        if (!menu || menu.matches(':popover-open') === isOpen) {
            return;
        }

        if (isOpen) {
            const frame = window.requestAnimationFrame(() => {
                if (!menu.matches(':popover-open')) {
                    menu.showPopover();
                }
            });

            return () => window.cancelAnimationFrame(frame);
        }

        menu.hidePopover();

        return undefined;
    }, [isOpen]);

    return (
        <span
            ref={menuRef}
            className={styles.menu}
            data-music-menu="start"
            popover="manual"
        >
            {children}
        </span>
    );
};
