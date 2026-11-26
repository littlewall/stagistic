import {invoke} from '@tauri-apps/api/core';

/*
 * Opens the app data `backups/` folder in Finder. One action for every caller:
 * Settings, the boot failure screen and, later, the Help menu.
 */
export const showBackupsFolder = (): Promise<void> => invoke('desktop_show_backups_folder');

/** Opens the app data `attachments/` folder in Finder. */
export const showAttachmentsFolder = (): Promise<void> => invoke('desktop_show_attachments_folder');

/** Opens the page to download the current Release in the browser. */
export const openDownloadPage = (): Promise<void> => invoke('desktop_open_download_page');
