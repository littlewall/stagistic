import {
    type DerivedMusic,
    formatMusicNumber,
    type ScriptBlockIndexSnapshot,
} from '@stagistic/script';
import type {Editor as TiptapEditor} from '@tiptap/react';

import {buildIndexSnapshotFromPmDoc} from '../../runtime/buildIndexSnapshotFromPmDoc';
import {
    blockHasMusicAtom,
    resolveMusicTargetBlock,
    resolveNewMusicNumber,
} from '../../tiptap/extensions/music/musicCommands';
import type {
    BlockActionCommand,
    BlockActionContext,
    BlockActionItem,
} from './actionTypes';

const focusMusicTitle = (editor: TiptapEditor, blockId: string) => {
    window.requestAnimationFrame(() => {
        const block = Array.from(editor.view.dom.querySelectorAll<HTMLElement>('[data-id]'))
            .find(candidate => candidate.dataset.id === blockId);
        const input = block?.querySelector<HTMLElement>('[data-music-title-input="start"]');

        input?.focus();
    });
};

const MUSIC_TITLE_PREVIEW_LENGTH = 10;

const truncateMusicTitle = (title: string) => {
    const characters = Array.from(title.trim());

    if (characters.length <= MUSIC_TITLE_PREVIEW_LENGTH) {
        return characters.join('');
    }

    return `${characters.slice(0, MUSIC_TITLE_PREVIEW_LENGTH).join('')}…`;
};

export const formatOpenMusicDisplayName = (music: DerivedMusic) => {
    const number = formatMusicNumber(music);
    const title = truncateMusicTitle(music.title);

    return title ? `${number} ${title}` : number;
};

export {resolveNewMusicNumber} from '../../tiptap/extensions/music/musicCommands';

export const resolveOpenMusicAtBlock = (
    snapshot: ScriptBlockIndexSnapshot,
    blockId: string,
): DerivedMusic | null => {
    const blocksById = new Map(snapshot.blocks.map(block => [block.blockId, block] as const));
    const targetBlock = blocksById.get(blockId);

    if (!targetBlock) {
        return null;
    }

    const latestOpenMusic = snapshot.music
        .filter(music => {
            const startBlock = blocksById.get(music.startBlockId);

            return music.mode === 'open'
                && startBlock !== undefined
                && startBlock.orderNo < targetBlock.orderNo
                && startBlock.sceneBlockId === targetBlock.sceneBlockId;
        })
        .sort((left, right) => {
            const leftOrder = blocksById.get(left.startBlockId)?.orderNo ?? -1;
            const rightOrder = blocksById.get(right.startBlockId)?.orderNo ?? -1;

            return rightOrder - leftOrder;
        })[0];

    if (!latestOpenMusic?.endBlockId) {
        return latestOpenMusic ?? null;
    }

    const endBlock = blocksById.get(latestOpenMusic.endBlockId);

    return endBlock && endBlock.orderNo > targetBlock.orderNo
        ? latestOpenMusic
        : null;
};

const resolveMusicAvailability = (editor: TiptapEditor, blockId: string) => {
    const block = resolveMusicTargetBlock(editor.state, blockId);

    if (!block || blockHasMusicAtom(block)) {
        return null;
    }

    const snapshot = buildIndexSnapshotFromPmDoc(editor.state.doc);
    const newMusicNumber = resolveNewMusicNumber(snapshot, blockId);

    if (!newMusicNumber) {
        return null;
    }

    return {
        openMusic: resolveOpenMusicAtBlock(snapshot, blockId),
        newMusicNumber,
    };
};

const runAddMusic = (editor: TiptapEditor, blockId: string) => {
    if (!resolveMusicAvailability(editor, blockId)) {
        return;
    }

    if (editor.commands.insertMusicStart(blockId, '', 'open', {isDraft: true})) {
        focusMusicTitle(editor, blockId);
    }
};

const runAddOut = (editor: TiptapEditor, blockId: string) => {
    if (!resolveMusicAvailability(editor, blockId)?.openMusic) {
        return;
    }

    editor.commands.insertMusicOut(blockId);
    editor.commands.focus();
};

export const resolveStageDirectionMusicActions = ({
    editor,
    blockId,
}: BlockActionContext): readonly BlockActionItem[] => {
    const availability = resolveMusicAvailability(editor, blockId);

    if (!availability) {
        return [];
    }

    const items: BlockActionCommand[] = [
        {
            kind: 'command',
            id: 'add-music',
            label: 'Add music',
            detail: availability.newMusicNumber,
            icon: 'musicStart',
            run: () => runAddMusic(editor, blockId),
        },
    ];

    if (availability.openMusic) {
        items.push({
            kind: 'command',
            id: 'add-out',
            label: 'Add out',
            detail: formatOpenMusicDisplayName(availability.openMusic),
            icon: 'musicOut',
            run: () => runAddOut(editor, blockId),
        });
    }

    return [
        {
            kind: 'submenu',
            id: 'music',
            label: 'Music',
            icon: 'music',
            items,
        },
    ];
};
