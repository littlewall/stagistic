import type {BlockNodeType} from '../../tiptap/scriptCore';
import type {
    BlockActionContext,
    BlockActionItem,
    BlockActionProvider,
} from './actionTypes';
import {resolveStageDirectionCueActions} from './stageDirectionCueActions';

const BLOCK_ACTION_PROVIDERS: Partial<Record<BlockNodeType, BlockActionProvider>> = {
    stageDirection: resolveStageDirectionCueActions,
};

export const resolveBlockActions = (context: BlockActionContext): readonly BlockActionItem[] => {
    const provider = BLOCK_ACTION_PROVIDERS[context.blockType];

    return provider?.(context).filter(item => {
        return item.kind === 'command' || item.items.length > 0;
    }) ?? [];
};
