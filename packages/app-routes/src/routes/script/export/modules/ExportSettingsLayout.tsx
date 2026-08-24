import type {ReactNode} from 'react';

import styles from './modules.module.css';

export const ExportSettingsGroup = ({children}: {children: ReactNode}) => (
    <div className={styles.module}>{children}</div>
);

export const ExportSettingRow = ({children}: {children: ReactNode}) => (
    <div className={styles.settingRow}>{children}</div>
);
