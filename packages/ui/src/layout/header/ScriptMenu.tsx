import {
    Folder,
    NavArrowDown,
    Plus,
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

import styles from '../AppHeader.module.css';
import type {Script} from './types';

type ScriptMenuProps = {
    script: Script,
    recentScripts: Script[],
    onAction: (actionKey: string) => void,
};

export const ScriptMenu = ({
    script,
    recentScripts,
    onAction,
}: ScriptMenuProps) => {
    return (
        <MenuTrigger>
            <Button className={styles.menuTrigger}>
                <span className={styles.menuTriggerLabel}>{script.name}</span>
                <NavArrowDown className={styles.caret} aria-hidden="true" />
            </Button>
            <Popover className={styles.menuPopover} placement="bottom">
                <Menu
                    className={styles.menu}
                    onAction={key => {
                        if (typeof key !== 'string') {
                            return;
                        }

                        onAction(key);
                    }}
                >
                    <MenuSection className={styles.menuSection}>
                        <MenuItem className={styles.currentScriptBlock} isDisabled>
                            <span className={styles.currentScriptLabel}>Current script</span>
                            <span className={styles.currentScriptName}>{script.name}</span>
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
    );
};
