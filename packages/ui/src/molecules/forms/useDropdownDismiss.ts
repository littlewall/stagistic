import {
    type RefObject, useEffect, useRef,
} from 'react';

export const useDropdownDismiss = (
    isOpen: boolean,
    setIsOpen: (value: boolean) => void,
    containerRef: RefObject<HTMLElement | null>,
) => {
    const setIsOpenRef = useRef(setIsOpen);

    setIsOpenRef.current = setIsOpen;

    useEffect(() => {
        if (!isOpen) {
            return;
        }

        const onPointerDown = (event: MouseEvent | PointerEvent) => {
            if (!containerRef.current) {
                return;
            }

            if (containerRef.current.contains(event.target as Node)) {
                return;
            }

            setIsOpenRef.current(false);
        };
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                setIsOpenRef.current(false);
            }
        };

        document.addEventListener('pointerdown', onPointerDown);
        document.addEventListener('keydown', onKeyDown);

        return () => {
            document.removeEventListener('pointerdown', onPointerDown);
            document.removeEventListener('keydown', onKeyDown);
        };
    }, [isOpen, containerRef]);
};
