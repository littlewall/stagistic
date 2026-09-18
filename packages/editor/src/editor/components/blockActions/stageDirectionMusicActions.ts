import {
    type DerivedMusic,
    formatMusicNumber,
    type IndexedScriptBlock,
    MUSIC_OUT_NODE_NAME,
    type ScriptBlockIndexSnapshot,
} from '@stagistic/script';
import type {Editor as TiptapEditor} from '@tiptap/react';

import {buildIndexSnapshotFromPmDoc} from '../../runtime/buildIndexSnapshotFromPmDoc';
import {
    blockHasMusicStart,
    resolveMusicTargetBlock,
    resolveNewMusicNumber,
    resolveScriptTargetBlock,
} from '../../tiptap/extensions/music/musicCommands';
import {
    findMusicAtomRange,
    resolveMusicOutCandidate,
} from '../../tiptap/extensions/music/musicOutCommands';
import type {
    BlockActionCommand,
    BlockActionContext,
    BlockActionItem,
} from './actionTypes';

const MUSIC_TITLE_PREVIEW_LENGTH = 10;

const truncateMusicTitle = (title: string) => {
    const characters = Array.from(title.trim());

    return characters.length <= MUSIC_TITLE_PREVIEW_LENGTH
        ? characters.join('')
        : `${characters.slice(0, MUSIC_TITLE_PREVIEW_LENGTH).join('')}…`;
};

/*
 * Music commands name the number in their own label, so the title travels on
 * its own — two lines of "1) …" in one menu row is the number said twice.
 */

/** As much of the title as a single-line row can hold. */
export const formatMusicTitlePreview = (music: DerivedMusic) => {
    return truncateMusicTitle(music.title) || undefined;
};

/** The whole title, for surfaces that can wrap it onto as many lines as it takes. */
export const formatMusicTitleFull = (music: DerivedMusic) => {
    return music.title.trim() || undefined;
};

/** Number plus whole title, for headers that have no number of their own. */
export const formatFullMusicDisplayName = (music: DerivedMusic) => {
    const number = formatMusicNumber(music);
    const title = music.title.trim();

    return title ? `${number} ${title}` : number;
};

const stripMusicNumberBracket = (number: string) => number.replace(/\)$/u, '');

const withMusicNumber = (label: string, number: string) => {
    return `${label} (${stripMusicNumberBracket(number)})`;
};

/*
 * One command, one name. Whether the music currently ends implicitly at the end
 * of its scene or explicitly at a block someone pinned is a distinction in the
 * document, not in the reader's head: either way the music ends, and this is
 * how you say where. Splitting it into "Add out" and "Set out here" made the
 * same action look like two.
 */
export const formatSetMusicOutLabel = (music: DerivedMusic) => {
    return withMusicNumber('Set music end', formatMusicNumber(music));
};

/*
 * Dropping the out atom does not leave the music without an end — the end goes
 * back to being derived: the scene boundary, the next music, or the end of the
 * script (see deriveMusicTimeline). It is also the only way back to a derived
 * end, because dragging the endpoint always pins it to a block.
 */
export const formatResetMusicEndLabel = (music: DerivedMusic) => {
    return withMusicNumber('Reset music end', formatMusicNumber(music));
};

const SCENE_BOUNDARY_BLOCK_TYPES = new Set(['act', 'scene']);

const resolveNextBlock = (snapshot: ScriptBlockIndexSnapshot, blockId: string) => {
    const block = snapshot.blocks.find(candidate => candidate.blockId === blockId);

    if (!block) {
        return null;
    }

    return snapshot.blocks.reduce<IndexedScriptBlock | null>((closest, candidate) => {
        if (candidate.orderNo <= block.orderNo) {
            return closest;
        }

        return !closest || candidate.orderNo < closest.orderNo ? candidate : closest;
    }, null);
};

/**
 * Whether resetting a placed end would actually move it. The derived end is the
 * block before the next scene boundary, or the block where the next music
 * starts — so when either of those sits immediately after this block, the end
 * has nowhere to go and the command would be a no-op worth hiding.
 */
export const canResetMusicEnd = (snapshot: ScriptBlockIndexSnapshot, blockId: string) => {
    const nextBlock = resolveNextBlock(snapshot, blockId);

    if (!nextBlock || SCENE_BOUNDARY_BLOCK_TYPES.has(nextBlock.blockType)) {
        return false;
    }

    return !snapshot.music.some(music => {
        return music.mode === 'open' && music.startBlockId === nextBlock.blockId;
    });
};

/** Starting a music is what dropping the pill does, so the label says so. */
export const formatAddMusicLabel = (newMusicNumber: string) => {
    return withMusicNumber('Start new music', newMusicNumber);
};

export {resolveNewMusicNumber} from '../../tiptap/extensions/music/musicCommands';

export const resolveOpenMusicAtBlock = (
    snapshot: ScriptBlockIndexSnapshot,
    blockId: string,
): DerivedMusic | null => resolveMusicOutCandidate(snapshot, blockId);

