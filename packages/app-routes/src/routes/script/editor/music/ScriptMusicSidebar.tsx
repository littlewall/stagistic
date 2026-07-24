import {
    useEditorElementSelection,
    useEditorInstance,
    useEditorLiveMusic,
    useFocusEditorBlock,
} from '@stagistic/editor';
import {formatMusicNumber} from '@stagistic/script';
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

import {ATTRIBUTE_MANAGER_PANEL_MUSIC} from '../../attributes/attributeManagerMenu';
import {SidebarMiniHeader} from '../sidebar';
import {AttributeManagerSidebarButton} from '../sidebar/AttributeManagerSidebarButton';
import {SidebarActionsGroup} from '../sidebar/SidebarActionsGroup';
import {DeleteMusicModal} from './DeleteMusicModal';
import {MusicSidebarContextActions} from './MusicSidebarContextActions';
import styles from './ScriptMusicSidebar.module.css';
import type {ScriptMusicListItem} from './types';
import {UnassignMusicModal} from './UnassignMusicModal';

interface ScriptMusicSidebarProps {
    music: readonly ScriptMusicListItem[],
    isLoading?: boolean,
    onAddMusic: () => void,
    onDeleteMusic: (musicId: string) => void | Promise<void>,
    onUnassignMusic: (musicId: string) => void | Promise<void>,
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

interface MusicRowProps {
    music: ScriptMusicListItem,
    isActive: boolean,
    number: string | null,
    startBlockId: string | null,
    onFocus: (blockId: string) => void,
    onRequestDelete: (music: ScriptMusicListItem) => void,
    onRequestUnassign: (music: ScriptMusicListItem) => void,
}

const MusicRow = ({
    music,
    isActive,
    number,
    startBlockId,
    onFocus,
    onRequestDelete,
    onRequestUnassign,
}: MusicRowProps) => {
    const isAssigned = Boolean(music.assignmentLabel);
    const label = (
        <>
            {number ? (
                <>
                    <span className={styles.number}>{number}</span>
                    {' '}
                </>
            ) : null}
            {music.title}
        </>
    );

    return (
        <li className={clsx(styles.item, isActive && styles.active)}>
            {startBlockId ? (
                <button
                    type="button"
                    className={`${styles.label} ${styles.navigableLabel}`}
                    data-music-navigation="true"
                    data-music-id={music.id}
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
                        ariaLabel={`Unassign ${music.title}`}
                        tooltipLabel="Unassign music"
                        onPress={() => onRequestUnassign(music)}
                    >
                        <LinkSlashIcon aria-hidden="true" />
                    </RowActionButton>
                ) : null}
                <RowActionButton
                    ariaLabel={`Delete ${music.title}`}
                    tooltipLabel="Delete music"
                    onPress={() => onRequestDelete(music)}
                >
                    <TrashIcon aria-hidden="true" />
                </RowActionButton>
            </span>
        </li>
    );
};

export const ScriptMusicSidebar = ({
    music,
    isLoading = false,
    onAddMusic,
    onDeleteMusic,
    onUnassignMusic,
}: ScriptMusicSidebarProps) => {
    const editor = useEditorInstance();
    const elementSelection = useEditorElementSelection();
    const focusBlock = useFocusEditorBlock();
    const documentMusic = useEditorLiveMusic();
    const [deleteTarget, setDeleteTarget] = useState<ScriptMusicListItem | null>(null);
    const [unassignTarget, setUnassignTarget] = useState<ScriptMusicListItem | null>(null);

    const musicMetadataById = useMemo(() => new Map(documentMusic.map((music, index) => [
        music.musicId, {
            number: formatMusicNumber(music),
            order: index,
            startBlockId: music.startBlockId,
            title: music.title,
        },
    ] as const)), [documentMusic]);
    const displayedMusic = useMemo(() => music.map(music => {
        const liveMetadata = musicMetadataById.get(music.id);

        if (!liveMetadata) {
            return music;
        }

        return {
            ...music,
            assignmentLabel: music.assignmentLabel ?? liveMetadata.number,
            title: liveMetadata.title.trim() || music.title,
        };
    }), [musicMetadataById, music]);
    const {
        assignedMusic,
        unassignedMusic,
    } = useMemo(() => ({
        assignedMusic: displayedMusic.filter(music => music.assignmentLabel).sort((left, right) => {
            return (musicMetadataById.get(left.id)?.order ?? Number.MAX_SAFE_INTEGER)
                - (musicMetadataById.get(right.id)?.order ?? Number.MAX_SAFE_INTEGER);
        }),
        unassignedMusic: displayedMusic.filter(music => !music.assignmentLabel),
    }), [musicMetadataById, displayedMusic]);
    const handleConfirmDelete = useCallback(async () => {
        if (!deleteTarget) {
            return;
        }

        await onDeleteMusic(deleteTarget.id);
        setDeleteTarget(null);
    }, [deleteTarget, onDeleteMusic]);
    const handleConfirmUnassign = useCallback(async () => {
        if (!unassignTarget) {
            return;
        }

        if (!editor?.commands.unassignMusic(unassignTarget.id)) {
            return;
        }

        await onUnassignMusic(unassignTarget.id);
        setUnassignTarget(null);
    }, [
        editor,
        onUnassignMusic,
        unassignTarget,
    ]);

    const renderMusicList = (items: readonly ScriptMusicListItem[]) => (
        <ul className={styles.itemList}>
            {items.map(music => (
                <MusicRow
                    key={music.id}
                    music={music}
                    isActive={elementSelection?.type === 'music' && elementSelection.musicId === music.id}
                    number={musicMetadataById.get(music.id)?.number ?? null}
                    startBlockId={musicMetadataById.get(music.id)?.startBlockId ?? null}
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
                actions={<MusicSidebarContextActions onAddMusic={onAddMusic} />}
                controls={(
                    <SidebarActionsGroup>
                        <AttributeManagerSidebarButton panelId={ATTRIBUTE_MANAGER_PANEL_MUSIC} />
                    </SidebarActionsGroup>
                )}
            />
            {isLoading ? (
                <section className={styles.section} aria-label="Music">
                    <p className={styles.empty} role="status">Loading music...</p>
                </section>
            ) : (
                <>
                    <section className={styles.section} aria-label="Assigned music">
                        {assignedMusic.length > 0 ? renderMusicList(assignedMusic) : (
                            <p className={styles.empty}>No assigned music yet.</p>
                        )}
                    </section>
                    {unassignedMusic.length > 0 ? (
                        <section className={styles.section} aria-labelledby="music-unassigned">
                            <h3 id="music-unassigned" className={styles.sectionTitle}>Unassigned</h3>
                            {renderMusicList(unassignedMusic)}
                        </section>
                    ) : null}
                </>
            )}
            <DeleteMusicModal
                isOpen={deleteTarget !== null}
                musicTitle={deleteTarget?.title}
                onClose={() => setDeleteTarget(null)}
                onConfirm={handleConfirmDelete}
            />
            <UnassignMusicModal
                isOpen={unassignTarget !== null}
                musicTitle={unassignTarget?.title}
                onClose={() => setUnassignTarget(null)}
                onConfirm={handleConfirmUnassign}
            />
        </div>
    );
};
