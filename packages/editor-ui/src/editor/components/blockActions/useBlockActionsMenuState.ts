import type {Editor as TiptapEditor} from '@tiptap/react';
import {
    type RefObject,
    useCallback,
    useEffect,
    useState,
} from 'react';

type UseBlockActionsMenuStateArgs = {
    editor: TiptapEditor | null,
    triggerRef: RefObject<HTMLButtonElement | null>,
    menuRef: RefObject<HTMLDivElement | null>,
};

export const useBlockActionsMenuState = ({
    editor,
    triggerRef,
    menuRef,
}: UseBlockActionsMenuStateArgs) => {
    const [isMenuOpen, setIsMenuOpen] = useState(false);

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
                setIsMenuOpen(false);
            }
        };

        document.addEventListener('pointerdown', onPointerDown);
        document.addEventListener('keydown', onKeyDown);

        return () => {
            document.removeEventListener('pointerdown', onPointerDown);
            document.removeEventListener('keydown', onKeyDown);
        };
    }, [
        isMenuOpen,
        menuRef,
        triggerRef,
    ]);

    const closeMenu = useCallback(() => {
        setIsMenuOpen(false);
    }, []);

    const toggleMenu = useCallback(() => {
        setIsMenuOpen(previous => !previous);
        editor?.commands.focus();
    }, [editor]);

    return {
        isMenuOpen,
        closeMenu,
        toggleMenu,
    };
};
