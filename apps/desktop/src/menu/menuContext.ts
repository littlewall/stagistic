import {invoke} from '@tauri-apps/api/core';

// Editor, Board and Export of a script, including saved drafts and versions.
const SCRIPT_VIEW_PATH = /^\/script\/[^/]+(?:\/snapshots\/[^/]+)?\/(?:editor|board|export)(?:\/|$)/;

/** True on the routes where the native Script menu applies. */
export const isInScriptPath = (pathname: string): boolean => SCRIPT_VIEW_PATH.test(pathname);

/** Tells Rust whether a script is open, which enables the Script menu items. */
export const reportMenuContext = (inScript: boolean): Promise<void> => invoke('desktop_set_menu_context', {inScript});
