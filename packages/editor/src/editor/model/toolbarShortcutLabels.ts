import {isApplePlatform} from '@stagistic/shared';

export type ToolbarShortcutLabels = Readonly<{
    undo: string,
    redo: string,
    bold: string,
    italic: string,
    underline: string,
}>;

const APPLE_LABELS: ToolbarShortcutLabels = {
    undo: '⌘Z',
    redo: '⇧⌘Z',
    bold: '⌘B',
    italic: '⌘I',
    underline: '⌘U',
};

const OTHER_LABELS: ToolbarShortcutLabels = {
    undo: 'Ctrl+Z',
    redo: 'Ctrl+Y',
    bold: 'Ctrl+B',
    italic: 'Ctrl+I',
    underline: 'Ctrl+U',
};

export const getToolbarShortcutLabels = (): ToolbarShortcutLabels => {
    return isApplePlatform() ? APPLE_LABELS : OTHER_LABELS;
};
