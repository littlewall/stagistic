import type {DecorationSet} from '@tiptap/pm/view';

import type {
    EditorLiveCharacterSnapshot,
    EditorLiveStructureSnapshot,
} from '../contracts';
import type {BlockNodeType} from '../tiptap/scriptCore';

export interface EditorCharacterRuntime {
    snapshot: EditorLiveCharacterSnapshot,
    decorations: DecorationSet,
}

export interface EditorRuntimeState {
    revision: number,
    activeBlockId: string | null,
    activeBlockType: BlockNodeType | null,
    structure: EditorLiveStructureSnapshot,
    characters: EditorLiveCharacterSnapshot,
    characterDecorations: DecorationSet,
}
