import type {Node as ProseMirrorNode} from '@tiptap/pm/model';

export const getBlockKey = (node: ProseMirrorNode, pos: number) => {
    const attrs = node.attrs as Record<string, unknown>;
    const id = typeof attrs.id === 'string' ? attrs.id : null;

    return id ? `id:${id}` : `pos:${pos}`;
};
