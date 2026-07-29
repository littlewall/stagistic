import {
    type CSSProperties,
    type RefObject,
    useLayoutEffect,
    useState,
} from 'react';

import {
    type AnchoredMenuPlacement,
    resolveAnchoredMenuPlacement,
} from './anchoredMenuPlacement';

interface UseAnchoredMenuPlacementArgs {
    anchorRef: RefObject<HTMLElement | null>,
    menuRef: RefObject<HTMLElement | null>,
    isOpen: boolean,
    viewportMargin?: number,
}

type AnchoredMenuHeightStyle = CSSProperties & {
    '--anchored-menu-max-height'?: string,
};

const DEFAULT_VIEWPORT_MARGIN = 8;

export const useAnchoredMenuPlacement = ({
    anchorRef,
    menuRef,
    isOpen,
    viewportMargin = DEFAULT_VIEWPORT_MARGIN,
}: UseAnchoredMenuPlacementArgs): {
    placement: AnchoredMenuPlacement,
    style: AnchoredMenuHeightStyle,
} => {
    const [placement, setPlacement] = useState<AnchoredMenuPlacement>('below');
    const [style, setStyle] = useState<AnchoredMenuHeightStyle>({});

    useLayoutEffect(() => {
        if (!isOpen || typeof window === 'undefined') {
            setPlacement('below');
            setStyle({});

            return;
        }

        let rafId = 0;
        const updateHeight = () => {
            const anchor = anchorRef.current;
            const menu = menuRef.current;

            if (!anchor || !menu) {
                return;
            }

            const anchorRect = anchor.getBoundingClientRect();
            const resolved = resolveAnchoredMenuPlacement({
                anchorTop: anchorRect.top,
                anchorBottom: anchorRect.bottom,
                menuHeight: menu.scrollHeight || menu.getBoundingClientRect().height,
                viewportHeight: window.innerHeight,
                viewportMargin,
            });
            const maxHeight = resolved.maxHeight;
            const nextHeight = `${maxHeight}px`;

            setPlacement(resolved.placement);
            setStyle(previous => {
                if (previous['--anchored-menu-max-height'] === nextHeight) {
                    return previous;
                }

                return {'--anchored-menu-max-height': nextHeight};
            });
        };
        const scheduleUpdate = () => {
            if (rafId) {
                cancelAnimationFrame(rafId);
            }

            rafId = requestAnimationFrame(updateHeight);
        };
        const resizeObserver = typeof ResizeObserver === 'undefined'
            ? null
            : new ResizeObserver(scheduleUpdate);
        const anchor = anchorRef.current;
        const menu = menuRef.current;

        updateHeight();
        if (anchor) {
            resizeObserver?.observe(anchor);
        }

        if (menu) {
            resizeObserver?.observe(menu);
        }

        window.addEventListener('resize', scheduleUpdate);
        window.addEventListener('scroll', scheduleUpdate, true);

        return () => {
            if (rafId) {
                cancelAnimationFrame(rafId);
            }

            resizeObserver?.disconnect();
            window.removeEventListener('resize', scheduleUpdate);
            window.removeEventListener('scroll', scheduleUpdate, true);
        };
    }, [
        anchorRef,
        isOpen,
        menuRef,
        viewportMargin,
    ]);

    return {
        placement,
        style,
    };
};
