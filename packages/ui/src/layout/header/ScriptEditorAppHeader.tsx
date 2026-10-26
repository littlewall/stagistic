import clsx from 'clsx';
import type {ReactNode} from 'react';
import {Button as RACButton, MenuTrigger} from 'react-aria-components';

import {Button} from '../../atoms/Button/Button';
import {Tooltip} from '../../atoms/Tooltip/Tooltip';
import {
    AttributeManagerIcon,
    DownloadIcon,
    SettingsIcon,
} from '../../icons/ui';
import {DropdownMenu} from '../../molecules/DropdownMenu/DropdownMenu';
import styles from '../AppHeader.module.css';
import {AppHeader} from './AppHeaderShell';
import {ScriptTitle} from './ScriptTitle';
import {SyncIndicator} from './SyncIndicator';
import type {
    ScriptListItem,
    ScriptSyncState,
    ScriptView,
} from './types';
import {ViewSwitcher} from './ViewSwitcher';

export type ScriptEditorAppHeaderProps = {
    currentScript: ScriptListItem,
    onMenuAction?: (actionId: string, returnFocus?: HTMLElement | null) => void,
    onRenameScript?: (name: string) => void,
    scriptSyncState?: ScriptSyncState,
    onHome: () => void,
    onOpenSettings?: (returnFocus?: HTMLElement | null) => void,
    onBackToEditor?: () => void,
    backToEditorLabel?: string,
    isFullWidth?: boolean,
    activeView: ScriptView,
    onSelectView: (view: ScriptView) => void,
    /** Chooses the shown script state (current, draft or version); sits after the title. */
    scriptState?: ReactNode,
};

export const ScriptEditorAppHeader = ({
    currentScript,
    onMenuAction,
    onRenameScript,
    scriptSyncState,
    onHome,
    onOpenSettings,
    onBackToEditor,
    backToEditorLabel = 'Back to editor',
    isFullWidth = true,
    activeView,
    onSelectView,
    scriptState,
}: ScriptEditorAppHeaderProps) => {
    return (
        <AppHeader
            onHome={onHome}
            onOpenSettings={onOpenSettings}
            isFullWidth={isFullWidth}
            scriptControls={(
                <ViewSwitcher
                    activeView={activeView}
                    onSelectView={onSelectView}
                />
            )}
            scriptActions={
                onMenuAction ? (
                    <>
                        <Tooltip
                            label="Open script settings"
                            placement="bottom"
                        >
                            <Button
                                variant="ghost"
                                size="icon"
                                aria-label="Open script settings"
                                onPress={event => onMenuAction('settings', event.target as HTMLElement)}
                            >
                                <SettingsIcon
                                    className={styles.icon}
                                    aria-hidden="true"
                                />
                            </Button>
                        </Tooltip>
                        <Tooltip
                            label="Open attribute manager"
                            placement="bottom"
                        >
                            <Button
                                variant="ghost"
                                size="icon"
                                aria-label="Open attribute manager"
                                onPress={event => onMenuAction('attributes', event.target as HTMLElement)}
                            >
                                <AttributeManagerIcon
                                    className={styles.icon}
                                    aria-hidden="true"
                                />
                            </Button>
                        </Tooltip>
                        <MenuTrigger>
                            <Tooltip
                                label="Download"
                                placement="bottom"
                            >
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    aria-label="Download script"
                                >
                                    <DownloadIcon
                                        className={styles.icon}
                                        aria-hidden="true"
                                    />
                                </Button>
                            </Tooltip>
                            <DropdownMenu
                                aria-label="Download script"
                                items={[{id: 'export-stagistic', label: 'Script (.stagistic)'}, {id: 'export-stepkg', label: 'Script & metadata (.stepkg)'}]}
                                onAction={key => onMenuAction(String(key))}
                            />
                        </MenuTrigger>
                    </>
                ) : null
            }
            leftControls={(
                <>
                    {onBackToEditor ? (
                        <RACButton
                            className={clsx(styles.menuTrigger, styles.backButton)}
                            onPress={onBackToEditor}
                        >
                            {backToEditorLabel}
                        </RACButton>
                    ) : null}
                    <div
                        className={clsx(styles.scriptIdentity, scriptState && styles.scriptIdentityWithState)}
                        data-script-identity
                    >
                        <ScriptTitle
                            name={currentScript.name}
                            onRename={onRenameScript}
                        />
                        {scriptState}
                        <SyncIndicator state={scriptSyncState} />
                    </div>
                </>
            )}
        />
    );
};
