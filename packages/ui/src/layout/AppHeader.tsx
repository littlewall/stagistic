import clsx from 'clsx';
import {
    type ReactNode,
    useCallback,
    useEffect,
    useState,
} from 'react';
import {Button} from 'react-aria-components';

import {Tooltip} from '../atoms/Tooltip';
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
    ScriptView,
} from './header/types';
import {ViewSwitcher} from './header/ViewSwitcher';

export type {
    ScriptListItem,
    ScriptSyncState,
    ScriptView,
};

export type AppHeaderProps = {
    leftControls?: ReactNode,
    scriptControls?: ReactNode,
    onHome: () => void,
    onNewScript?: () => void,
    onImportScript?: () => void,
    isFullWidth?: boolean,
};

export const AppHeader = ({
    leftControls,
    scriptControls,
    onHome,
    onNewScript,
    onImportScript,
    isFullWidth = false,
}: AppHeaderProps) => {
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
                    <Tooltip label="Home" placement="bottom">
                        <Button
                            className={styles.iconButton}
                            onPress={onHome}
                            aria-label="Go to home"
                        >
                            <HomeIcon className={styles.icon} aria-hidden="true" />
                        </Button>
                    </Tooltip>
                    {onNewScript ? (
                        <Tooltip label="New script" placement="bottom">
                            <Button
                                className={styles.iconButton}
                                onPress={onNewScript}
                                aria-label="New script"
                            >
                                <PlusIcon className={styles.icon} aria-hidden="true" />
                            </Button>
                        </Tooltip>
                    ) : null}
                    {onImportScript ? (
                        <Tooltip label="Import script" placement="bottom">
                            <Button
                                className={styles.iconButton}
                                onPress={onImportScript}
                                aria-label="Import script"
                            >
                                <UploadIcon className={styles.icon} aria-hidden="true" />
                            </Button>
                        </Tooltip>
                    ) : null}
                    {leftControls ?? null}
                </div>
                <div className={styles.scriptControls}>
                    {scriptControls ?? null}
                </div>
                <div className={styles.rightControls}>
                    <AccountMenu
                        themeMode={themeMode}
                        onThemeChange={setThemeMode}
                    />
                </div>
            </div>
        </header>
    );
};

export type ScriptEditorAppHeaderProps = {
    currentScript: ScriptListItem,
    recentScripts?: ScriptListItem[],
    onSelectScript: (script: ScriptListItem) => void,
    onMenuAction?: (actionId: string) => void,
    scriptSyncState?: ScriptSyncState,
    onHome: () => void,
    onBackToEditor?: () => void,
    backToEditorLabel?: string,
    isFullWidth?: boolean,
    activeView: ScriptView,
    onSelectView: (view: ScriptView) => void,
};

export const ScriptEditorAppHeader = ({
    currentScript,
    recentScripts = [],
    onSelectScript,
    onMenuAction,
    scriptSyncState,
    onHome,
    onBackToEditor,
    backToEditorLabel = 'Back to editor',
    isFullWidth = true,
    activeView,
    onSelectView,
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
        <AppHeader
            onHome={onHome}
            isFullWidth={isFullWidth}
            scriptControls={<ViewSwitcher activeView={activeView} onSelectView={onSelectView} />}
            leftControls={(
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
