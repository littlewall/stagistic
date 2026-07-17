import {
    useEditorElementSelection,
    useEditorInstance,
    useEditorLiveCues,
    useFocusEditorBlock,
} from '@stagistic/editor';
import {formatCueNumber} from '@stagistic/script';
import {
    clsx,
    LinkSlashIcon,
    Tooltip,
    TrashIcon,
} from '@stagistic/ui';
import {
    type ReactNode,
    useCallback,
    useMemo,
    useState,
} from 'react';

import {ATTRIBUTE_MANAGER_PANEL_CUES} from '../../attributes/attributeManagerMenu';
import {SidebarMiniHeader} from '../sidebar';
import {AttributeManagerSidebarButton} from '../sidebar/AttributeManagerSidebarButton';
import {SidebarActionsGroup} from '../sidebar/SidebarActionsGroup';
import {CuesSidebarContextActions} from './CuesSidebarContextActions';
import {DeleteCueModal} from './DeleteCueModal';
import styles from './ScriptCuesSidebar.module.css';
import type {ScriptCueListItem} from './types';
import {UnassignCueModal} from './UnassignCueModal';

interface ScriptCuesSidebarProps {
    cues: readonly ScriptCueListItem[],
    isLoading?: boolean,
    onAddCue: () => void,
    onDeleteCue: (cueId: string) => void | Promise<void>,
    onUnassignCue: (cueId: string) => void | Promise<void>,
}

interface RowActionButtonProps {
    ariaLabel: string,
    tooltipLabel: string,
    onPress: () => void,
    children: ReactNode,
}

const RowActionButton = ({
    ariaLabel,
    tooltipLabel,
    onPress,
    children,
}: RowActionButtonProps) => (
    <Tooltip label={tooltipLabel} placement="bottom">
        <button
            type="button"
            className={styles.rowAction}
            aria-label={ariaLabel}
            onMouseDown={event => {
                event.preventDefault();
            }}
            onClick={() => {
                onPress();
            }}
        >
            {children}
        </button>
    </Tooltip>
);

interface CueRowProps {
    cue: ScriptCueListItem,
    isActive: boolean,
    number: string | null,
    startBlockId: string | null,
    onFocus: (blockId: string) => void,
    onRequestDelete: (cue: ScriptCueListItem) => void,
    onRequestUnassign: (cue: ScriptCueListItem) => void,
}

const CueRow = ({
    cue,
    isActive,
    number,
    startBlockId,
    onFocus,
    onRequestDelete,
    onRequestUnassign,
}: CueRowProps) => {
    const isAssigned = Boolean(cue.assignmentLabel);
    const label = (
        <>
            {number ? (
                <>
                    <span className={styles.number}>{number}</span>
                    {' '}
                </>
            ) : null}
            {cue.title}
        </>
    );

    return (
        <li className={clsx(styles.item, isActive && styles.active)}>
            {startBlockId ? (
                <button
                    type="button"
                    className={`${styles.label} ${styles.navigableLabel}`}
                    data-cue-navigation="true"
                    data-cue-id={cue.id}
                    aria-current={isActive ? 'true' : undefined}
                    onMouseDown={event => {
                        event.preventDefault();
                    }}
                    onClick={() => onFocus(startBlockId)}
                >
                    {label}
                </button>
            ) : <span className={styles.label}>{label}</span>}
            <span className={styles.actions}>
                {isAssigned ? (
                    <RowActionButton
                        ariaLabel={`Unassign ${cue.title}`}
                        tooltipLabel="Unassign cue"
                        onPress={() => onRequestUnassign(cue)}
                    >
                        <LinkSlashIcon aria-hidden="true" />
                    </RowActionButton>
                ) : null}
                <RowActionButton
                    ariaLabel={`Delete ${cue.title}`}
                    tooltipLabel="Delete cue"
                    onPress={() => onRequestDelete(cue)}
                >
                    <TrashIcon aria-hidden="true" />
                </RowActionButton>
            </span>
        </li>
    );
};

