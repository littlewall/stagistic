import type {Editor as TiptapEditor} from '@tiptap/react';

import type {BlockNodeType} from '../../tiptap/scriptCore';

export type BlockActionIcon = 'music' | 'musicStart' | 'musicHit' | 'musicOut' | 'delete' | 'comment';

export interface BlockActionCommand {
    kind: 'command';
    id: string;
    label: string;
    /** Compact secondary text, for menus that keep every command on one line. */
    detail?: string;
    /**
     * The same secondary text with nothing clipped, for menus that can give it
     * a line of its own. A music name is what tells two commands apart, so a
     * surface that can afford the room should never show the preview instead.
     */
    detailFull?: string;
    icon: BlockActionIcon;
    run: () => void;
}

export interface BlockActionSubmenu {
    kind: 'submenu';
    id: string;
    label: string;
    icon: BlockActionIcon;
    items: readonly BlockActionCommand[];
}

export type BlockActionItem = BlockActionCommand | BlockActionSubmenu;

export interface BlockActionContext {
    editor: TiptapEditor;
    blockId: string;
    blockType: BlockNodeType;
}

export type BlockActionProvider = (context: BlockActionContext) => readonly BlockActionItem[];
