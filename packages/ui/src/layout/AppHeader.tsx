import clsx from 'clsx';
import {
    Home,
    Plus,
} from 'iconoir-react';
import {
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
    Script,
    ScriptSyncState,
} from './header/types';

export type {
    Script,
    ScriptSyncState,
};

type AppHeaderProps = {
    currentScript?: Script,
    recentScripts?: Script[],
    onSelectScript?: (script: Script) => void,
    onMenuAction?: (actionId: string) => void,
    showScriptMenu?: boolean,
    scriptSyncState?: ScriptSyncState,
    onHome: () => void,
    onNewScript: () => void,
    onBackToEditor?: () => void,
    backToEditorLabel?: string,
};

export const AppHeader = ({
    currentScript,
    recentScripts = [],
    onSelectScript,
    onMenuAction,
    showScriptMenu = true,
    scriptSyncState,
    onHome,
    onNewScript,
    onBackToEditor,
    backToEditorLabel = 'Back to editor',
}: AppHeaderProps) => {
    const [themeMode, setThemeMode] = useState<AppThemeMode>(() => readPreferredAppThemeMode());
    const canShowScriptMenu = Boolean(showScriptMenu && currentScript && onSelectScript);

    const handleMenuAction = useCallback((key: string) => {
        if (key.startsWith('script:')) {
            const scriptId = key.replace('script:', '');
            const script = recentScripts.find(item => item.id === scriptId);

            if (script && onSelectScript) {
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
                {onBackToEditor ? (
                    <Button
                        className={clsx(styles.menuTrigger, styles.backButton)}
                        onPress={onBackToEditor}
                    >
                        {backToEditorLabel}
                    </Button>
                ) : null}
                {canShowScriptMenu && currentScript ? (
                    <ScriptMenu
                        script={currentScript}
                        recentScripts={recentScripts}
                        onAction={handleMenuAction}
                    />
                ) : null}
                {canShowScriptMenu ? (
                    <SyncIndicator state={scriptSyncState} />
                ) : null}
            </div>
            <div className={styles.rightControls}>
                <AccountMenu
                    themeMode={themeMode}
                    onThemeChange={setThemeMode}
                    onAction={onMenuAction}
                />
            </div>
        </header>
    );
};
