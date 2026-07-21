import type {BlockNodeType} from '../../tiptap/scriptCore';
import type {
    BlockActionContext,
    BlockActionItem,
    BlockActionProvider,
} from './actionTypes';
import {resolveStageDirectionMusicActions} from './stageDirectionMusicActions';

const BLOCK_ACTION_PROVIDERS: Partial<Record<BlockNodeType, BlockActionProvider>> = {
    stageDirection: resolveStageDirectionMusicActions,
};

export const resolveBlockActions = (context: BlockActionContext): readonly BlockActionItem[] => {
    const provider = BLOCK_ACTION_PROVIDERS[context.blockType];

    return provider?.(context).filter(item => {
        return item.kind === 'command' || item.items.length > 0;
    }) ?? [];
};
