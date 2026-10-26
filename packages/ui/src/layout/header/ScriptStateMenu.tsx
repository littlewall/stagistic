import clsx from 'clsx';
import {useRef} from 'react';
import {useFilter} from 'react-aria';
import {
    Autocomplete,
    Button,
    Header,
    Input,
    Menu,
    MenuItem,
    MenuSection,
    MenuTrigger,
    Popover,
    SearchField,
} from 'react-aria-components';

import {Tooltip} from '../../atoms/Tooltip/Tooltip';
import {
    AttributeManagerIcon,
    ChevronDownIcon,
    ClockIcon,
    LockIcon,
} from '../../icons';
import styles from './ScriptStateMenu.module.css';

export interface ScriptStateMenuItem {
    id: string,
    label: string,
    /** Secondary line, e.g. “from Draft #7” · reason. */
    detail?: string | null,
    /** Save time, shown as a tooltip on the clock after the label. */
    savedAt?: string | null,
}

export interface ScriptStateMenuProps {
    /** Trigger text: “Current”, “Draft #3” or a version name. */
    label: string,
    /** Id of the stored state on screen; null for the current script. */
    selectedId: string | null,
    versions: readonly ScriptStateMenuItem[],
    drafts: readonly ScriptStateMenuItem[],
    onSelect: (snapshotId: string | null) => void,
    /** Saving applies to the current script; omit while a stored state is on screen. */
    onSaveDraft?: (returnFocus?: HTMLElement | null) => void,
    onSaveVersion?: (returnFocus?: HTMLElement | null) => void,
    onManage?: (returnFocus?: HTMLElement | null) => void,
    /** Offered in the actions menu while a stored state is on screen. */
    restore?: {
        onRestore: (returnFocus?: HTMLElement | null) => void,
        onRestoreAsNew: (returnFocus?: HTMLElement | null) => void,
    },
}

const FILTER_THRESHOLD = 8;
const CURRENT_KEY = 'current';
const SNAPSHOT_KEY_PREFIX = 'snapshot:';

const StateItem = ({item, isSelected}: {item: ScriptStateMenuItem, isSelected: boolean}) => (
    <MenuItem
        id={`${SNAPSHOT_KEY_PREFIX}${item.id}`}
        className={styles.item}
        textValue={[item.label, item.detail].filter(Boolean).join(' ')}
        aria-current={isSelected ? 'true' : undefined}
    >
        <span className={styles.itemText}>
            <span className={styles.itemTitle}>
                <span className={styles.itemLabel}>{item.label}</span>
                {item.savedAt ? (
                    <Tooltip label={`Saved ${item.savedAt}`}>
                        <span className={styles.savedAt} role="img" aria-label={`Saved ${item.savedAt}`} tabIndex={-1}>
                            <ClockIcon className={styles.savedAtIcon} aria-hidden="true" />
                        </span>
                    </Tooltip>
                ) : null}
            </span>
            {item.detail ? <span className={styles.itemDetail}>{item.detail}</span> : null}
        </span>
        {isSelected ? <span className={styles.currentMark} aria-hidden="true">✓</span> : null}
    </MenuItem>
);

/**
 * Split button choosing which state of the script is on screen: the editable
 * current script or a stored, read-only draft or version. The chevron opens the
 * actions for the shown state (save, restore, manage).
 */
