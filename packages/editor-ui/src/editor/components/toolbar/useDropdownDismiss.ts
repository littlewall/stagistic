import {
    type RefObject,
    useEffect,
} from 'react';

type UseDropdownDismissArgs = {
    isOpen: boolean,
    setIsOpen: (next: boolean) => void,
    dropdownRef: RefObject<HTMLElement | null>,
};

export const useDropdownDismiss = ({
    isOpen,
    setIsOpen,
    dropdownRef,
}: UseDropdownDismissArgs) => {
    useEffect(() => {
        if (!isOpen) {
            return;
        }

        const onPointerDown = (event: MouseEvent | PointerEvent) => {
            if (!dropdownRef.current) {
                return;
            }

            if (dropdownRef.current.contains(event.target as Node)) {
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
    }, [
        dropdownRef,
        isOpen,
        setIsOpen,
    ]);
};
