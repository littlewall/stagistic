import {createUnsavedWorkMark} from '@stagistic/shared';

/**
 * Marks the session's unsaved work. The browser's "leave site?" prompt is one
 * app-level listener (`installUnsavedWorkWarning`), shared with drafts and the
 * outline, so a clean document never hides a dirty draft.
 */
export const createUnloadWarning = () => {
    const markUnsavedWork = createUnsavedWorkMark();

    return {
        set: (shouldWarn: boolean) => {
            markUnsavedWork(shouldWarn);
        },
    };
};
