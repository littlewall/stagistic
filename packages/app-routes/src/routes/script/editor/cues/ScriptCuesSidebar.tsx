import {
    buildScriptBlockIndex,
    formatCueNumber,
    type ScriptDocument,
} from '@stagistic/script';
import {
    useEditorInstance,
} from '@stagistic/editor';
import {
    clsx,
    LinkSlashIcon,
    MicrophoneIcon,
    MusicDoubleNoteIcon,
    Tooltip,
    TrashIcon,
} from '@stagistic/ui';
import {
    type ComponentType,
    type ReactNode,
    type SVGProps,
    useCallback,
    useEffect,
    useMemo,
    useState,
} from 'react';

import {SidebarMiniHeader} from '../sidebar';
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

const KIND_META = {
    song: {
        label: 'Song',
        Icon: MicrophoneIcon,
    },
    instrumental: {
        label: 'Instrumental',
        Icon: MusicDoubleNoteIcon,
    },
} satisfies Record<ScriptCueListItem['kind'], {
    label: string,
    Icon: ComponentType<SVGProps<SVGSVGElement>>,
}>;

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
    onRequestDelete: (cue: ScriptCueListItem) => void,
    onRequestUnassign: (cue: ScriptCueListItem) => void,
}

const CueRow = ({
    cue,
    number,
    onRequestDelete,
    onRequestUnassign,
}: CueRowProps) => {
    const {
        label,
        Icon,
    } = KIND_META[cue.kind];
    const isAssigned = Boolean(cue.assignmentLabel);

    return (
        <li className={styles.item}>
            <span className={styles.number}>{number}</span>
            <Tooltip label={label} placement="bottom">
                <span className={styles.kindIcon} aria-label={label}>
                    <Icon aria-hidden className={styles.kindGlyph} />
                </span>
            </Tooltip>
            <span className={styles.title}>{cue.title}</span>
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
    const cueMetadataById = useMemo(() => new Map(documentCues.map((cue, index) => [cue.cueId, {
        number: formatCueNumber(cue),
        order: index,
    }] as const)), [documentCues]);
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

    const renderSection = (
        label: string,
        items: readonly ScriptCueListItem[],
        emptyText: string,
    ) => (
        <section className={styles.section} aria-labelledby={`cues-${label.toLowerCase()}`}>
            <h3 id={`cues-${label.toLowerCase()}`} className={styles.sectionTitle}>
                {label}
            </h3>
            {items.length > 0 ? (
                <ul className={styles.itemList}>
                    {items.map(cue => (
                        <CueRow
                            key={cue.id}
                            cue={cue}
                            number={cueMetadataById.get(cue.id)?.number ?? null}
                            onRequestDelete={setDeleteTarget}
                            onRequestUnassign={setUnassignTarget}
                        />
                    ))}
                </ul>
            ) : (
                <p className={clsx(styles.empty, label === 'Assigned' && styles.compactEmpty)}>
                    {emptyText}
                </p>
            )}
        </section>
    );

    return (
        <div className={styles.content}>
            <SidebarMiniHeader actions={<CuesSidebarContextActions onAddCue={onAddCue} />} />
            {renderSection('Assigned', assignedCues, 'No assigned cues yet.')}
            {renderSection('Unassigned', unassignedCues, 'Add a cue to start building the music list.')}
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
