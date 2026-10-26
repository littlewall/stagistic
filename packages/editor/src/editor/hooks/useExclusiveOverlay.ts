import {
    useEffect,
    useEffectEvent,
    useId,
} from 'react';

const OVERLAY_EVENT = 'overlay:exclusive-open';

export const useExclusiveOverlay = (isOpen: boolean, close: () => void) => {
    const id = useId();
    const closeOverlay = useEffectEvent(close);

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
                closeOverlay();
            }
        };

        document.addEventListener(OVERLAY_EVENT, handle);

        return () => {
            document.removeEventListener(OVERLAY_EVENT, handle);
        };
    }, [id]);
};
