import {
    type RefObject,
    useEffect,
} from 'react';

interface UseCanvasScrollLockArgs {
    canvasRef: RefObject<HTMLElement | null>,
    isLocked: boolean,
}

export const useCanvasScrollLock = ({
    canvasRef,
    isLocked,
}: UseCanvasScrollLockArgs) => {
    useEffect(() => {
        const canvas = canvasRef.current;

        if (!canvas || !isLocked) {
            return;
        }

        const previousOverflowY = canvas.style.overflowY;
        const previousOverscrollBehavior = canvas.style.overscrollBehavior;
        const preventScroll = (event: WheelEvent | TouchEvent) => {
            event.preventDefault();
        };

        canvas.style.overflowY = 'hidden';
        canvas.style.overscrollBehavior = 'none';
        canvas.addEventListener('wheel', preventScroll, {passive: false});
        canvas.addEventListener('touchmove', preventScroll, {passive: false});

        return () => {
            canvas.style.overflowY = previousOverflowY;
            canvas.style.overscrollBehavior = previousOverscrollBehavior;
            canvas.removeEventListener('wheel', preventScroll);
            canvas.removeEventListener('touchmove', preventScroll);
        };
    }, [canvasRef, isLocked]);
};
