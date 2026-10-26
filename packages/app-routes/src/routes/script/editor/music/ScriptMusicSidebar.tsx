import {
    useEditorElementSelection,
    useEditorInstance,
    useEditorLiveMusic,
    useFocusEditorMusic,
} from '@stagistic/editor';
import {formatMusicNumber} from '@stagistic/script';
import {
    SidebarActionsGroup,
    SidebarMiniHeader,
} from '@stagistic/ui';
import {
    type ReactNode,
    useCallback,
    useMemo,
    useRef,
    useState,
} from 'react';

import {ATTRIBUTE_MANAGER_PANEL_MUSIC} from '../../attribute-manager/attributeManagerMenu';
import {useScriptSettingsModal} from '../../settings/ScriptSettingsModalContext';
import {useScriptReadOnlyState} from '../../workspace/ScriptAccessContext';
import {AttributeManagerSidebarButton} from '../sidebar/AttributeManagerSidebarButton';
import {MusicSidebarContextActions} from './MusicSidebarContextActions';
import {MusicRow} from './MusicSidebarRow';
import styles from './ScriptMusicSidebar.module.css';
import type {ScriptMusicListItem} from './types';
import {UnassignMusicModal} from './UnassignMusicModal';

interface ScriptMusicSidebarProps {
    header?: ReactNode,
    music: readonly ScriptMusicListItem[],
    isLoading?: boolean,
    onAddMusic: (returnFocus?: HTMLElement | null) => void,
    onUnassignMusic: (musicId: string) => void | Promise<void>,
}

export const ScriptMusicSidebar = ({
    header,
    music,
    isLoading = false,
    onAddMusic,
    onUnassignMusic,
}: ScriptMusicSidebarProps) => {
    const editor = useEditorInstance();
    const elementSelection = useEditorElementSelection();
    const focusMusic = useFocusEditorMusic();
    const documentMusic = useEditorLiveMusic();
    const {openAttributeManagerMusic} = useScriptSettingsModal();
    const {isReadOnly} = useScriptReadOnlyState();
    const unassignReturnFocus = useRef<HTMLElement | null>(null);
    const [unassignTarget, setUnassignTarget] = useState<ScriptMusicListItem | null>(null);

    const musicMetadataById = useMemo(
        () => new Map(
            documentMusic.map(
                (item, index) => [
                    item.musicId,
                    {
                        number: formatMusicNumber(item),
                        order: index,
                        startBlockId: item.startBlockId,
                        title: item.title,
                    },
                ] as const,
            ),
        ),
        [documentMusic],
    );
    const displayedMusic = useMemo(
        () => music.map(item => {
            const liveMetadata = musicMetadataById.get(item.id);

            if (!liveMetadata) {
                return item;
            }

            return {
                ...item,
                assignmentLabel: item.assignmentLabel ?? liveMetadata.number,
                title: liveMetadata.title.trim() || item.title,
            };
        }),
        [musicMetadataById, music],
    );
    const {assignedMusic, unassignedMusic} = useMemo(
        () => ({
            assignedMusic: displayedMusic
                .filter(item => item.assignmentLabel)
                .toSorted((left, right) => {
                    return (
                        (musicMetadataById.get(left.id)?.order ?? Number.MAX_SAFE_INTEGER) - (musicMetadataById.get(right.id)?.order ?? Number.MAX_SAFE_INTEGER)
                    );
                }),
            unassignedMusic: displayedMusic.filter(item => !item.assignmentLabel),
        }),
        [musicMetadataById, displayedMusic],
    );
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
            {items.map(item => (
                <MusicRow
                    key={item.id}
                    music={item}
                    isActive={elementSelection?.type === 'music' && elementSelection.musicId === item.id}
                    number={musicMetadataById.get(item.id)?.number ?? null}
                    startBlockId={musicMetadataById.get(item.id)?.startBlockId ?? null}
                    onFocus={focusMusic}
                    onRequestUnassign={isReadOnly ? undefined : (target, returnFocus) => {
                        unassignReturnFocus.current = returnFocus;
                        setUnassignTarget(target);
                    }}
                    onOpenMusicManager={isReadOnly ? undefined : openAttributeManagerMusic}
                />
            ))}
        </ul>
    );

    return (
        <div className={styles.content}>
            <SidebarMiniHeader
                navigation={header}
                actions={isReadOnly ? undefined : <MusicSidebarContextActions onAddMusic={onAddMusic} />}
                controls={(
                    <SidebarActionsGroup>
                        <AttributeManagerSidebarButton panelId={ATTRIBUTE_MANAGER_PANEL_MUSIC} />
                    </SidebarActionsGroup>
                )}
            />
            {isLoading ? (
                <section
                    className={styles.section}
                    aria-label="Music"
                >
                    <p
                        className={styles.empty}
                        role="status"
                    >
                        Loading music...
                    </p>
                </section>
            ) : (
                <>
                    <section
                        className={styles.section}
                        aria-label="Assigned music"
                    >
                        {assignedMusic.length > 0 ? renderMusicList(assignedMusic) : <p className={styles.empty}>No assigned music yet.</p>}
                    </section>
                    {unassignedMusic.length > 0 ? (
                        <section
                            className={styles.section}
                            aria-labelledby="music-unassigned"
                        >
                            <h3
                                id="music-unassigned"
                                className={styles.sectionTitle}
                            >
                                Unassigned
                            </h3>
                            {renderMusicList(unassignedMusic)}
                        </section>
                    ) : null}
                </>
            )}
            <UnassignMusicModal
                isOpen={unassignTarget !== null}
                musicTitle={unassignTarget?.title}
                returnFocus={unassignReturnFocus}
                onClose={() => setUnassignTarget(null)}
                onConfirm={handleConfirmUnassign}
            />
        </div>
    );
};
