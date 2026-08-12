import type {BlockShortcut} from '@stagistic/script';
import {isApplePlatform} from '@stagistic/shared';

/*
 * Block-type digit shortcuts use Control on macOS (Option is reserved for
 * character composition — see shortcuts.ts) and Alt elsewhere.
 */
export const formatBlockShortcutLabel = (shortcut: BlockShortcut): string => {
    return isApplePlatform() ? `⌃${shortcut}` : `Alt+${shortcut}`;
};

/*
 * Alt+Enter cycles the active block to the next type. Same physical chord on
 * both platforms, but conventionally rendered as Option/Return glyphs on
 * macOS and as text elsewhere.
 */
export const formatBlockCycleShortcutLabel = (): string => {
    return isApplePlatform() ? '⌥⏎' : 'Alt+Enter';
};

export const formatLyricsToggleShortcutLabel = (): string => {
    return isApplePlatform() ? '⌥⇥' : 'Alt+Tab';
};
