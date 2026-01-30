import {
    Folder, NavArrowDown, Plus, UserCircle,
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

export type Project = {
    id: string,
    name: string,
};

type AppHeaderProps = {
    currentProject: Project,
    recentProjects: Project[],
    onSelectProject: (project: Project) => void,
};

export function AppHeader({
    currentProject, recentProjects, onSelectProject,
}: AppHeaderProps) {
    return (
        <header className={styles.header} data-tauri-drag-region>
            <div className={styles.logo}>
                <span className={styles.logoMark} aria-hidden="true">
                    S
                </span>
                <span className={styles.logoText}>Stagistic Editor</span>
            </div>
            <MenuTrigger>
                <Button className={styles.menuTrigger} data-tauri-drag-region="false">
                    <span className={styles.menuTriggerLabel}>{currentProject.name}</span>
                    <NavArrowDown className={styles.caret} aria-hidden="true" />
                </Button>
                <Popover className={styles.menuPopover} placement="bottom">
                    <Menu
                        className={styles.menu}
                        onAction={key => {
                            if (typeof key === 'string' && key.startsWith('project:')) {
                                const projectId = key.replace('project:', '');
                                const project = recentProjects.find(item => item.id === projectId);

                                if (project) {
                                    onSelectProject(project);
                                }
                            }
                        }}
                    >
                        <MenuSection className={styles.menuSection}>
                            <MenuItem className={styles.currentProjectBlock} isDisabled>
                                <span className={styles.currentProjectLabel}>Current project</span>
                                <span className={styles.currentProjectName}>{currentProject.name}</span>
                            </MenuItem>
                            <MenuItem className={styles.menuItem} id="settings">
                                Project settings
                            </MenuItem>
                            <MenuItem className={styles.menuItem} id="attributes">
                                Attribute manager
                            </MenuItem>
                        </MenuSection>
                        {recentProjects.length > 0 ? (
                            <>
                                <Separator className={styles.menuSeparator} />
                                <MenuSection className={styles.menuSection}>
                                    <MenuHeader className={styles.menuHeader}>Recent projects</MenuHeader>
                                    {recentProjects.map(project => (
                                        <MenuItem
                                            key={project.id}
                                            id={`project:${project.id}`}
                                            className={styles.menuItem}
                                        >
                                            {project.name}
                                        </MenuItem>
                                    ))}
                                </MenuSection>
                            </>
                        ) : null}
                        <Separator className={styles.menuSeparator} />
                        <MenuSection className={styles.menuSection}>
                            <MenuItem className={styles.menuItem} id="projects">
                                <Folder className={styles.menuIcon} aria-hidden="true" />
                                All projects
                            </MenuItem>
                            <MenuItem className={styles.menuItem} id="new-project">
                                <Plus className={styles.menuIcon} aria-hidden="true" />
                                New project
                            </MenuItem>
                        </MenuSection>
                    </Menu>
                </Popover>
            </MenuTrigger>
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
