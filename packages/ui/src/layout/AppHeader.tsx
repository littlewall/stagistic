import clsx from 'clsx';
import {
    type ReactNode,
    useEffect,
    useState,
} from 'react';
import {Button} from 'react-aria-components';

import {Tooltip} from '../atoms/Tooltip';
import {
    AttributeManagerIcon,
    DownloadIcon,
    HomeIcon,
    PlusIcon,
    SettingsIcon,
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
import {ScriptTitle} from './header/ScriptTitle';
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
    scriptActions?: ReactNode,
    onHome: () => void,
    onNewScript?: () => void,
    onImportScript?: () => void,
    isFullWidth?: boolean,
    contentInset?: 'default' | 'page',
};

export const AppHeader = ({
    leftControls,
    scriptControls,
    scriptActions,
    onHome,
    onNewScript,
    onImportScript,
    isFullWidth = false,
    contentInset = 'default',
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
            <div
                className={clsx(
                    styles.inner,
                    isFullWidth && styles.full,
                    contentInset === 'page' && styles.pageInset,
                )}
            >
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
                    {scriptActions ? (
                        <>
                            <div className={styles.actionGroup}>
                                {scriptActions}
                            </div>
                            <span className={styles.actionDivider} aria-hidden="true" />
                        </>
                    ) : null}
                    <div className={styles.actionGroup}>
                        <AccountMenu
                            themeMode={themeMode}
                            onThemeChange={setThemeMode}
                        />
                    </div>
                </div>
            </div>
        </header>
    );
};

export type ScriptEditorAppHeaderProps = {
    currentScript: ScriptListItem,
    onMenuAction?: (actionId: string) => void,
    onRenameScript?: (name: string) => void,
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
    onMenuAction,
    onRenameScript,
    scriptSyncState,
    onHome,
    onBackToEditor,
    backToEditorLabel = 'Back to editor',
    isFullWidth = true,
    activeView,
    onSelectView,
}: ScriptEditorAppHeaderProps) => {
    return (
        <AppHeader
            onHome={onHome}
            isFullWidth={isFullWidth}
            scriptControls={<ViewSwitcher activeView={activeView} onSelectView={onSelectView} />}
            scriptActions={onMenuAction ? (
                <>
                    <Tooltip label="Open script settings" placement="bottom">
                        <Button
                            className={styles.iconButton}
                            aria-label="Open script settings"
                            onPress={() => onMenuAction('settings')}
                        >
                            <SettingsIcon className={styles.icon} aria-hidden="true" />
                        </Button>
                    </Tooltip>
                    <Tooltip label="Open attribute manager" placement="bottom">
                        <Button
                            className={styles.iconButton}
                            aria-label="Open attribute manager"
                            onPress={() => onMenuAction('attributes')}
                        >
                            <AttributeManagerIcon className={styles.icon} aria-hidden="true" />
                        </Button>
                    </Tooltip>
                    <Tooltip label="Download .stagistic file" placement="bottom">
                        <Button
                            className={styles.iconButton}
                            aria-label="Download .stagistic file"
                            onPress={() => onMenuAction('export-stagistic')}
                        >
                            <DownloadIcon className={styles.icon} aria-hidden="true" />
                        </Button>
                    </Tooltip>
                </>
            ) : null}
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
                    <div className={styles.scriptIdentity}>
                        <ScriptTitle name={currentScript.name} onRename={onRenameScript} />
                        <SyncIndicator state={scriptSyncState} />
                    </div>
                </>
            )}
        />
    );
};
