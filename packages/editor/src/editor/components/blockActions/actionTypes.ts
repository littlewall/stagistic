import type {Editor as TiptapEditor} from '@tiptap/react';

import type {BlockNodeType} from '../../tiptap/scriptCore';

export type BlockActionIcon = 'cue' | 'cueStart' | 'cueHit' | 'cueOut';

export interface BlockActionCommand {
    kind: 'command',
    id: string,
    label: string,
    detail?: string,
    icon: BlockActionIcon,
    run: () => void,
}

export interface BlockActionSubmenu {
    kind: 'submenu',
    id: string,
    label: string,
    icon: BlockActionIcon,
    items: readonly BlockActionCommand[],
}

export type BlockActionItem = BlockActionCommand | BlockActionSubmenu;

export interface BlockActionContext {
    editor: TiptapEditor,
    blockId: string,
    blockType: BlockNodeType,
}

export type BlockActionProvider = (
    context: BlockActionContext,
) => readonly BlockActionItem[];