export type MusicOutBoundaryAction = 'add' | 'set' | 'remove';

export interface MusicBoundaryAvailability {
    canAddMusic: boolean,
    newMusicNumber: string | null,
    outAction: MusicOutBoundaryAction | null,
    outMusic: DerivedMusic | null,
    isOrphanOut: boolean,
    /** False when the end has nowhere to move to, which is when it is not worth offering. */
    canResetEnd: boolean,
}

export interface MusicBoundaryAtomState {
    hasMusicStart: boolean,
    hasMusicOut: boolean,
}

export const resolveMusicBoundaryAvailabilityFromSnapshot = (
    snapshot: ScriptBlockIndexSnapshot,
    blockId: string,
    atoms: MusicBoundaryAtomState,
): MusicBoundaryAvailability | null => {
    const block = snapshot.blocks.find(candidate => candidate.blockId === blockId);

    if (!block) {
        return null;
    }

    const explicitOutMusic = snapshot.music.find(music => music.endBlockId === blockId) ?? null;
    const outMusic = atoms.hasMusicOut
        ? explicitOutMusic
        : resolveMusicOutCandidate(snapshot, blockId);
    const isOrphanOut = atoms.hasMusicOut
        && snapshot.orphanMusicOutBlockIds.includes(blockId);
    const canAddMusic = block.blockType === 'stageDirection' && !atoms.hasMusicStart;

    return {
        canAddMusic,
        newMusicNumber: canAddMusic ? resolveNewMusicNumber(snapshot, blockId) : null,
        outAction: atoms.hasMusicOut ? 'remove' : outMusic ? outMusic.endBlockId ? 'set' : 'add' : null,
        outMusic,
        isOrphanOut,
        canResetEnd: canResetMusicEnd(snapshot, blockId),
    };
};

export const resolveMusicBoundaryAvailability = (
    editor: TiptapEditor,
    blockId: string,
): MusicBoundaryAvailability | null => {
    const block = resolveScriptTargetBlock(editor.state, blockId);

    if (!block) {
        return null;
    }

    const snapshot = buildIndexSnapshotFromPmDoc(editor.state.doc);
    const hasOut = findMusicAtomRange(block, MUSIC_OUT_NODE_NAME) !== null;
    const hasMusicStart = resolveMusicTargetBlock(editor.state, blockId) !== null
        && blockHasMusicStart(block);

    return resolveMusicBoundaryAvailabilityFromSnapshot(snapshot, blockId, {
        hasMusicStart,
        hasMusicOut: hasOut,
    });
};

const resolveOutCommand = (
    editor: TiptapEditor,
    blockId: string,
    availability: MusicBoundaryAvailability,
): BlockActionCommand | null => {
    const {outAction, outMusic} = availability;

    if (!outAction) {
        return null;
    }

    if (outAction === 'remove') {
        // A stray end belongs to no music, so there is nothing to hand it back to.
        if (!outMusic) {
            return {
                kind: 'command',
                id: 'remove-out',
                label: 'Remove stray end',
                icon: 'musicOut',
                run: () => {
                    editor.commands.removeMusicOutAtBlock(blockId);
                    editor.commands.focus();
                },
            };
        }

        if (!availability.canResetEnd) {
            return null;
        }

        return {
            kind: 'command',
            id: 'remove-out',
            label: formatResetMusicEndLabel(outMusic),
            detail: formatMusicTitlePreview(outMusic),
            detailFull: formatMusicTitleFull(outMusic),
            icon: 'musicOut',
            run: () => {
                editor.commands.removeMusicOutAtBlock(blockId);
                editor.commands.focus();
            },
        };
    }

    if (!outMusic) {
        return null;
    }

    return {
        kind: 'command',
        id: 'set-out',
        label: formatSetMusicOutLabel(outMusic),
        detail: formatMusicTitlePreview(outMusic),
        detailFull: formatMusicTitleFull(outMusic),
        icon: 'musicOut',
        run: () => {
            editor.commands.setMusicOutAtBlock(blockId);
            editor.commands.focus();
        },
    };
};

export const resolveMusicBoundaryActions = ({
    editor,
    blockId,
}: BlockActionContext): readonly BlockActionItem[] => {
    const availability = resolveMusicBoundaryAvailability(editor, blockId);

    if (!availability) {
        return [];
    }

    const items: BlockActionCommand[] = [];

    if (availability.canAddMusic && availability.newMusicNumber) {
        items.push({
            kind: 'command',
            id: 'add-music',
            label: formatAddMusicLabel(availability.newMusicNumber),
            icon: 'musicStart',
            run: () => editor.commands.insertMusicDraft(blockId),
        });
    }

    const outCommand = resolveOutCommand(editor, blockId, availability);

    if (outCommand) {
        items.push(outCommand);
    }

    return items.length > 0 ? [
        {
            kind: 'submenu',
            id: 'music',
            label: 'Music',
            icon: 'music',
            items,
        },
    ] : [];
};

export const resolveStageDirectionMusicActions = resolveMusicBoundaryActions;
