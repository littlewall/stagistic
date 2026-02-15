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
            };
        }

        const observer = new ResizeObserver(() => {
            updateScale();
        });

        observer.observe(rootElement);
        observer.observe(canvasHostElement);

        return () => {
            observer.disconnect();
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
