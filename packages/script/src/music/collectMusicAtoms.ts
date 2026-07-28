import type {ScriptNode} from '../document';
import {
    MUSIC_DRAFT_ATTR,
    MUSIC_ID_ATTR,
    MUSIC_KIND_ATTR,
    MUSIC_MODE_ATTR,
    MUSIC_OUT_NODE_NAME,
    MUSIC_START_NODE_NAME,
    MUSIC_TITLE_ATTR,
} from './constants';
import type {MusicAtom, MusicMode} from './types';

const readMode = (value: unknown): MusicMode => {
    return value === 'hit' ? 'hit' : 'open';
};

const readString = (value: unknown): string => {
    return typeof value === 'string' ? value : '';
};

const readKind = (value: unknown): string | null => {
    return typeof value === 'string' && value.length > 0 ? value : null;
};

export const collectMusicAtoms = (blockNode: ScriptNode): MusicAtom[] => {
    if (!Array.isArray(blockNode.content)) {
        return [];
    }

    const atoms: MusicAtom[] = [];

    blockNode.content.forEach(child => {
        if (!child || typeof child !== 'object') {
            return;
        }

        if (child.type === MUSIC_START_NODE_NAME) {
            const attrs = child.attrs && typeof child.attrs === 'object' ? child.attrs : {};

            if (attrs[MUSIC_DRAFT_ATTR] === true) {
                return;
            }

            atoms.push({
                role: 'start',
                musicId: readString(attrs[MUSIC_ID_ATTR]),
                mode: readMode(attrs[MUSIC_MODE_ATTR]),
                title: readString(attrs[MUSIC_TITLE_ATTR]),
                kind: readKind(attrs[MUSIC_KIND_ATTR]),
            });
        } else if (child.type === MUSIC_OUT_NODE_NAME) {
            atoms.push({role: 'out'});
        }
    });

    return atoms;
};
