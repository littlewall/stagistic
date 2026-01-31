import {
    Folder, Home, NavArrowDown, Plus, UserCircle,
} from 'iconoir-react';
import {
    Button,
    Header as MenuHeader,
    Menu,
    MenuItem,
    MenuSection,
    MenuTrigger,
    Popover,
    Separator,
} from 'react-aria-components';

import styles from './AppHeader.module.css';

export type Script = {
    id: string,
    name: string,
};

type AppHeaderProps = {
    currentScript?: Script,
    recentScripts?: Script[],
    onSelectScript?: (script: Script) => void,
    onMenuAction?: (actionId: string) => void,
    showScriptMenu?: boolean,
    onHome?: () => void,
    onBackToEditor?: () => void,
    backToEditorLabel?: string,
};

export function AppHeader({
    currentScript,
    recentScripts = [],
    onSelectScript,
    onMenuAction,
    showScriptMenu = true,
    onHome,
    onBackToEditor,
    backToEditorLabel = 'Back to editor',
}: AppHeaderProps) {
    const script = currentScript;
    const handleSelectScript = onSelectScript;
    const canShowScriptMenu = Boolean(showScriptMenu && script && handleSelectScript);

    return (
        <header className={styles.header} data-tauri-drag-region>
            <div className={styles.logo}>
                <span className={styles.logoMark} aria-hidden="true">
                    S
                </span>
                <span className={styles.logoText}>Stagistic Editor</span>
            </div>
            {canShowScriptMenu || onHome || onBackToEditor ? (
                <div className={styles.scriptControls}>
                    {onHome ? (
                        <Button
                            className={styles.iconButton}
                            onPress={onHome}
                            aria-label="Go to home"
                            data-tauri-drag-region="false"
                        >
                            <Home className={styles.iconButtonGlyph} aria-hidden="true" />
                        </Button>
                    ) : null}
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
                                    onAction={key => {
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
                                    }}
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
                </div>
            ) : null}
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
}
