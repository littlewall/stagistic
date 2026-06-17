import {
    type CSSProperties,
    type RefObject,
    useLayoutEffect,
    useState,
} from 'react';

interface UseAnchoredMenuHeightArgs {
    anchorRef: RefObject<HTMLElement | null>,
    isOpen: boolean,
    viewportMargin?: number,
}

type AnchoredMenuHeightStyle = CSSProperties & {
    '--anchored-menu-max-height'?: string,
};

const DEFAULT_VIEWPORT_MARGIN = 8;

export const useAnchoredMenuHeight = ({
    anchorRef,
    isOpen,
    viewportMargin = DEFAULT_VIEWPORT_MARGIN,
}: UseAnchoredMenuHeightArgs): AnchoredMenuHeightStyle => {
    const [style, setStyle] = useState<AnchoredMenuHeightStyle>({});

    useLayoutEffect(() => {
        if (!isOpen || typeof window === 'undefined') {
            setStyle({});

            return;
        }

        let rafId = 0;
        const updateHeight = () => {
            const anchor = anchorRef.current;

            if (!anchor) {
                return;
            }

            const anchorRect = anchor.getBoundingClientRect();
            const maxHeight = Math.max(0, Math.floor(window.innerHeight - anchorRect.bottom - viewportMargin));
            const nextHeight = `${maxHeight}px`;

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

        updateHeight();
        if (anchor) {
            resizeObserver?.observe(anchor);
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
        viewportMargin,
    ]);

    return style;
};
