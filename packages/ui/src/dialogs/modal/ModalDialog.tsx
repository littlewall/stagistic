import {clsx} from 'clsx';
import {
    type ReactNode,
    type SyntheticEvent,
    useCallback,
    useEffect,
    useLayoutEffect,
    useRef,
    useState,
} from 'react';
import {UNSAFE_PortalProvider} from 'react-aria';

import styles from './ModalDialog.module.css';
import {
    createModalFocusSession,
    focusModalInitial,
    getModalTabStops,
    type ModalFocusSession,
    restoreModalFocus,
} from './modalFocus';
import type {ModalFocusRestoreOptions, ModalInitialFocusTarget} from './modalFocusTypes';

interface ModalDialogProps extends ModalFocusRestoreOptions {
    isOpen: boolean,
    onClose: () => void,
    ariaLabel: string,
    children: ReactNode,
    panelClassName?: string,
    dialogClassName?: string,
    initialFocus?: ModalInitialFocusTarget,
    selectInitialFocus?: boolean,
}

export const ModalDialog = ({
    isOpen,
    onClose,
    ariaLabel,
    children,
    panelClassName,
    dialogClassName,
    initialFocus,
    selectInitialFocus = false,
    returnFocus,
    fallbackFocus,
}: ModalDialogProps) => {
    const dialogRef = useRef<HTMLDialogElement | null>(null);
    const focusSessionRef = useRef<ModalFocusSession | null>(null);
    const [isMounted, setIsMounted] = useState(isOpen);

    if (isOpen && !isMounted) {
        setIsMounted(true);
    }

    const closeAndRestore = useCallback((dialog: HTMLDialogElement | null) => {
        const session = focusSessionRef.current;

        if (!dialog || !session) {
            return;
        }

        focusSessionRef.current = null;
        dialog.close();
        restoreModalFocus(dialog, session);
    }, []);

    useLayoutEffect(() => {
        const dialog = dialogRef.current;

        if (!dialog) {
            return;
        }

        if (isOpen && !dialog.open) {
            const session = createModalFocusSession(dialog, {returnFocus, fallbackFocus});

            focusSessionRef.current = session;

            // Align native restoration with the explicit contract, including on WebKit.
            if (session.hasExplicitTarget) {
                restoreModalFocus(dialog, session);
            }

            dialog.showModal();
            focusModalInitial(dialog, initialFocus, selectInitialFocus);
        }

        if (!isOpen && dialog.open) {
            closeAndRestore(dialog);
            setIsMounted(false);
        }
    }, [
        isOpen,
        initialFocus,
        selectInitialFocus,
        returnFocus,
        fallbackFocus,
        closeAndRestore,
    ]);

    useLayoutEffect(() => {
        if (!isMounted) {
            return;
        }

        const dialog = dialogRef.current;

        return () => {
            closeAndRestore(dialog);
        };
    }, [isMounted, closeAndRestore]);

    const mouseDownTargetRef = useRef<EventTarget | null>(null);

    const handleCancel = useCallback(
        (event: SyntheticEvent) => {
            if (event.target !== event.currentTarget) {
                return;
            }

            event.preventDefault();
            onClose();
        },
        [onClose],
    );

    const handleClick = useCallback(
        (event: MouseEvent) => {
            if (event.target === dialogRef.current && mouseDownTargetRef.current === dialogRef.current) {
                onClose();
            }
        },
        [onClose],
    );

    const handleKeyDown = useCallback((event: KeyboardEvent) => {
        if (event.key !== 'Tab') {
            return;
        }

        const dialog = dialogRef.current;

        if (!dialog) {
            return;
        }

        if (event.target instanceof Element && event.target.closest('dialog[open]') !== dialog) {
            return;
        }

        const focusableElements = getModalTabStops(dialog);
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

    useEffect(() => {
        if (!isOpen) {
            return;
        }

        const dialog = dialogRef.current;
        const handleMouseDown = (event: MouseEvent) => {
            mouseDownTargetRef.current = event.target;
        };

        dialog?.addEventListener('mousedown', handleMouseDown);
        dialog?.addEventListener('click', handleClick);
        dialog?.addEventListener('keydown', handleKeyDown);

        return () => {
            dialog?.removeEventListener('mousedown', handleMouseDown);
            dialog?.removeEventListener('click', handleClick);
            dialog?.removeEventListener('keydown', handleKeyDown);
        };
    }, [
        isOpen,
        handleClick,
        handleKeyDown,
    ]);

    if (!isMounted) {
        return null;
    }

    return (
        <dialog
            ref={dialogRef}
            className={clsx(styles.dialog, dialogClassName)}
            aria-label={ariaLabel}
            onCancel={handleCancel}
        >
            <UNSAFE_PortalProvider getContainer={() => dialogRef.current}>
                <div className={clsx(panelClassName, styles.panel)}>{children}</div>
            </UNSAFE_PortalProvider>
        </dialog>
    );
};
