import {useEffect} from 'react';

interface History {
    undo: () => unknown,
    redo: () => unknown,
}

/* Undo and redo for the shared document history while the Board is shown; names being edited keep the browser's own undo. */
export const useBoardHistoryShortcuts = (history: History, isReadOnly: boolean) => {
    useEffect(() => {
        const onKeyDown = (event: KeyboardEvent) => {
            const target = event.target;

            // `dialog` covers native confirmations (no role attribute), the attribute selector RAC popovers.
            if (isReadOnly || !(event.metaKey || event.ctrlKey) || !(target instanceof HTMLElement) || target.isContentEditable
                || target.closest('input, textarea, dialog, [role="dialog"], [role="menu"]')) return;

            if (event.key.toLowerCase() === 'z') {
                event.preventDefault();

                if (event.shiftKey) {
                    history.redo();
                } else {
                    history.undo();
                }
            } else if (event.ctrlKey && event.key.toLowerCase() === 'y') {
                event.preventDefault();
                history.redo();
            }
        };

        window.addEventListener('keydown', onKeyDown);

        return () => window.removeEventListener('keydown', onKeyDown);
    }, [history, isReadOnly]);
};
