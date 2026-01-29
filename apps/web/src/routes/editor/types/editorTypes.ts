import type { FountainDocument, FountainNodeTypeValue } from './fountain';

export type EditorMode = 'script' | 'notes';

export type ScriptNodeType = FountainNodeTypeValue;

export interface EditorDocument {
    id: string;
    title: string;
    updatedAt: string;
    mode: EditorMode;
    content: FountainDocument;
}
