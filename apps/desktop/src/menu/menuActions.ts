/*
 * Native menu action ids, emitted by Rust as `menu-action` payloads. Mirrors
 * `FRONTEND_ACTIONS` in src-tauri/src/menu.rs (menuActions.test.ts checks they match).
 * Zoom and Quit are handled in Rust and never reach the frontend.
 */
export const MENU_EVENT = 'menu-action';

export const MENU_ACTIONS = [
    'app.check-updates',
    'app.settings',
    'file.new-script',
    'file.import',
    'file.script-library',
    'edit.undo',
    'edit.redo',
    'script.settings',
    'script.attributes',
    'script.export',
    'script.save',
    'help.docs',
    'help.whats-new',
    'help.changelog',
    'help.report-problem',
    'help.backups-folder',
    'help.licenses',
] as const;

export type MenuAction = typeof MENU_ACTIONS[number];

export const isMenuAction = (value: unknown): value is MenuAction => typeof value === 'string' && (MENU_ACTIONS as readonly string[]).includes(value);

