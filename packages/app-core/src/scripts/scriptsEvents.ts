export const SCRIPTS_INVALIDATE_EVENT = 'stagistic:scripts:invalidate';

export const emitScriptsInvalidated = () => {
    if (typeof window === 'undefined') {
        return;
    }

    window.dispatchEvent(new CustomEvent(SCRIPTS_INVALIDATE_EVENT));
};
