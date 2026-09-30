import {type EditorMusicCreateRequest, type EditorMusicRemoveRequest} from '@stagistic/editor';
import {useCallback, useState} from 'react';

import {type useScriptMusicState} from './useScriptMusicState';

type AddMusicModalState = {source: 'sidebar'} | {source: 'editor', request: EditorMusicCreateRequest};
type ScriptMusicState = ReturnType<typeof useScriptMusicState>;

/** State of the add/unassign music modals, opened from the sidebar or by editor requests. */
export const useMusicModalsState = ({createMusic, unassignMusic}: Pick<ScriptMusicState, 'createMusic' | 'unassignMusic'>) => {
    const [addMusicModalState, setAddMusicModalState] = useState<AddMusicModalState | null>(null);
    const [removeMusicRequest, setRemoveMusicRequest] = useState<EditorMusicRemoveRequest | null>(null);

    const openAddMusicModal = useCallback(() => {
        setAddMusicModalState({source: 'sidebar'});
    }, []);
    const closeAddMusicModal = useCallback(() => {
        setAddMusicModalState(null);
    }, []);
    const cancelAddMusicModal = useCallback(() => {
        if (addMusicModalState?.source === 'editor') {
            addMusicModalState.request.cancel?.();
        }

        setAddMusicModalState(null);
    }, [addMusicModalState]);
    const handleRequestCreateMusic = useCallback((request: EditorMusicCreateRequest) => {
        setAddMusicModalState({
            source: 'editor',
            request,
        });
    }, []);
    const handleCreateMusic = useCallback(
        async (input: Parameters<typeof createMusic>[0]) => {
            const createdMusic = await createMusic(input);

            if (createdMusic && addMusicModalState?.source === 'editor') {
                addMusicModalState.request.complete(createdMusic);
            }

            return createdMusic;
        },
        [addMusicModalState, createMusic],
    );
    const closeRemoveMusicModal = useCallback(() => {
        setRemoveMusicRequest(null);
    }, []);
    const handleConfirmRemoveMusic = useCallback(async () => {
        if (!removeMusicRequest) {
            return;
        }

        if (removeMusicRequest.complete()) {
            await unassignMusic(removeMusicRequest.musicId);
        }

        setRemoveMusicRequest(null);
    }, [removeMusicRequest, unassignMusic]);

    return {
        addMusic: {
            isOpen: addMusicModalState !== null,
            initialTitle: addMusicModalState?.source === 'editor' ? addMusicModalState.request.title : undefined,
            open: openAddMusicModal,
            close: closeAddMusicModal,
            cancel: cancelAddMusicModal,
            create: handleCreateMusic,
        },
        removeMusic: {
            isOpen: removeMusicRequest !== null,
            musicTitle: removeMusicRequest?.title,
            close: closeRemoveMusicModal,
            confirm: handleConfirmRemoveMusic,
        },
        handleRequestCreateMusic,
        handleRequestRemoveMusic: setRemoveMusicRequest,
    };
};
