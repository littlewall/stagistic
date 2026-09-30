import {
    MUSIC_DRAFT_ATTR, MUSIC_ID_ATTR, MUSIC_KIND_ATTR, MUSIC_TITLE_ATTR,
} from '@stagistic/script';
import type {NodeViewProps} from '@tiptap/react';

import type {EditorMusicCreateRequest, PersistentMusicRef} from '../../contracts';
import {cancelMusicDraft} from './musicPillHelpers';

interface RequestMusicPillCreationArgs extends Pick<NodeViewProps, 'editor' | 'getPos' | 'updateAttributes'> {
    title: string,
    isDraft: boolean,
    musicId: string,
    persistentMusicRef?: {current: readonly PersistentMusicRef[]},
    onMusicAssigned?: (musicId: string) => void,
    onRequestCreateMusic?: (request: EditorMusicCreateRequest) => void,
}

/**
 * Resolves a draft music pill: reuses unassigned music with the same title,
 * otherwise asks the host to create it and assigns the result.
 */
export const requestMusicPillCreation = ({
    title,
    isDraft,
    musicId,
    editor,
    getPos,
    updateAttributes,
    persistentMusicRef,
    onMusicAssigned,
    onRequestCreateMusic,
}: RequestMusicPillCreationArgs) => {
    const nextTitle = title.trim();
    const pos = getPos();
    const assign = (music: Pick<PersistentMusicRef, 'id' | 'title' | 'kind'>) => {
        updateAttributes({
            [MUSIC_ID_ATTR]: music.id,
            [MUSIC_TITLE_ATTR]: music.title,
            [MUSIC_KIND_ATTR]: music.kind,
            [MUSIC_DRAFT_ATTR]: false,
        });
        onMusicAssigned?.(music.id);
    };

    const existingMusic = persistentMusicRef?.current.find(candidate => {
        return !candidate.assignmentLabel && candidate.title.trim().toLocaleLowerCase() === nextTitle.toLocaleLowerCase();
    });

    if (nextTitle && isDraft && existingMusic) {
        assign(existingMusic);

        return;
    }

    if (!nextTitle || !isDraft || !onRequestCreateMusic || typeof pos !== 'number') {
        return;
    }

    const candidateBlockId: unknown = editor.state.doc.resolve(pos).parent.attrs.id;

    if (typeof candidateBlockId !== 'string' || !candidateBlockId) {
        return;
    }

    onRequestCreateMusic({
        title: nextTitle,
        blockId: candidateBlockId,
        cancel: () => cancelMusicDraft(editor, getPos, musicId),
        complete: music => {
            assign(music);

            return true;
        },
    });
};