export const ScriptStateMenu = ({
    label,
    selectedId,
    versions,
    drafts,
    onSelect,
    onSaveDraft,
    onSaveVersion,
    onManage,
    restore,
}: ScriptStateMenuProps) => {
    const actionTrigger = useRef<HTMLButtonElement>(null);
    const {contains} = useFilter({sensitivity: 'base'});
    const hasFilter = versions.length + drafts.length > FILTER_THRESHOLD;
    const isStored = selectedId !== null;
    const hasPrimaryActions = Boolean(onSaveDraft ?? onSaveVersion ?? restore);
    const hasActions = hasPrimaryActions || Boolean(onManage);

    const handleSelect = (key: string) => {
        if (key === CURRENT_KEY) {
            onSelect(null);
        } else if (key.startsWith(SNAPSHOT_KEY_PREFIX)) {
            onSelect(key.slice(SNAPSHOT_KEY_PREFIX.length));
        }
    };

    const handleAction = (key: string) => {
        if (key === 'save-draft') {
            onSaveDraft?.(actionTrigger.current);
        } else if (key === 'save-version') {
            onSaveVersion?.(actionTrigger.current);
        } else if (key === 'restore') {
            restore?.onRestore(actionTrigger.current);
        } else if (key === 'restore-as-new') {
            restore?.onRestoreAsNew(actionTrigger.current);
        } else if (key === 'manage') {
            onManage?.(actionTrigger.current);
        }
    };

    const stateMenu = (
        <Menu
            className={styles.menu}
            aria-label="Script states"
            onAction={key => handleSelect(String(key))}
        >
            <MenuItem
                id={CURRENT_KEY}
                className={styles.item}
                textValue="Current"
                aria-current={isStored ? undefined : 'true'}
            >
                <span className={styles.itemText}>
                    <span className={styles.itemLabel}>Current</span>
                </span>
                {isStored ? null : <span className={styles.currentMark} aria-hidden="true">✓</span>}
            </MenuItem>
            {versions.length > 0 ? (
                <MenuSection className={styles.section}>
                    <Header className={styles.sectionHeader}>Versions</Header>
                    {versions.map(item => <StateItem key={item.id} item={item} isSelected={item.id === selectedId} />)}
                </MenuSection>
            ) : null}
            {drafts.length > 0 ? (
                <MenuSection className={styles.section}>
                    <Header className={styles.sectionHeader}>Drafts</Header>
                    {drafts.map(item => <StateItem key={item.id} item={item} isSelected={item.id === selectedId} />)}
                </MenuSection>
            ) : null}
        </Menu>
    );

    return (
        <div className={clsx(styles.root, hasActions && styles.split)}>
            <MenuTrigger>
                <Button
                    className={clsx(styles.trigger, styles.stateTrigger)}
                    aria-label={`Script state: ${label}`}
                >
                    {isStored ? <LockIcon className={styles.lock} aria-hidden="true" /> : null}
                    <span className={styles.triggerLabel}>{label}</span>
                    {hasActions ? null : <ChevronDownIcon className={styles.chevron} aria-hidden="true" />}
                </Button>
                <Popover className={styles.popover} placement="bottom start">
                    {hasFilter ? (
                        <Autocomplete filter={contains}>
                            <SearchField className={styles.filter} aria-label="Filter drafts and versions" autoFocus>
                                <Input className={styles.filterInput} placeholder="Filter…" />
                            </SearchField>
                            {stateMenu}
                        </Autocomplete>
                    ) : stateMenu}
                </Popover>
            </MenuTrigger>
            {hasActions ? (
                <MenuTrigger>
                    <Button
                        className={clsx(styles.trigger, styles.actionsTrigger)}
                        ref={actionTrigger}
                        aria-label="Script state actions"
                    >
                        <ChevronDownIcon className={styles.chevron} aria-hidden="true" />
                    </Button>
                    <Popover className={styles.popover} placement="bottom start">
                        <Menu
                            className={styles.menu}
                            aria-label="Script state actions"
                            onAction={key => handleAction(String(key))}
                        >
                            {hasPrimaryActions ? (
                                <MenuSection className={styles.firstSection}>
                                    {onSaveDraft ? <MenuItem id="save-draft" className={styles.item}>Save as new draft</MenuItem> : null}
                                    {onSaveVersion ? <MenuItem id="save-version" className={styles.item}>Save as version</MenuItem> : null}
                                    {restore ? <MenuItem id="restore" className={styles.item}>Restore to this script</MenuItem> : null}
                                    {restore ? <MenuItem id="restore-as-new" className={styles.item}>Restore as new script</MenuItem> : null}
                                </MenuSection>
                            ) : null}
                            {onManage ? (
                                <MenuSection className={hasPrimaryActions ? styles.section : styles.firstSection}>
                                    <MenuItem id="manage" className={styles.item} textValue="Manage drafts and versions">
                                        Manage drafts and versions
                                        <AttributeManagerIcon className={styles.itemIcon} aria-hidden="true" />
                                    </MenuItem>
                                </MenuSection>
                            ) : null}
                        </Menu>
                    </Popover>
                </MenuTrigger>
            ) : null}
        </div>
    );
};
