import {
    useLayoutEffect,
    useState,
} from 'react';

import type {UseMenuPlacementArgs} from './types';

export const useMenuPlacement = ({
    isMenuOpen,
    canvasRef,
    triggerRef,
    menuRef,
}: UseMenuPlacementArgs) => {
    const [isMenuAbove, setIsMenuAbove] = useState(false);

    useLayoutEffect(() => {
        if (!isMenuOpen) {
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
            const shouldFlip = spaceBelow < menuRect.height + 8 && spaceAbove > spaceBelow;

            setIsMenuAbove(shouldFlip);
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
    };
};
