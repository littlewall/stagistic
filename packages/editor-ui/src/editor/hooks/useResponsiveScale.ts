import {
    type RefObject,
    useEffect,
    useState,
} from 'react';

const OVERLAY_BREAKPOINT_PX = 1100;

const parseCssPixels = (value: string) => {
    const parsed = Number.parseFloat(value);

    return Number.isFinite(parsed) ? parsed : 0;
};

const createLengthProbe = (rootElement: HTMLDivElement) => {
    const probe = document.createElement('div');

    probe.setAttribute('aria-hidden', 'true');
    probe.style.position = 'absolute';
    probe.style.visibility = 'hidden';
    probe.style.pointerEvents = 'none';
    probe.style.height = '0';
    probe.style.overflow = 'hidden';
    probe.style.padding = '0';
    probe.style.border = '0';
    probe.style.boxSizing = 'content-box';
    probe.style.contain = 'strict';
    probe.style.inset = '0';

    rootElement.appendChild(probe);

    return probe;
};

const measureCssLengthPx = (probe: HTMLDivElement, expression: string) => {
    probe.style.width = expression;

    const measured = probe.getBoundingClientRect().width;

    return Number.isFinite(measured) ? measured : 0;
};

type UseResponsiveScaleArgs = {
    rootRef: RefObject<HTMLDivElement | null>,
    canvasHostRef: RefObject<HTMLDivElement | null>,
    pageWidthPx: number,
    sizeScale: number,
};

export const useResponsiveScale = ({
    rootRef,
    canvasHostRef,
    pageWidthPx,
    sizeScale,
}: UseResponsiveScaleArgs) => {
    const [responsiveScale, setResponsiveScale] = useState(1);

    useEffect(() => {
        const rootElement = rootRef.current;
        const canvasHostElement = canvasHostRef.current;

        if (!rootElement || !canvasHostElement) {
            return;
        }

        const pageWidth = pageWidthPx * sizeScale;

        if (!Number.isFinite(pageWidth) || pageWidth <= 0) {
            setResponsiveScale(1);

            return;
        }

        const lengthProbe = createLengthProbe(rootElement);
        const contentRowElement = canvasHostElement.parentElement;
        const leftSidebarElement = contentRowElement?.firstElementChild instanceof HTMLElement
            ? contentRowElement.firstElementChild
            : null;
        const rightSidebarElement = contentRowElement?.lastElementChild instanceof HTMLElement
            ? contentRowElement.lastElementChild
            : null;

        const updateScale = () => {
            const hostStyle = window.getComputedStyle(canvasHostElement);
            const hostPaddingLeft = parseCssPixels(hostStyle.paddingLeft);
            const hostPaddingRight = parseCssPixels(hostStyle.paddingRight);
            const hostContentWidth = Math.max(
                0,
                canvasHostElement.clientWidth - hostPaddingLeft - hostPaddingRight,
            );
            const isOverlayViewport = window.matchMedia(`(max-width: ${OVERLAY_BREAKPOINT_PX}px)`).matches;
            const sidebarWidth = measureCssLengthPx(lengthProbe, 'var(--editor-sidebar-width)');
            const leftSidebarWidth = leftSidebarElement?.getBoundingClientRect().width ?? sidebarWidth;
            const rightSidebarWidth = rightSidebarElement?.getBoundingClientRect().width ?? sidebarWidth;
            const leftSidebarReserve = Math.max(0, sidebarWidth - leftSidebarWidth);
            const rightSidebarReserve = Math.max(0, sidebarWidth - rightSidebarWidth);
            const reservedSidebarWidth = isOverlayViewport
                ? 0
                : leftSidebarReserve + rightSidebarReserve;
            const availableWidth = Math.max(0, hostContentWidth - reservedSidebarWidth);
            const nextScale = Math.min(1, availableWidth / pageWidth);

            setResponsiveScale(previous => {
                if (Math.abs(previous - nextScale) < 0.001) {
                    return previous;
                }

                return nextScale;
            });
        };

        updateScale();

        if (typeof ResizeObserver === 'undefined') {
            window.addEventListener('resize', updateScale);

            return () => {
                window.removeEventListener('resize', updateScale);
                lengthProbe.remove();
            };
        }

        const observer = new ResizeObserver(() => {
            updateScale();
        });

        observer.observe(rootElement);
        observer.observe(canvasHostElement);

        return () => {
            observer.disconnect();
            lengthProbe.remove();
        };
    }, [
        canvasHostRef,
        pageWidthPx,
        rootRef,
        sizeScale,
    ]);

    return responsiveScale;
};
