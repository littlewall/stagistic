import {
    type RefObject,
    useEffect,
    useState,
} from 'react';

type UseResponsiveScaleArgs = {
    rootRef: RefObject<HTMLDivElement | null>,
    canvasHostRef: RefObject<HTMLDivElement | null>,
    pageWidthPx: number,
    editorZoom: number,
};

/**
 * Resolves the toggle-rail width in px by measuring a probe element, since
 * `--toolbar-toggle-width` is a calc() expression that cannot be parsed
 * from getComputedStyle directly.
 */
const measureToggleRailWidth = (rootElement: HTMLElement) => {
    const probe = document.createElement('div');

    probe.style.position = 'absolute';
    probe.style.visibility = 'hidden';
    probe.style.pointerEvents = 'none';
    probe.style.width = 'var(--toolbar-toggle-width, 0px)';
    rootElement.appendChild(probe);

    const width = probe.getBoundingClientRect().width;

    probe.remove();

    return width;
};

export const useResponsiveScale = ({
    rootRef,
    canvasHostRef,
    pageWidthPx,
    editorZoom,
}: UseResponsiveScaleArgs) => {
    const [responsiveScale, setResponsiveScale] = useState(1);

    useEffect(() => {
        const rootElement = rootRef.current;
        const canvasHostElement = canvasHostRef.current;

        if (!rootElement || !canvasHostElement) {
            return;
        }

        const pageWidth = pageWidthPx * editorZoom;

        if (!Number.isFinite(pageWidth) || pageWidth <= 0) {
            setResponsiveScale(1);

            return;
        }

        /*
         * The scale must not react to sidebars opening or closing: it is
         * derived from the sidebar-independent closed-state width (root minus
         * the two toggle rails minus the canvas padding) instead of the live
         * canvas host width, which shrinks while sidebars are open.
         */
        const updateScale = () => {
            const toggleRailWidth = measureToggleRailWidth(rootElement);
            const canvasHostStyle = window.getComputedStyle(canvasHostElement);
            const horizontalPadding = (Number.parseFloat(canvasHostStyle.paddingLeft) || 0)
                + (Number.parseFloat(canvasHostStyle.paddingRight) || 0);
            const availableWidth = Math.max(
                0,
                rootElement.clientWidth - (2 * toggleRailWidth) - horizontalPadding,
            );

            if (availableWidth <= 1) {
                return;
            }

            const nextScale = Math.min(1, availableWidth / pageWidth);

            if (!Number.isFinite(nextScale) || nextScale <= 0) {
                return;
            }

            setResponsiveScale(previous => {
                if (Math.abs(previous - nextScale) < 0.001) {
                    return previous;
                }

                return nextScale;
            });
        };

        let frameHandle = 0;

        const scheduleUpdate = () => {
            if (frameHandle) {
                window.cancelAnimationFrame(frameHandle);
            }

            frameHandle = window.requestAnimationFrame(() => {
                frameHandle = 0;
                updateScale();
            });
        };

        scheduleUpdate();

        window.addEventListener('resize', scheduleUpdate);

        const observer = typeof ResizeObserver === 'undefined'
            ? null
            : new ResizeObserver(() => {
                scheduleUpdate();
            });

        observer?.observe(rootElement);

        return () => {
            window.removeEventListener('resize', scheduleUpdate);

            if (frameHandle) {
                window.cancelAnimationFrame(frameHandle);
            }

            observer?.disconnect();
        };
    }, [
        canvasHostRef,
        editorZoom,
        pageWidthPx,
        rootRef,
    ]);

    return responsiveScale;
};
