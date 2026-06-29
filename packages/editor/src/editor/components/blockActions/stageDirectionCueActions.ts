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
        const input = block?.querySelector<HTMLInputElement>('[data-cue-title-input="start"]');

        input?.focus();
    });
};

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

    return {
        openCue: resolveOpenCueAtBlock(snapshot, blockId),
    };
};

const runAddCue = (editor: TiptapEditor, blockId: string) => {
    if (!resolveCueAvailability(editor, blockId)) {
        return;
    }

    if (editor.commands.insertCueStart(blockId, '')) {
        focusCueTitle(editor, blockId);
    }
};

const runAddHitCue = (editor: TiptapEditor, blockId: string) => {
    if (!resolveCueAvailability(editor, blockId)) {
        return;
    }

    if (editor.commands.insertCueStart(blockId, '', 'hit')) {
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

const getOpenCueDisplayName = (cue: DerivedCue) => {
    return cue.title.trim() || `Cue ${formatCueNumber(cue)}`;
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
            icon: 'cueStart',
            run: () => runAddCue(editor, blockId),
        }, {
            kind: 'command',
            id: 'add-hit-cue',
            label: 'Add hit cue',
            icon: 'cueHit',
            run: () => runAddHitCue(editor, blockId),
        },
    ];

    if (availability.openCue) {
        items.push({
            kind: 'command',
            id: 'add-out',
            label: `Add out (${getOpenCueDisplayName(availability.openCue)})`,
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
