import type {ReactNode} from 'react';

/** A platform-specific section of the app settings, listed after Appearance. */
export interface AppSettingsSection {
    id: string,
    label: string,
    /** Mounted only while the section is shown. */
    content: ReactNode,
}
