import type {AttributeManagerListItem} from '@stagistic/ui';
import {useRef, useState} from 'react';

import {AddMusicModal} from '../editor/music/AddMusicModal';
import {DeleteMusicModal} from '../editor/music/DeleteMusicModal';
import type {useScriptMusicState} from '../editor/music/useScriptMusicState';
import {DeleteSceneHeadingModal} from '../editor/scene/DeleteSceneHeadingModal';

interface AttributeManagerActionDialogsOptions {
    createMusic: ReturnType<typeof useScriptMusicState>['createMusic'],
    onDeleteMusic: (musicId: string) => Promise<void>,
    onDeleteScene: (sceneHeadingBlockId: string) => Promise<void>,
}

const getParentFocusTarget = () => document.querySelector<HTMLElement>(
    'dialog[open][aria-label="Attribute manager"] [role="tab"][aria-selected="true"]',
);

export const useAttributeManagerActionDialogs = ({
    createMusic,
    onDeleteMusic,
    onDeleteScene,
}: AttributeManagerActionDialogsOptions) => {
    const [isAddMusicOpen, setIsAddMusicOpen] = useState(false);
    const [createdMusicId, setCreatedMusicId] = useState<string | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<AttributeManagerListItem | null>(null);
    const [isDeletingMusic, setIsDeletingMusic] = useState(false);
    const [sceneDeleteTarget, setSceneDeleteTarget] = useState<AttributeManagerListItem | null>(null);
    const [isDeletingScene, setIsDeletingScene] = useState(false);
    const createMusicTriggerRef = useRef<HTMLElement | null>(null);
    const deleteMusicTriggerRef = useRef<HTMLElement | null>(null);
    const deleteSceneTriggerRef = useRef<HTMLElement | null>(null);

    const requestCreateMusic = (trigger?: HTMLElement) => {
        createMusicTriggerRef.current = trigger ?? null;
        setIsAddMusicOpen(true);
    };
    const requestDeleteMusic = (item: AttributeManagerListItem, trigger: HTMLElement) => {
        deleteMusicTriggerRef.current = trigger;
        setDeleteTarget(item);
    };
    const requestDeleteScene = (item: AttributeManagerListItem, trigger: HTMLElement) => {
        deleteSceneTriggerRef.current = trigger;
        setSceneDeleteTarget(item);
    };

    const dialogs = (
        <>
            <AddMusicModal
                isOpen={isAddMusicOpen}
                returnFocus={createMusicTriggerRef}
                fallbackFocus={getParentFocusTarget}
                onCancel={() => setIsAddMusicOpen(false)}
                onClose={() => setIsAddMusicOpen(false)}
                onCreate={async input => {
                    const created = await createMusic(input);

                    setCreatedMusicId(created?.id ?? null);

                    return created;
                }}
            />
            <DeleteMusicModal
                isOpen={deleteTarget !== null}
                returnFocus={deleteMusicTriggerRef}
                fallbackFocus={getParentFocusTarget}
                isDeleting={isDeletingMusic}
                musicTitle={deleteTarget?.title}
                onClose={() => setDeleteTarget(null)}
                onConfirm={async () => {
                    if (!deleteTarget) {
                        return;
                    }

                    setIsDeletingMusic(true);

                    try {
                        await onDeleteMusic(deleteTarget.id);
                        setDeleteTarget(null);
                    } catch {
                        // Keep the dialog open; persistence errors are surfaced by the catalog.
                    } finally {
                        setIsDeletingMusic(false);
                    }
                }}
            />
            <DeleteSceneHeadingModal
                isOpen={sceneDeleteTarget !== null}
                returnFocus={deleteSceneTriggerRef}
                fallbackFocus={getParentFocusTarget}
                isDeleting={isDeletingScene}
                onClose={() => setSceneDeleteTarget(null)}
                onConfirm={async () => {
                    if (!sceneDeleteTarget) {
                        return;
                    }

                    setIsDeletingScene(true);

                    try {
                        await onDeleteScene(sceneDeleteTarget.id);
                        setSceneDeleteTarget(null);
                    } catch {
                        // Keep the dialog open; persistence errors are surfaced by the projection.
                    } finally {
                        setIsDeletingScene(false);
                    }
                }}
            />
        </>
    );

    return {
        dialogs,
        createdMusicId,
        isDeletingMusic,
        isDeletingScene,
        requestCreateMusic,
        requestDeleteMusic,
        requestDeleteScene,
    };
};
