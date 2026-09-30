import {MUSIC_ID_ATTR, MUSIC_START_NODE_NAME} from '@stagistic/script';
import {type EditorState, TextSelection, type Transaction} from '@tiptap/pm/state';

import {isMusicAtom} from './musicCaret';
import {resolveScriptTargetBlock} from './musicCommands';

export const isMusicPillTarget = (target: EventTarget | null) => {
    return target instanceof Element && target.closest('[data-music-pill]') !== null;
};

export const resolveTrailingMusicClickPosition = (state: EditorState, event: MouseEvent): number | null => {
    const target = event.target;
    const blockElement = target instanceof Element ? target.closest<HTMLElement>('[data-id]') : null;
    const musicPill = blockElement?.querySelector<HTMLElement>('[data-music-pill]');

    if (!blockElement || !musicPill) {
        return null;
    }

    const musicRect = musicPill.getBoundingClientRect();
    const isAfterMusic = event.clientX > musicRect.right && event.clientY >= musicRect.top && event.clientY <= musicRect.bottom;

    if (!isAfterMusic) {
        return null;
    }

    return resolveScriptTargetBlock(state, blockElement.dataset.id)?.to ?? null;
};

type PositionRange = {
    from: number;
    to: number;
};

const getMusicAtomRangesInSelection = (state: EditorState) => {
    const {from, to} = state.selection;
    const ranges: PositionRange[] = [];

    state.doc.nodesBetween(from, to, (node, pos) => {
        if (!isMusicAtom(node)) {
            return true;
        }

        ranges.push({
            from: pos,
            to: pos + node.nodeSize,
        });

        return false;
    });

    return ranges;
};

const getDeleteRangesAroundMusicAtoms = (selectionRange: PositionRange, musicRanges: PositionRange[]): PositionRange[] => {
    const ranges: PositionRange[] = [];
    let cursor = selectionRange.from;

    musicRanges.forEach(musicRange => {
        const gapTo = Math.min(musicRange.from, selectionRange.to);

        if (gapTo > cursor) {
            ranges.push({from: cursor, to: gapTo});
        }

        cursor = Math.max(cursor, Math.min(musicRange.to, selectionRange.to));
    });

    if (selectionRange.to > cursor) {
        ranges.push({from: cursor, to: selectionRange.to});
    }

    return ranges;
};

export const buildDeleteSelectionPreservingMusicAtoms = (state: EditorState): Transaction | null => {
    const {selection} = state;

    if (selection.empty) {
        return null;
    }

    const musicRanges = getMusicAtomRangesInSelection(state);

    if (musicRanges.length === 0) {
        return null;
    }

    const deleteRanges = getDeleteRangesAroundMusicAtoms({from: selection.from, to: selection.to}, musicRanges);
    const tr = state.tr;

    deleteRanges
        .slice()
        .reverse()
        .forEach(range => {
            tr.delete(range.from, range.to);
        });

    const selectionPos = Math.min(tr.mapping.map(musicRanges[0].to, 1), tr.doc.content.size);

    return tr.setSelection(TextSelection.near(tr.doc.resolve(selectionPos), 1)).scrollIntoView();
};

export const findMusicStartPositionById = (state: EditorState, musicId: string): number | null => {
    let position: number | null = null;

    state.doc.descendants((node, pos) => {
        if (position !== null) {
            return false;
        }

        if (node.type.name === MUSIC_START_NODE_NAME && node.attrs[MUSIC_ID_ATTR] === musicId) {
            position = pos;

            return false;
        }

        return true;
    });

    return position;
};
