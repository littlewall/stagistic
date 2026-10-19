import {isApplePlatform} from '@stagistic/shared';

export type ToolbarShortcutLabels = Readonly<{
    undo: string,
    redo: string,
    bold: string,
    italic: string,
    underline: string,
    previousResult: string,
    nextResult: string,
    toggleReplace: string,
    replace: string,
    replaceAll: string,
}>;

const APPLE_LABELS: ToolbarShortcutLabels = {
    undo: '⌘Z',
    redo: '⇧⌘Z',
    bold: '⌘B',
    italic: '⌘I',
    underline: '⌘U',
    previousResult: '⇧↩',
    nextResult: '↩',
    toggleReplace: '⌥⌘F',
    replace: '↩',
    replaceAll: '⌘↩',
};

const OTHER_LABELS: ToolbarShortcutLabels = {
    undo: 'Ctrl+Z',
    redo: 'Ctrl+Y',
    bold: 'Ctrl+B',
    italic: 'Ctrl+I',
    underline: 'Ctrl+U',
    previousResult: 'Shift+Enter',
    nextResult: 'Enter',
    toggleReplace: 'Ctrl+H',
    replace: 'Enter',
    replaceAll: 'Ctrl+Enter',
};

export const getToolbarShortcutLabels = (): ToolbarShortcutLabels => {
    return isApplePlatform() ? APPLE_LABELS : OTHER_LABELS;
};
