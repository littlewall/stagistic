import {
    type CSSProperties,
    useLayoutEffect,
    useState,
} from 'react';

import type {UseMenuPlacementArgs} from './types';

type AnchoredMenuStyle = CSSProperties & {
    '--anchored-menu-max-height'?: string,
};

export const useMenuPlacement = ({
    isMenuOpen,
    canvasRef,
    triggerRef,
    menuRef,
}: UseMenuPlacementArgs) => {
    const [isMenuAbove, setIsMenuAbove] = useState(false);
    const [menuStyle, setMenuStyle] = useState<AnchoredMenuStyle | undefined>();

    useLayoutEffect(() => {
        if (!isMenuOpen) {
            setIsMenuAbove(false);
            setMenuStyle(undefined);

            return;
        }

        let rafId = 0;
        const updatePlacement = () => {
            const trigger = triggerRef.current;
            const menu = menuRef.current;

            if (!trigger || !menu) {
                return;
            }

            const triggerRect = trigger.getBoundingClientRect();
            const menuRect = menu.getBoundingClientRect();
            const containerRect = canvasRef.current?.getBoundingClientRect() ?? null;
            const spaceBelow = containerRect
                ? containerRect.bottom - triggerRect.bottom
                : window.innerHeight - triggerRect.bottom;
            const spaceAbove = containerRect
                ? triggerRect.top - containerRect.top
                : triggerRect.top;
            const menuHeight = menu.scrollHeight || menuRect.height;
            const shouldFlip = spaceBelow < menuHeight + 8 && spaceAbove > spaceBelow;
            const availableHeight = Math.max(0, Math.floor((shouldFlip ? spaceAbove : spaceBelow) - 8));
            const nextHeight = `${availableHeight}px`;

            setIsMenuAbove(shouldFlip);
            setMenuStyle(previous => {
                if (previous?.['--anchored-menu-max-height'] === nextHeight) {
                    return previous;
                }

                return {'--anchored-menu-max-height': nextHeight};
            });
        };

        const schedule = () => {
            if (rafId) {
                cancelAnimationFrame(rafId);
            }

            rafId = requestAnimationFrame(updatePlacement);
        };

        // Resolve placement immediately on open to avoid below->above flicker.
        updatePlacement();

        const resizeObserver = new ResizeObserver(() => {
            if (menuRef.current) {
                schedule();
            }
        });

        if (menuRef.current) {
            resizeObserver.observe(menuRef.current);
        }

        window.addEventListener('resize', schedule);

        return () => {
            if (rafId) {
                cancelAnimationFrame(rafId);
            }

            resizeObserver.disconnect();
            window.removeEventListener('resize', schedule);
        };
    }, [
        canvasRef,
        isMenuOpen,
        menuRef,
        triggerRef,
    ]);

    return {
        isMenuAbove,
        menuStyle,
    };
};
