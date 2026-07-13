import {
    useEditorInstance,
    useFocusEditorBlock,
} from '@stagistic/editor';
import {
    buildScriptBlockIndex,
    formatCueNumber,
    type ScriptDocument,
} from '@stagistic/script';
import {
    LinkSlashIcon,
    Tooltip,
    TrashIcon,
} from '@stagistic/ui';
import {
    type ReactNode,
    useCallback,
    useEffect,
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
    number: string | null,
    startBlockId: string | null,
    onFocus: (blockId: string) => void,
    onRequestDelete: (cue: ScriptCueListItem) => void,
    onRequestUnassign: (cue: ScriptCueListItem) => void,
}

const CueRow = ({
    cue,
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
        <li className={styles.item}>
            {startBlockId ? (
                <button
                    type="button"
                    className={`${styles.label} ${styles.navigableLabel}`}
                    data-cue-navigation="true"
                    data-cue-id={cue.id}
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
    onAddCue,
    onDeleteCue,
    onUnassignCue,
}: ScriptCuesSidebarProps) => {
    const editor = useEditorInstance();
    const focusBlock = useFocusEditorBlock();
    const [documentCues, setDocumentCues] = useState(() => {
        return editor ? buildScriptBlockIndex(editor.getJSON() as ScriptDocument).snapshot.cues : [];
    });
    const [deleteTarget, setDeleteTarget] = useState<ScriptCueListItem | null>(null);
    const [unassignTarget, setUnassignTarget] = useState<ScriptCueListItem | null>(null);

    useEffect(() => {
        if (!editor) {
            setDocumentCues([]);

            return undefined;
        }

        const updateDocumentCues = () => {
            setDocumentCues(buildScriptBlockIndex(editor.getJSON() as ScriptDocument).snapshot.cues);
        };

        updateDocumentCues();
        editor.on('transaction', updateDocumentCues);

        return () => {
            editor.off('transaction', updateDocumentCues);
        };
    }, [editor]);

    const cueMetadataById = useMemo(() => new Map(documentCues.map((cue, index) => [
        cue.cueId, {
            number: formatCueNumber(cue),
            order: index,
            startBlockId: cue.startBlockId,
        },
    ] as const)), [documentCues]);
    const {
        assignedCues,
        unassignedCues,
    } = useMemo(() => ({
        assignedCues: cues.filter(cue => cue.assignmentLabel).sort((left, right) => {
            return (cueMetadataById.get(left.id)?.order ?? Number.MAX_SAFE_INTEGER)
                - (cueMetadataById.get(right.id)?.order ?? Number.MAX_SAFE_INTEGER);
        }),
        unassignedCues: cues.filter(cue => !cue.assignmentLabel),
    }), [cueMetadataById, cues]);
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

        editor?.commands.unassignCue(unassignTarget.id);
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
