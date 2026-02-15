export const SCRIPTS_INVALIDATE_EVENT = 'stagistic:scripts:invalidate';

type InvalidateListener = () => void;

const invalidateListeners = new Set<InvalidateListener>();

export const onScriptsInvalidated = (listener: InvalidateListener) => {
    invalidateListeners.add(listener);

    return () => {
        invalidateListeners.delete(listener);
    };
};

export const emitScriptsInvalidated = () => {
    invalidateListeners.forEach(listener => listener());
};
