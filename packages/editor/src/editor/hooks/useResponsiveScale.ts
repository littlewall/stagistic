import {
    type RefObject,
    useEffect,
    useState,
} from 'react';

type UseResponsiveScaleArgs = {
    rootRef: RefObject<HTMLDivElement | null>,
    canvasHostRef: RefObject<HTMLDivElement | null>,
    pageWidthPx: number,
    sizeScale: number,
    isLeftSidebarOpen: boolean,
    isRightSidebarOpen: boolean,
};

export const useResponsiveScale = ({
    rootRef,
    canvasHostRef,
    pageWidthPx,
    sizeScale,
    isLeftSidebarOpen,
    isRightSidebarOpen,
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

        const updateScale = () => {
            const availableWidth = Math.max(0, canvasHostElement.clientWidth);

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
        observer?.observe(canvasHostElement);

        return () => {
            window.removeEventListener('resize', scheduleUpdate);

            if (frameHandle) {
                window.cancelAnimationFrame(frameHandle);
            }

            observer?.disconnect();
        };
    }, [
        canvasHostRef,
        isLeftSidebarOpen,
        isRightSidebarOpen,
        pageWidthPx,
        rootRef,
        sizeScale,
    ]);

    return responsiveScale;
};
