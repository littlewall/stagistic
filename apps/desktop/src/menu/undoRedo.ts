export type HistoryDirection = 'undo' | 'redo';

export interface HistoryEnvironment {
    activeElement: Element | null,
    execCommand: (command: string) => unknown,
    createKeyEvent: (direction: HistoryDirection) => Event,
}

// Cmd+Z / Cmd+Shift+Z as the editor's keymap sees them.
const createKeyEvent = (direction: HistoryDirection): Event => {
    const event = new KeyboardEvent('keydown', {
        key: direction === 'redo' ? 'Z' : 'z',
        code: 'KeyZ',
        keyCode: 90,
        metaKey: true,
        shiftKey: direction === 'redo',
        bubbles: true,
        cancelable: true,
    });

    // WebKit may drop `keyCode` from the init dictionary; ProseMirror's keymap reads it for Cmd+Shift.
    if (event.keyCode !== 90) {
        Object.defineProperty(event, 'keyCode', {value: 90});
    }

    return event;
};

const browserEnvironment = (): HistoryEnvironment => ({
    activeElement: document.activeElement,
    execCommand: command => document.execCommand(command),
    createKeyEvent,
});

/*
 * Edit ▸ Undo/Redo. The script editor keeps its own history (ProseMirror), which
 * WebKit's native undo cannot reach, so the shortcut is replayed on the focused
 * editor. Plain inputs keep the browser's undo.
 */
export const runHistoryCommand = (
    direction: HistoryDirection,
    environment: HistoryEnvironment = browserEnvironment(),
): void => {
    const target = environment.activeElement;

    if (target?.closest('.ProseMirror')) {
        target.dispatchEvent(environment.createKeyEvent(direction));

        return;
    }

    environment.execCommand(direction);
};
