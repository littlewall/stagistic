import {
    useCallback,
    useEffect,
    useRef,
} from 'react';

export const useRafScheduler = () => {
    const frameRef = useRef<number | null>(null);

    const cancel = useCallback(() => {
        if (frameRef.current === null) {
            return;
        }

        window.cancelAnimationFrame(frameRef.current);
        frameRef.current = null;
    }, []);

    const schedule = useCallback((fn: () => void) => {
        cancel();

        if (typeof window === 'undefined') {
            fn();

            return;
        }

        frameRef.current = window.requestAnimationFrame(() => {
            frameRef.current = null;
            fn();
        });
    }, [cancel]);

    useEffect(() => {
        return () => {
            cancel();
        };
    }, [cancel]);

    return {cancel, schedule};
};
