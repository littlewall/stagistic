import {
    type DerivedCue,
    formatCueNumber,
    type ScriptBlockIndexSnapshot,
} from '@stagistic/script';
import type {Editor as TiptapEditor} from '@tiptap/react';

import {buildIndexSnapshotFromPmDoc} from '../../runtime/buildIndexSnapshotFromPmDoc';
import {
    blockHasCueAtom,
    resolveCueTargetBlock,
    resolveNewCueNumber,
} from '../../tiptap/extensions/cue/cueCommands';
import type {
    BlockActionCommand,
    BlockActionContext,
    BlockActionItem,
} from './actionTypes';

const focusCueTitle = (editor: TiptapEditor, blockId: string) => {
    window.requestAnimationFrame(() => {
        const block = Array.from(editor.view.dom.querySelectorAll<HTMLElement>('[data-id]'))
            .find(candidate => candidate.dataset.id === blockId);
        const input = block?.querySelector<HTMLElement>('[data-cue-title-input="start"]');

        input?.focus();
    });
};

const CUE_TITLE_PREVIEW_LENGTH = 10;

const truncateCueTitle = (title: string) => {
    const characters = Array.from(title.trim());

    if (characters.length <= CUE_TITLE_PREVIEW_LENGTH) {
        return characters.join('');
    }

    return `${characters.slice(0, CUE_TITLE_PREVIEW_LENGTH).join('')}…`;
};

export const formatOpenCueDisplayName = (cue: DerivedCue) => {
    const number = formatCueNumber(cue);
    const title = truncateCueTitle(cue.title);

    return title ? `${number} ${title}` : number;
};

export {resolveNewCueNumber} from '../../tiptap/extensions/cue/cueCommands';

export const resolveOpenCueAtBlock = (
    snapshot: ScriptBlockIndexSnapshot,
    blockId: string,
): DerivedCue | null => {
    const blocksById = new Map(snapshot.blocks.map(block => [block.blockId, block] as const));
    const targetBlock = blocksById.get(blockId);

    if (!targetBlock) {
        return null;
    }

    const latestOpenCue = snapshot.cues
        .filter(cue => {
            const startBlock = blocksById.get(cue.startBlockId);

            return cue.mode === 'open'
                && startBlock !== undefined
                && startBlock.orderNo < targetBlock.orderNo
                && startBlock.sceneBlockId === targetBlock.sceneBlockId;
        })
        .sort((left, right) => {
            const leftOrder = blocksById.get(left.startBlockId)?.orderNo ?? -1;
            const rightOrder = blocksById.get(right.startBlockId)?.orderNo ?? -1;

            return rightOrder - leftOrder;
        })[0];

    if (!latestOpenCue?.endBlockId) {
        return latestOpenCue ?? null;
    }

    const endBlock = blocksById.get(latestOpenCue.endBlockId);

    return endBlock && endBlock.orderNo > targetBlock.orderNo
        ? latestOpenCue
        : null;
};

const resolveCueAvailability = (editor: TiptapEditor, blockId: string) => {
    const block = resolveCueTargetBlock(editor.state, blockId);

    if (!block || blockHasCueAtom(block)) {
        return null;
    }

    const snapshot = buildIndexSnapshotFromPmDoc(editor.state.doc);
    const newCueNumber = resolveNewCueNumber(snapshot, blockId);

    if (!newCueNumber) {
        return null;
    }

    return {
        openCue: resolveOpenCueAtBlock(snapshot, blockId),
        newCueNumber,
    };
};

const runAddCue = (editor: TiptapEditor, blockId: string) => {
    if (!resolveCueAvailability(editor, blockId)) {
        return;
    }

    if (editor.commands.insertCueStart(blockId, '', 'open', {isDraft: true})) {
        focusCueTitle(editor, blockId);
    }
};

const runAddOut = (editor: TiptapEditor, blockId: string) => {
    if (!resolveCueAvailability(editor, blockId)?.openCue) {
        return;
    }

    editor.commands.insertCueOut(blockId);
    editor.commands.focus();
};

export const resolveStageDirectionCueActions = ({
    editor,
    blockId,
}: BlockActionContext): readonly BlockActionItem[] => {
    const availability = resolveCueAvailability(editor, blockId);

    if (!availability) {
        return [];
    }

    const items: BlockActionCommand[] = [
        {
            kind: 'command',
            id: 'add-cue',
            label: 'Add cue',
            detail: availability.newCueNumber,
            icon: 'cueStart',
            run: () => runAddCue(editor, blockId),
        },
    ];

    if (availability.openCue) {
        items.push({
            kind: 'command',
            id: 'add-out',
            label: 'Add out',
            detail: formatOpenCueDisplayName(availability.openCue),
            icon: 'cueOut',
            run: () => runAddOut(editor, blockId),
        });
    }

    return [
        {
            kind: 'submenu',
            id: 'cues',
            label: 'Cues',
            icon: 'cue',
            items,
        },
    ];
};
