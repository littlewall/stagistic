import {
    Folder, Home, NavArrowDown, Plus, UserCircle,
} from 'iconoir-react';
import {useCallback, useMemo} from 'react';
import {
    Button,
    Header as MenuHeader,
    Menu,
    MenuItem,
    MenuSection,
    MenuTrigger,
    Popover,
    Separator,
    Tooltip,
    TooltipTrigger,
} from 'react-aria-components';

import styles from './AppHeader.module.css';

export type Script = {
    id: string,
    name: string,
};

export type ScriptSyncState = 'saved' | 'saving' | 'error';

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
    const script = currentScript;
    const handleSelectScript = onSelectScript;
    const canShowScriptMenu = useMemo(
        () => Boolean(showScriptMenu && script && handleSelectScript),
        [
            handleSelectScript,
            script,
            showScriptMenu,
        ],
    );
    const showSyncState = canShowScriptMenu;
    const syncMeta = useMemo(() => {
        const resolvedSyncState = scriptSyncState ?? 'saved';

        return {
            label: resolvedSyncState === 'saving'
                ? 'Saving'
                : resolvedSyncState === 'error'
                    ? 'Error'
                    : 'Saved',
            className: resolvedSyncState === 'saving'
                ? styles.scriptStatusSaving
                : resolvedSyncState === 'error'
                    ? styles.scriptStatusError
                    : styles.scriptStatusSaved,
        };
    }, [scriptSyncState]);
    const handleMenuAction = useCallback((key: string | number) => {
        if (typeof key !== 'string') {
            return;
        }

        if (key.startsWith('script:')) {
            const scriptId = key.replace('script:', '');
            const script = recentScripts.find(item => item.id === scriptId);

            if (script && handleSelectScript) {
                handleSelectScript(script);
            }

            return;
        }

        if (onMenuAction) {
            onMenuAction(key);
        }
    }, [
        handleSelectScript,
        onMenuAction,
        recentScripts,
    ]);

    return (
        <header className={styles.header} data-tauri-drag-region>
            <div className={styles.leftControls}>
                <Button
                    className={styles.iconButton}
                    onPress={onHome}
                    aria-label="Go to home"
                    data-tauri-drag-region="false"
                >
                    <Home className={styles.iconButtonGlyph} aria-hidden="true" />
                </Button>
                <Button
                    className={styles.iconButton}
                    onPress={onNewScript}
                    aria-label="New script"
                    data-tauri-drag-region="false"
                >
                    <Plus className={styles.iconButtonGlyph} aria-hidden="true" />
                </Button>
            </div>
            <div className={styles.scriptControls}>
                {onBackToEditor ? (
                    <Button
                        className={`${styles.menuTrigger} ${styles.backButton}`}
                        onPress={onBackToEditor}
                        data-tauri-drag-region="false"
                    >
                        {backToEditorLabel}
                    </Button>
                ) : null}
                {canShowScriptMenu ? (
                    <MenuTrigger>
                        <Button className={styles.menuTrigger} data-tauri-drag-region="false">
                            <span className={styles.menuTriggerLabel}>{script!.name}</span>
                            <NavArrowDown className={styles.caret} aria-hidden="true" />
                        </Button>
                        <Popover className={styles.menuPopover} placement="bottom">
                            <Menu
                                className={styles.menu}
                                onAction={handleMenuAction}
                            >
                                <MenuSection className={styles.menuSection}>
                                    <MenuItem className={styles.currentScriptBlock} isDisabled>
                                        <span className={styles.currentScriptLabel}>Current script</span>
                                        <span className={styles.currentScriptName}>{script!.name}</span>
                                    </MenuItem>
                                    <MenuItem className={styles.menuItem} id="settings">
                                        Script settings
                                    </MenuItem>
                                    <MenuItem className={styles.menuItem} id="attributes">
                                        Attribute manager
                                    </MenuItem>
                                </MenuSection>
                                {recentScripts.length > 0 ? (
                                    <>
                                        <Separator className={styles.menuSeparator} />
                                        <MenuSection className={styles.menuSection}>
                                            <MenuHeader className={styles.menuHeader}>Recent scripts</MenuHeader>
                                            {recentScripts.map(scriptItem => (
                                                <MenuItem
                                                    key={scriptItem.id}
                                                    id={`script:${scriptItem.id}`}
                                                    className={styles.menuItem}
                                                >
                                                    {scriptItem.name}
                                                </MenuItem>
                                            ))}
                                        </MenuSection>
                                    </>
                                ) : null}
                                <Separator className={styles.menuSeparator} />
                                <MenuSection className={styles.menuSection}>
                                    <MenuItem className={styles.menuItem} id="scripts">
                                        <Folder className={styles.menuIcon} aria-hidden="true" />
                                        All scripts
                                    </MenuItem>
                                    <MenuItem className={styles.menuItem} id="new-script">
                                        <Plus className={styles.menuIcon} aria-hidden="true" />
                                        New script
                                    </MenuItem>
                                </MenuSection>
                            </Menu>
                        </Popover>
                    </MenuTrigger>
                ) : null}
                {showSyncState ? (
                    <TooltipTrigger>
                        <span
                            className={styles.scriptStatus}
                            aria-label={syncMeta.label}
                            aria-live="polite"
                            tabIndex={0}
                        >
                            <span
                                className={`${styles.scriptStatusDot} ${syncMeta.className}`}
                                aria-hidden="true"
                            />
                        </span>
                        <Tooltip className={styles.tooltip}>
                            {syncMeta.label}
                        </Tooltip>
                    </TooltipTrigger>
                ) : null}
            </div>
            <MenuTrigger>
                <Button className={styles.avatarTrigger} data-tauri-drag-region="false">
                    <UserCircle className={styles.avatarIcon} aria-hidden="true" />
                    <NavArrowDown className={styles.caret} aria-hidden="true" />
                </Button>
                <Popover className={styles.menuPopover} placement="bottom end">
                    <Menu className={styles.menu}>
                        <MenuItem className={styles.menuItem} id="profile">
                            Account settings
                        </MenuItem>
                        <Separator className={styles.menuSeparator} />
                        <MenuItem className={styles.menuItem} id="logout">
                            Sign out
                        </MenuItem>
                    </Menu>
                </Popover>
            </MenuTrigger>
        </header>
    );
};
