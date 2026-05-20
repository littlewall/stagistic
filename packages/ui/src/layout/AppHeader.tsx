import clsx from 'clsx';
import {
    Home,
    Plus,
} from 'iconoir-react';
import {
    type ReactNode,
    useCallback,
    useEffect,
    useState,
} from 'react';
import {Button} from 'react-aria-components';

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
    isFullWidth?: boolean,
};

const AppHeaderFrame = ({
    scriptControls,
    onMenuAction,
    onHome,
    onNewScript,
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
            <div className={clsx(styles.headerInner, isFullWidth && styles.headerInnerFull)}>
                <div className={styles.leftControls}>
                    <Button
                        className={styles.iconButton}
                        onPress={onHome}
                        aria-label="Go to home"
                    >
                        <Home className={styles.iconButtonGlyph} aria-hidden="true" />
                    </Button>
                    <Button
                        className={styles.iconButton}
                        onPress={onNewScript}
                        aria-label="New script"
                    >
                        <Plus className={styles.iconButtonGlyph} aria-hidden="true" />
                    </Button>
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
    onMenuAction?: (actionId: string) => void,
    isFullWidth?: boolean,
};

export const AppHeader = ({
    onMenuAction,
    onHome,
    onNewScript,
    isFullWidth = false,
}: AppHeaderProps) => (
    <AppHeaderFrame
        onMenuAction={onMenuAction}
        onHome={onHome}
        onNewScript={onNewScript}
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
    onBackToEditor?: () => void,
    backToEditorLabel?: string,
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
    onBackToEditor,
    backToEditorLabel = 'Back to editor',
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
