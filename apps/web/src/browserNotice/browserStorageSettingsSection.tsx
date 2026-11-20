import type {AppSettingsSection} from '@stagistic/app-routes';
import {BrowserDataNotice} from '@stagistic/ui';

/**
 * App settings tab with the browser-storage information the first-visit notice shows.
 * Web only: the desktop app stores files on disk, so it does not pass this section.
 */
export const browserStorageSettingsSection: AppSettingsSection = {
    id: 'storage',
    label: 'Storage',
    content: <BrowserDataNotice />,
};
