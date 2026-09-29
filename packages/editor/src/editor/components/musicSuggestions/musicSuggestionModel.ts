import type {Editor as TiptapEditor} from '@tiptap/react';
import {type CSSProperties, type RefObject} from 'react';

import type {PersistentMusicRef} from '../../contracts';

export type MusicSuggestionOverlayState = {
    style: CSSProperties;
    suggestions: PersistentMusicRef[];
};

export type MusicSuggestionsOverlayProps = {
    editor: TiptapEditor | null;
    canvasRef: RefObject<HTMLElement | null>;
    persistentMusic?: readonly PersistentMusicRef[];
    onMusicAssigned?: (musicId: string) => void;
};

const normalizeMusicTitle = (value: string) => {
    return value.trim().replace(/\s+/gu, ' ').toLocaleLowerCase();
};

export const getMusicSuggestions = (music: readonly PersistentMusicRef[], query: string) => {
    const normalizedQuery = normalizeMusicTitle(query);

    return music
        .filter(music => !music.assignmentLabel)
        .map(music => ({
            music,
            normalizedTitle: normalizeMusicTitle(music.title),
        }))
        .filter(entry => {
            return !normalizedQuery || entry.normalizedTitle.includes(normalizedQuery);
        })
        .sort((a, b) => {
            if (!normalizedQuery) {
                return a.music.title.localeCompare(b.music.title);
            }

            const aStarts = a.normalizedTitle.startsWith(normalizedQuery);
            const bStarts = b.normalizedTitle.startsWith(normalizedQuery);

            if (aStarts !== bStarts) {
                return aStarts ? -1 : 1;
            }

            return a.music.title.localeCompare(b.music.title);
        })
        .map(entry => entry.music);
};

export const getSafeIsFocused = (editor: TiptapEditor) => {
    if (editor.isFocused) {
        return true;
    }

    try {
        return editor.view.hasFocus();
    } catch {
        return false;
    }
};
