import {
    useEffect,
    useId,
    useRef,
} from 'react';

const OVERLAY_EVENT = 'overlay:exclusive-open';

export const useExclusiveOverlay = (isOpen: boolean, close: () => void) => {
    const id = useId();
    const closeRef = useRef(close);

    closeRef.current = close;

    useEffect(() => {
        if (!isOpen) {
            return;
        }

        document.dispatchEvent(new CustomEvent(OVERLAY_EVENT, {detail: {id}}));
    }, [id, isOpen]);

    useEffect(() => {
        const handle = (event: Event) => {
            const {id: openedId} = (event as CustomEvent<{id: string}>).detail;

            if (openedId !== id) {
                closeRef.current();
            }
        };

        document.addEventListener(OVERLAY_EVENT, handle);

        return () => {
            document.removeEventListener(OVERLAY_EVENT, handle);
        };
    }, [id]);
};
