import {
    useCallback,
    useEffect,
    useState,
} from 'react';

import {useExclusiveOverlay} from '../../hooks/useExclusiveOverlay';
import type {UseBlockActionsMenuStateArgs} from './types';

export const useBlockActionsMenuState = ({
    triggerRef,
    menuRef,
}: UseBlockActionsMenuStateArgs) => {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const closeMenu = useCallback(() => {
        setIsMenuOpen(false);
    }, []);
    const closeMenuAndRestoreFocus = useCallback(() => {
        triggerRef.current?.focus();
        setIsMenuOpen(false);
    }, [triggerRef]);

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