export const ScriptCuesSidebar = ({
    cues,
    isLoading = false,
    onAddCue,
    onDeleteCue,
    onUnassignCue,
}: ScriptCuesSidebarProps) => {
    const editor = useEditorInstance();
    const elementSelection = useEditorElementSelection();
    const focusBlock = useFocusEditorBlock();
    const documentCues = useEditorLiveCues();
    const [deleteTarget, setDeleteTarget] = useState<ScriptCueListItem | null>(null);
    const [unassignTarget, setUnassignTarget] = useState<ScriptCueListItem | null>(null);

    const cueMetadataById = useMemo(() => new Map(documentCues.map((cue, index) => [
        cue.cueId, {
            number: formatCueNumber(cue),
            order: index,
            startBlockId: cue.startBlockId,
            title: cue.title,
        },
    ] as const)), [documentCues]);
    const displayedCues = useMemo(() => cues.map(cue => {
        const liveTitle = cueMetadataById.get(cue.id)?.title.trim();

        return liveTitle ? {...cue, title: liveTitle} : cue;
    }), [cueMetadataById, cues]);
    const {
        assignedCues,
        unassignedCues,
    } = useMemo(() => ({
        assignedCues: displayedCues.filter(cue => cue.assignmentLabel).sort((left, right) => {
            return (cueMetadataById.get(left.id)?.order ?? Number.MAX_SAFE_INTEGER)
                - (cueMetadataById.get(right.id)?.order ?? Number.MAX_SAFE_INTEGER);
        }),
        unassignedCues: displayedCues.filter(cue => !cue.assignmentLabel),
    }), [cueMetadataById, displayedCues]);
    const handleConfirmDelete = useCallback(async () => {
        if (!deleteTarget) {
            return;
        }

        await onDeleteCue(deleteTarget.id);
        setDeleteTarget(null);
    }, [deleteTarget, onDeleteCue]);
    const handleConfirmUnassign = useCallback(async () => {
        if (!unassignTarget) {
            return;
        }

        if (!editor?.commands.unassignCue(unassignTarget.id)) {
            return;
        }

        await onUnassignCue(unassignTarget.id);
        setUnassignTarget(null);
    }, [
        editor,
        onUnassignCue,
        unassignTarget,
    ]);

    const renderCueList = (items: readonly ScriptCueListItem[]) => (
        <ul className={styles.itemList}>
            {items.map(cue => (
                <CueRow
                    key={cue.id}
                    cue={cue}
                    isActive={elementSelection?.type === 'cue' && elementSelection.cueId === cue.id}
                    number={cueMetadataById.get(cue.id)?.number ?? null}
                    startBlockId={cueMetadataById.get(cue.id)?.startBlockId ?? null}
                    onFocus={focusBlock}
                    onRequestDelete={setDeleteTarget}
                    onRequestUnassign={setUnassignTarget}
                />
            ))}
        </ul>
    );

    return (
        <div className={styles.content}>
            <SidebarMiniHeader
                actions={<CuesSidebarContextActions onAddCue={onAddCue} />}
                controls={(
                    <SidebarActionsGroup>
                        <AttributeManagerSidebarButton panelId={ATTRIBUTE_MANAGER_PANEL_CUES} />
                    </SidebarActionsGroup>
                )}
            />
            {isLoading ? (
                <section className={styles.section} aria-label="Cues">
                    <p className={styles.empty} role="status">Loading cues...</p>
                </section>
            ) : (
                <>
                    <section className={styles.section} aria-label="Assigned cues">
                        {assignedCues.length > 0 ? renderCueList(assignedCues) : (
                            <p className={styles.empty}>No assigned cues yet.</p>
                        )}
                    </section>
                    {unassignedCues.length > 0 ? (
                        <section className={styles.section} aria-labelledby="cues-unassigned">
                            <h3 id="cues-unassigned" className={styles.sectionTitle}>Unassigned</h3>
                            {renderCueList(unassignedCues)}
                        </section>
                    ) : null}
                </>
            )}
            <DeleteCueModal
                isOpen={deleteTarget !== null}
                cueTitle={deleteTarget?.title}
                onClose={() => setDeleteTarget(null)}
                onConfirm={handleConfirmDelete}
            />
            <UnassignCueModal
                isOpen={unassignTarget !== null}
                cueTitle={unassignTarget?.title}
                onClose={() => setUnassignTarget(null)}
                onConfirm={handleConfirmUnassign}
            />
        </div>
    );
};
