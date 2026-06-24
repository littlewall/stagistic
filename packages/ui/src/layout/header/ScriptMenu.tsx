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

import {
    ChevronDownIcon, FolderIcon, PlusIcon,
} from '../../icons/ui';
import styles from '../AppHeader.module.css';
import type {ScriptListItem} from './types';

type ScriptMenuProps = {
    script: ScriptListItem,
    recentScripts: ScriptListItem[],
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
                <span className={styles.label}>{script.name}</span>
                <ChevronDownIcon className={styles.caret} aria-hidden="true" />
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
                </Menu>
            </Popover>
        </MenuTrigger>
    );
};
