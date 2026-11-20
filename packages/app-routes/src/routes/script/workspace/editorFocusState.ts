/**
 * Router state that asks the Editor to jump to a block on arrival. Unlike a URL
 * parameter it is invisible, and the Editor consumes it once.
 */
export interface EditorFocusState {
    focusBlockId: string,
}

export const createEditorFocusState = (focusBlockId: string): EditorFocusState => ({focusBlockId});

export const readEditorFocusBlockId = (state: unknown): string | null => {
    if (!state || typeof state !== 'object') {
        return null;
    }

    const {focusBlockId} = state as Partial<EditorFocusState>;

    return typeof focusBlockId === 'string' && focusBlockId.length > 0 ? focusBlockId : null;
};
