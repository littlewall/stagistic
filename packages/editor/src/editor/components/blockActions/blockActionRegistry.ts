import type {BlockActionContext, BlockActionItem, BlockActionProvider} from './actionTypes';
import {resolveCommentActions} from './commentActions';
import {resolveSceneActions} from './sceneActions';
import {resolveMusicBoundaryActions} from './stageDirectionMusicActions';

const BLOCK_ACTION_PROVIDERS: readonly BlockActionProvider[] = [resolveMusicBoundaryActions, resolveSceneActions, resolveCommentActions];

export const resolveBlockActions = (context: BlockActionContext): readonly BlockActionItem[] => {
    return BLOCK_ACTION_PROVIDERS.flatMap(provider => provider(context)).filter(item => {
        return item.kind === 'command' || item.items.length > 0;
    });
};
