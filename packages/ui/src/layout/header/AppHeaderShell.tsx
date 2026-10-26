import clsx from 'clsx';
import type {ReactNode} from 'react';

import {Button} from '../../atoms/Button/Button';
import {Tooltip} from '../../atoms/Tooltip/Tooltip';
import {
    HomeIcon,
    PlusIcon,
    UploadIcon,
    UserCircleIcon,
} from '../../icons/ui';
import styles from '../AppHeader.module.css';

export type AppHeaderProps = {
    leftControls?: ReactNode,
    scriptControls?: ReactNode,
    scriptActions?: ReactNode,
    onHome: () => void,
    onNewScript?: (returnFocus?: HTMLElement | null) => void,
    onImportScript?: (returnFocus?: HTMLElement | null) => void,
    /** Opens the app settings (appearance and platform integrations). */
    onOpenSettings?: (returnFocus?: HTMLElement | null) => void,
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
    onOpenSettings,
    isFullWidth = false,
    contentInset = 'default',
}: AppHeaderProps) => {
    return (
        <header className={styles.header}>
            <div
                className={styles.dragRegion}
                data-tauri-drag-region
                aria-hidden="true"
            />
            <div
                className={clsx(styles.inner, isFullWidth && styles.full, contentInset === 'page' && styles.pageInset)}
                data-tauri-drag-region
            >
                <div
                    className={styles.leftControls}
                    data-tauri-drag-region
                >
                    <Tooltip
                        label="Home"
                        placement="bottom"
                    >
                        <Button
                            variant="ghost"
                            size="icon"
                            onPress={onHome}
                            aria-label="Go to home"
                        >
                            <HomeIcon
                                className={styles.icon}
                                aria-hidden="true"
                            />
                        </Button>
                    </Tooltip>
                    {onNewScript ? (
                        <Tooltip
                            label="New script"
                            placement="bottom"
                        >
                            <Button
                                variant="ghost"
                                size="icon"
                                onPress={event => onNewScript(event.target as HTMLElement)}
                                aria-label="New script"
                            >
                                <PlusIcon
                                    className={styles.icon}
                                    aria-hidden="true"
                                />
                            </Button>
                        </Tooltip>
                    ) : null}
                    {onImportScript ? (
                        <Tooltip
                            label="Import script"
                            placement="bottom"
                        >
                            <Button
                                variant="ghost"
                                size="icon"
                                onPress={event => onImportScript(event.target as HTMLElement)}
                                aria-label="Import script"
                            >
                                <UploadIcon
                                    className={styles.icon}
                                    aria-hidden="true"
                                />
                            </Button>
                        </Tooltip>
                    ) : null}
                    {leftControls ?? null}
                </div>
                <div
                    className={styles.scriptControls}
                    data-tauri-drag-region
                >
                    {scriptControls ?? null}
                </div>
                <div
                    className={styles.rightControls}
                    data-tauri-drag-region
                >
                    {scriptActions ? (
                        <>
                            <div className={styles.actionGroup}>{scriptActions}</div>
                            <span
                                className={styles.actionDivider}
                                aria-hidden="true"
                            />
                        </>
                    ) : null}
                    {onOpenSettings ? (
                        <div className={styles.actionGroup}>
                            {/*
                             * Not a cog: the gear beside it already opens the script's own
                             * settings. These belong to the person, not the script.
                             */}
                            <Tooltip
                                label="Settings"
                                placement="bottom"
                            >
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onPress={event => onOpenSettings(event.target as HTMLElement)}
                                    aria-label="Open settings"
                                >
                                    <UserCircleIcon
                                        className={styles.icon}
                                        aria-hidden="true"
                                    />
                                </Button>
                            </Tooltip>
                        </div>
                    ) : null}
                </div>
            </div>
        </header>
    );
};
