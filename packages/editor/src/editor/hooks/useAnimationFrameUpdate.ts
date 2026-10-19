import {
    useCallback,
    useEffect,
    useRef,
} from 'react';

export const useAnimationFrameUpdate = (update: () => void) => {
    const frameRef = useRef<number | null>(null);
    const cancel = useCallback(() => {
        if (frameRef.current === null) {
            return;
        }

        window.cancelAnimationFrame(frameRef.current);
        frameRef.current = null;
    }, []);
    const schedule = useCallback(() => {
        if (frameRef.current !== null) {
            return;
        }

        frameRef.current = window.requestAnimationFrame(() => {
            frameRef.current = null;
            update();
        });
    }, [update]);
    const runNow = useCallback(() => {
        cancel();
        update();
    }, [cancel, update]);

    useEffect(() => cancel, [cancel]);

    return {
        cancel,
        schedule,
        runNow,
    };
};
