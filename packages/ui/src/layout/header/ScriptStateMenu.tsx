import clsx from 'clsx';
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

import {ChevronDownIcon} from '../../icons';
import styles from './ScriptStateMenu.module.css';

export interface ScriptStateMenuItem {
    id: string,
    label: string,
    /** Secondary line, e.g. date · reason, or “from Draft 7”. */
    detail?: string | null,
}

export interface ScriptStateMenuProps {
    /** Trigger text: “Current”, “Draft 3” or a version name. */
    label: string,
    /** Id of the stored state on screen; null for the current script. */
    selectedId: string | null,
    versions: readonly ScriptStateMenuItem[],
    drafts: readonly ScriptStateMenuItem[],
    onSelect: (snapshotId: string | null) => void,
    /** Saving applies to the current script; omit while a stored state is on screen. */
    onSaveDraft?: () => void,
    onSaveVersion?: () => void,
    onManage?: () => void,
    /** Shown next to the menu while a stored state is on screen. */
    restore?: {
        onRestore: () => void,
        onRestoreAsNew: () => void,
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
            <span className={styles.itemLabel}>{item.label}</span>
            {item.detail ? <span className={styles.itemDetail}>{item.detail}</span> : null}
        </span>
        {isSelected ? <span className={styles.currentMark} aria-hidden="true">✓</span> : null}
    </MenuItem>
);

/**
 * Chooses which state of the script is on screen: the editable current script
 * or a stored, read-only draft or version.
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
    const {contains} = useFilter({sensitivity: 'base'});
    const hasFilter = versions.length + drafts.length > FILTER_THRESHOLD;
    const hasActions = Boolean(onSaveDraft ?? onSaveVersion ?? onManage);

    const handleAction = (key: string) => {
        if (key === CURRENT_KEY) {
            onSelect(null);
        } else if (key.startsWith(SNAPSHOT_KEY_PREFIX)) {
            onSelect(key.slice(SNAPSHOT_KEY_PREFIX.length));
        } else if (key === 'save-draft') {
            onSaveDraft?.();
        } else if (key === 'save-version') {
            onSaveVersion?.();
        } else if (key === 'manage') {
            onManage?.();
        }
    };

    const menu = (
        <Menu
            className={styles.menu}
            aria-label="Script states"
            onAction={key => handleAction(String(key))}
        >
            <MenuItem
                id={CURRENT_KEY}
                className={styles.item}
                textValue="Current"
                aria-current={selectedId === null ? 'true' : undefined}
            >
                <span className={styles.itemText}>
                    <span className={styles.itemLabel}>Current</span>
                </span>
                {selectedId === null ? <span className={styles.currentMark} aria-hidden="true">✓</span> : null}
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
            {hasActions ? (
                <MenuSection className={clsx(styles.section, styles.actions)}>
                    {onSaveDraft ? <MenuItem id="save-draft" className={styles.item}>Save as new draft…</MenuItem> : null}
                    {onSaveVersion ? <MenuItem id="save-version" className={styles.item}>Save as version…</MenuItem> : null}
                    {onManage ? <MenuItem id="manage" className={styles.item}>Manage drafts and versions…</MenuItem> : null}
                </MenuSection>
            ) : null}
        </Menu>
    );

    return (
        <div className={styles.root}>
            <MenuTrigger>
                <Button
                    className={clsx(styles.trigger, selectedId !== null && styles.triggerStored)}
                    aria-label={`Script state: ${label}`}
                >
                    <span className={styles.triggerLabel}>{label}</span>
                    <ChevronDownIcon className={styles.chevron} aria-hidden="true" />
                </Button>
                <Popover className={styles.popover} placement="bottom start">
                    {hasFilter ? (
                        <Autocomplete filter={contains}>
                            <SearchField className={styles.filter} aria-label="Filter drafts and versions" autoFocus>
                                <Input className={styles.filterInput} placeholder="Filter…" />
                            </SearchField>
                            {menu}
                        </Autocomplete>
                    ) : menu}
                </Popover>
            </MenuTrigger>
            {restore ? (
                <MenuTrigger>
                    <Button className={styles.restoreTrigger}>Restore…</Button>
                    <Popover className={styles.popover} placement="bottom start">
                        <Menu
                            className={styles.menu}
                            aria-label="Restore"
                            onAction={key => (key === 'restore' ? restore.onRestore() : restore.onRestoreAsNew())}
                        >
                            <MenuItem id="restore" className={styles.item}>Restore to this script</MenuItem>
                            <MenuItem id="restore-as-new" className={styles.item}>Restore as new script</MenuItem>
                        </Menu>
                    </Popover>
                </MenuTrigger>
            ) : null}
        </div>
    );
};
