import {
    type DerivedMusic,
    formatMusicNumber,
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

export const formatOpenMusicDisplayName = (music: DerivedMusic) => {
    const number = formatMusicNumber(music);
    const title = truncateMusicTitle(music.title);

    return title ? `${number} ${title}` : number;
};

export const formatSetMusicOutLabel = (music: DerivedMusic) => {
    const number = formatMusicNumber(music).replace(/\)$/u, '');

    return `Set out here (${number})`;
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
        return {
            kind: 'command',
            id: 'remove-out',
            label: 'Remove out',
            detail: outMusic ? formatOpenMusicDisplayName(outMusic) : undefined,
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
        id: outAction === 'set' ? 'set-out' : 'add-out',
        label: outAction === 'set' ? formatSetMusicOutLabel(outMusic) : 'Add out',
        detail: formatOpenMusicDisplayName(outMusic),
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
            label: 'Add music',
            detail: availability.newMusicNumber,
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
