import {invoke} from '@tauri-apps/api/core';

/** Opens the bundled third-party licence file. Called by the Help menu (ticket 10). */
export const openThirdPartyLicenses = (): Promise<void> => invoke('desktop_open_licenses');
