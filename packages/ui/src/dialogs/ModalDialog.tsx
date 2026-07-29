import {clsx} from 'clsx';
import {
    type KeyboardEvent as ReactKeyboardEvent,
    type MouseEvent as ReactMouseEvent,
    type ReactNode,
    type SyntheticEvent,
    useCallback,
    useEffect,
    useRef,
} from 'react';

import styles from './ModalDialog.module.css';

const FOCUSABLE_SELECTOR = [
    'button:not([disabled])',
    'input:not([disabled])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    'a[href]',
    '[tabindex]:not([tabindex="-1"])',
].join(',');

interface ModalDialogProps {
    isOpen: boolean,
    onClose: () => void,
    ariaLabel: string,
    children: ReactNode,
    panelClassName?: string,
}

export const ModalDialog = ({
    isOpen,
    onClose,
    ariaLabel,
    children,
    panelClassName,
}: ModalDialogProps) => {
    const dialogRef = useRef<HTMLDialogElement | null>(null);
    const restoreFocusRef = useRef<HTMLElement | null>(null);

    useEffect(() => {
        const dialog = dialogRef.current;

        if (!dialog) {
            return;
        }

        if (isOpen && !dialog.open) {
            restoreFocusRef.current = document.activeElement instanceof HTMLElement
                ? document.activeElement
                : null;
            dialog.showModal();
        }

        if (!isOpen && dialog.open) {
            dialog.close();
            restoreFocusRef.current?.focus();
            restoreFocusRef.current = null;
        }
    }, [isOpen]);

    useEffect(() => {
        return () => {
            restoreFocusRef.current?.focus();
        };
    }, []);

    const mouseDownTargetRef = useRef<EventTarget | null>(null);

    const handleCancel = useCallback((event: SyntheticEvent) => {
        event.preventDefault();
        onClose();
    }, [onClose]);

    const handleMouseDown = useCallback((event: ReactMouseEvent<HTMLDialogElement>) => {
        mouseDownTargetRef.current = event.target;
    }, []);

    const handleClick = useCallback((event: ReactMouseEvent<HTMLDialogElement>) => {
        if (
            event.target === dialogRef.current &&
            mouseDownTargetRef.current === dialogRef.current
        ) {
            onClose();
        }
    }, [onClose]);

    const handleKeyDown = useCallback((event: ReactKeyboardEvent<HTMLDialogElement>) => {
        if (event.key !== 'Tab') {
            return;
        }

        const dialog = dialogRef.current;

        if (!dialog) {
            return;
        }

        const focusableElements = Array
            .from(dialog.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR))
            .filter(element => !element.hidden && element.getAttribute('aria-hidden') !== 'true');
        const firstElement = focusableElements.at(0);
        const lastElement = focusableElements.at(-1);

        if (!firstElement || !lastElement) {
            event.preventDefault();
            dialog.focus();

            return;
        }

        if (event.shiftKey && document.activeElement === firstElement) {
            event.preventDefault();
            lastElement.focus();

            return;
        }

        if (!event.shiftKey && document.activeElement === lastElement) {
            event.preventDefault();
            firstElement.focus();
        }
    }, []);

    return (
        <dialog
            ref={dialogRef}
            className={styles.dialog}
            aria-label={ariaLabel}
            onCancel={handleCancel}
            onMouseDown={handleMouseDown}
            onClick={handleClick}
            onKeyDown={handleKeyDown}
        >
            <div className={clsx(panelClassName, styles.panel)}>
                {children}
            </div>
        </dialog>
    );
};
