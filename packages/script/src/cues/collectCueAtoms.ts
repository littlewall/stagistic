import type {ScriptNode} from '../document';
import {
    CUE_ID_ATTR,
    CUE_KIND_ATTR,
    CUE_MODE_ATTR,
    CUE_OUT_NODE_NAME,
    CUE_START_NODE_NAME,
    CUE_TITLE_ATTR,
} from './constants';
import type {CueAtom, CueMode} from './types';

const readMode = (value: unknown): CueMode => {
    return value === 'hit' ? 'hit' : 'open';
};

const readString = (value: unknown): string => {
    return typeof value === 'string' ? value : '';
};

const readKind = (value: unknown): string | null => {
    return typeof value === 'string' && value.length > 0 ? value : null;
};

export const collectCueAtoms = (blockNode: ScriptNode): CueAtom[] => {
    if (!Array.isArray(blockNode.content)) {
        return [];
    }

    const atoms: CueAtom[] = [];

    blockNode.content.forEach(child => {
        if (!child || typeof child !== 'object') {
            return;
        }

        if (child.type === CUE_START_NODE_NAME) {
            const attrs = child.attrs && typeof child.attrs === 'object' ? child.attrs : {};

            atoms.push({
                role: 'start',
                cueId: readString(attrs[CUE_ID_ATTR]),
                mode: readMode(attrs[CUE_MODE_ATTR]),
                title: readString(attrs[CUE_TITLE_ATTR]),
                kind: readKind(attrs[CUE_KIND_ATTR]),
            });
        } else if (child.type === CUE_OUT_NODE_NAME) {
            atoms.push({role: 'out'});
        }
    });

    return atoms;
};
