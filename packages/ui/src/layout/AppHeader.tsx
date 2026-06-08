import clsx from 'clsx';
import {
    type ReactNode,
    useCallback,
    useEffect,
    useState,
} from 'react';
import {Button} from 'react-aria-components';

import {
    HomeIcon,
    PlusIcon,
    UploadIcon,
} from '../icons/ui';
import {
    applyAppThemeMode,
    type AppThemeMode,
    readPreferredAppThemeMode,
    subscribeToSystemThemeChange,
} from '../theme';
import styles from './AppHeader.module.css';
import {AccountMenu} from './header/AccountMenu';
import {ScriptMenu} from './header/ScriptMenu';
import {SyncIndicator} from './header/SyncIndicator';
import type {
    ScriptListItem,
    ScriptSyncState,
} from './header/types';

export type {
    ScriptListItem,
    ScriptSyncState,
};

type AppHeaderFrameProps = {
    scriptControls?: ReactNode,
    onMenuAction?: (actionId: string) => void,
    onHome: () => void,
    onNewScript: () => void,
    onImportScript?: () => void,
    isImportLoading?: boolean,
    isFullWidth?: boolean,
};

const AppHeaderFrame = ({
    scriptControls,
    onMenuAction,
    onHome,
    onNewScript,
    onImportScript,
    isImportLoading,
    isFullWidth = false,
}: AppHeaderFrameProps) => {
    const [themeMode, setThemeMode] = useState<AppThemeMode>(() => readPreferredAppThemeMode());

    useEffect(() => {
        applyAppThemeMode(themeMode);

        if (themeMode !== 'auto') {
            return;
        }

        return subscribeToSystemThemeChange(() => {
            applyAppThemeMode('auto');
        });
    }, [themeMode]);

    return (
        <header className={styles.header}>
            <div
                className={styles.dragRegion}
                data-tauri-drag-region
                aria-hidden="true"
            />
            <div className={clsx(styles.inner, isFullWidth && styles.full)}>
                <div className={styles.leftControls}>
                    <Button
                        className={styles.iconButton}
                        onPress={onHome}
                        aria-label="Go to home"
                    >
                        <HomeIcon className={styles.icon} aria-hidden="true" />
                    </Button>
                    <Button
                        className={styles.iconButton}
                        onPress={onNewScript}
                        aria-label="New script"
                    >
                        <PlusIcon className={styles.icon} aria-hidden="true" />
                    </Button>
                    {onImportScript ? (
                        <Button
                            className={styles.iconButton}
                            onPress={onImportScript}
                            aria-label="Import script"
                            isDisabled={isImportLoading}
                        >
                            <UploadIcon className={styles.icon} aria-hidden="true" />
                        </Button>
                    ) : null}
                </div>
                <div className={styles.scriptControls}>
                    {scriptControls ? scriptControls : null}
                </div>
                <div className={styles.rightControls}>
                    <AccountMenu
                        themeMode={themeMode}
                        onThemeChange={setThemeMode}
                        onAction={onMenuAction}
                    />
                </div>
            </div>
        </header>
    );
};

export type AppHeaderProps = {
    onHome: () => void,
    onNewScript: () => void,
    onImportScript?: () => void,
    onMenuAction?: (actionId: string) => void,
    isImportLoading?: boolean,
    isFullWidth?: boolean,
};

export const AppHeader = ({
    onMenuAction,
    onHome,
    onNewScript,
    onImportScript,
    isImportLoading,
    isFullWidth = false,
}: AppHeaderProps) => (
    <AppHeaderFrame
        onMenuAction={onMenuAction}
        onHome={onHome}
        onNewScript={onNewScript}
        onImportScript={onImportScript}
        isImportLoading={isImportLoading}
        isFullWidth={isFullWidth}
    />
);

export type ScriptEditorAppHeaderProps = {
    currentScript: ScriptListItem,
    recentScripts?: ScriptListItem[],
    onSelectScript: (script: ScriptListItem) => void,
    onMenuAction?: (actionId: string) => void,
    scriptSyncState?: ScriptSyncState,
    onHome: () => void,
    onNewScript: () => void,
    onImportScript?: () => void,
    onBackToEditor?: () => void,
    backToEditorLabel?: string,
    isImportLoading?: boolean,
    isFullWidth?: boolean,
};

export const ScriptEditorAppHeader = ({
    currentScript,
    recentScripts = [],
    onSelectScript,
    onMenuAction,
    scriptSyncState,
    onHome,
    onNewScript,
    onImportScript,
    onBackToEditor,
    backToEditorLabel = 'Back to editor',
    isImportLoading,
    isFullWidth = true,
}: ScriptEditorAppHeaderProps) => {
    const handleScriptMenuAction = useCallback((key: string) => {
        if (key.startsWith('script:')) {
            const scriptId = key.replace('script:', '');
            const script = recentScripts.find(item => item.id === scriptId);

            if (script) {
                onSelectScript(script);
            }

            return;
        }

        onMenuAction?.(key);
    }, [
        onMenuAction,
        onSelectScript,
        recentScripts,
    ]);

    return (
        <AppHeaderFrame
            onMenuAction={onMenuAction}
            onHome={onHome}
            onNewScript={onNewScript}
            onImportScript={onImportScript}
            isImportLoading={isImportLoading}
            isFullWidth={isFullWidth}
            scriptControls={(
                <>
                    {onBackToEditor ? (
                        <Button
                            className={clsx(styles.menuTrigger, styles.backButton)}
                            onPress={onBackToEditor}
                        >
                            {backToEditorLabel}
                        </Button>
                    ) : null}
                    <ScriptMenu
                        script={currentScript}
                        recentScripts={recentScripts}
                        onAction={handleScriptMenuAction}
                    />
                    <SyncIndicator state={scriptSyncState} />
                </>
            )}
        />
    );
};
