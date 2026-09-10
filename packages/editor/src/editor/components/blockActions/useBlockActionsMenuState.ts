import {
    useCallback,
    useEffect,
    useLayoutEffect,
    useRef,
    useState,
} from 'react';

import {useExclusiveOverlay} from '../../hooks/useExclusiveOverlay';
import type {UseBlockActionsMenuStateArgs} from './types';

export const useBlockActionsMenuState = ({
    triggerRef,
    menuRef,
    editor,
}: UseBlockActionsMenuStateArgs) => {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const closeMenu = useCallback(() => {
        setIsMenuOpen(false);
    }, []);
    const shouldRestoreFocusRef = useRef(false);
    const closeMenuAndRestoreFocus = useCallback(() => {
        shouldRestoreFocusRef.current = true;
        setIsMenuOpen(false);
    }, []);

    /*
     * Focus is restored after the close has been committed, not inside the
     * close callback: closing the menu usually unmounts the gutter trigger
     * along with it, so focusing the trigger first only to have React drop it
     * a moment later strands the keyboard user on <body>. Once the commit has
     * landed we know whether the trigger survived, and can hand the caret back
     * to the editor when it did not.
     */
    useLayoutEffect(() => {
        if (isMenuOpen || !shouldRestoreFocusRef.current) {
            return;
        }

        shouldRestoreFocusRef.current = false;

        const trigger = triggerRef.current;

        if (trigger?.isConnected) {
            trigger.focus();

            return;
        }

        editor?.commands.focus();
    }, [
        editor,
        isMenuOpen,
        triggerRef,
    ]);

    useEffect(() => {
        if (!isMenuOpen) {
            return;
        }

        const onPointerDown = (event: MouseEvent | PointerEvent) => {
            const target = event.target as Node;

            if (menuRef.current && menuRef.current.contains(target)) {
                return;
            }

            if (triggerRef.current && triggerRef.current.contains(target)) {
                return;
            }

            setIsMenuOpen(false);
        };

        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                closeMenuAndRestoreFocus();
            }
        };

        document.addEventListener('pointerdown', onPointerDown);
        document.addEventListener('keydown', onKeyDown);

        return () => {
            document.removeEventListener('pointerdown', onPointerDown);
            document.removeEventListener('keydown', onKeyDown);
        };
    }, [
        closeMenuAndRestoreFocus,
        isMenuOpen,
        menuRef,
        triggerRef,
    ]);

    useExclusiveOverlay(isMenuOpen, closeMenu);

    const toggleMenu = useCallback(() => {
        setIsMenuOpen(previous => !previous);
    }, []);

    return {
        isMenuOpen,
        closeMenu,
        closeMenuAndRestoreFocus,
        toggleMenu,
    };
};
