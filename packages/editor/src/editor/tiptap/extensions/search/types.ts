import type {ScriptBlockNodeType} from '@stagistic/script';
import type {DecorationSet} from '@tiptap/pm/view';

export interface SearchCriteria {
    query: string;
    caseSensitive: boolean;
    blockTypes: readonly ScriptBlockNodeType[] | null;
}

export interface SearchResult {
    from: number;
    to: number;
    blockId: string | null;
    blockType: ScriptBlockNodeType;
}

export interface EditorSearchSnapshot {
    criteria: SearchCriteria;
    results: readonly SearchResult[];
    currentIndex: number;
    decorations: DecorationSet;
}

export const DEFAULT_SEARCH_CRITERIA: SearchCriteria = {
    query: '',
    caseSensitive: false,
    blockTypes: null,
};
