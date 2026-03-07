import type {DecorationSet} from '@tiptap/pm/view';

import type {
    EditorLiveCharacterSnapshot,
    EditorLiveStructureSnapshot,
} from '../contracts';
import type {FountainBlockType} from '../tiptap/fountainCore';

export interface EditorCharacterRuntime {
    snapshot: EditorLiveCharacterSnapshot,
    decorations: DecorationSet,
}

export interface EditorRuntimeState {
    revision: number,
    activeBlockId: string | null,
    activeBlockType: FountainBlockType | null,
    structure: EditorLiveStructureSnapshot,
    characters: EditorLiveCharacterSnapshot,
    characterDecorations: DecorationSet,
}
