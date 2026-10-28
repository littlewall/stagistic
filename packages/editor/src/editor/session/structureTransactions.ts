import {createNodeId, getDefaultActName} from '@stagistic/script';
import type {Editor} from '@tiptap/core';
import {closeHistory} from '@tiptap/pm/history';
import type {Node as ProseMirrorNode} from '@tiptap/pm/model';
import type {Transaction} from '@tiptap/pm/state';

type Block = {
    id: string | null,
    type: string,
    pos: number,
    node: ProseMirrorNode,
};

const getBlocks = (editor: Editor): Block[] => {
    const blocks: Block[] = [];

    editor.state.doc.forEach((node, pos) => blocks.push({
        id: typeof node.attrs.id === 'string' ? node.attrs.id : null,
        type: typeof node.attrs.blockType === 'string' ? node.attrs.blockType : node.type.name,
        pos,
        node,
    }));

    return blocks;
};

const dispatch = (editor: Editor, transaction: Transaction) => {
    editor.view.dispatch(closeHistory(transaction));
    editor.view.dispatch(closeHistory(editor.state.tr));
};

export const createStructureCommands = (getEditor: () => Editor | null, isReadOnly: boolean) => {
    const activeEditor = () => {
        const editor = getEditor();

        return !isReadOnly && editor && !editor.isDestroyed ? editor : null;
    };
    const insert = (type: 'scene' | 'act', beforeBlockId: string | null, title: string): string | null => {
        const editor = activeEditor();

        if (!editor || (type === 'scene' && !title.trim())) {
            return null;
        }

        const blocks = getBlocks(editor);
        const target = beforeBlockId === null ? editor.state.doc.content.size : blocks.find(block => block.id === beforeBlockId)?.pos;

        if (target === undefined) {
            return null;
        }

        const id = createNodeId();
        const value = title.trim();
        const node = editor.schema.nodes[type]?.create({id, blockType: type}, value ? editor.schema.text(value) : undefined);

        if (!node) {
            return null;
        }

        dispatch(editor, editor.state.tr.insert(target, node));

        return id;
    };
    const rename = (type: 'scene' | 'act', id: string, title: string): boolean => {
        const editor = activeEditor();
        // Acts are stored in capitals, as the Editor types them; scenes as typed: their casing is a setting that is only rendered.
        const value = type === 'act' ? title.trim().toLocaleUpperCase() : title.trim();

        if (!editor || (type === 'scene' && !value)) {
            return false;
        }

        const block = getBlocks(editor).find(item => item.id === id && item.type === type);

        if (!block || block.node.textContent === value) {
            return false;
        }

        const tr = editor.state.tr.replaceWith(block.pos + 1, block.pos + block.node.nodeSize - 1, value ? editor.schema.text(value) : []);

        dispatch(editor, tr);

        return true;
    };

    return {
        renameScene: (id: string, title: string) => rename('scene', id, title),
        insertScene: (beforeBlockId: string | null, title: string) => insert('scene', beforeBlockId, title),
        insertAct: (beforeBlockId: string | null) => {
            const editor = activeEditor();

            return editor ? insert('act', beforeBlockId, getDefaultActName(getBlocks(editor).filter(block => block.type === 'act').length + 1)) : null;
        },
        renameAct: (id: string, title: string) => rename('act', id, title),
        deleteAct: (id: string) => {
            const editor = activeEditor();
            const block = editor && getBlocks(editor).find(item => item.id === id && item.type === 'act');

            if (!editor || !block) {
                return false;
            }

            dispatch(editor, editor.state.tr.delete(block.pos, block.pos + block.node.nodeSize));

            return true;
        },
        moveScene: (id: string, beforeBlockId: string | null) => {
            const editor = activeEditor();

            if (!editor || id === beforeBlockId) {
                return false;
            }

            const blocks = getBlocks(editor);
            const index = blocks.findIndex(block => block.id === id && block.type === 'scene');

            if (index < 0) {
                return false;
            }

            const start = blocks[index].pos;
            const boundary = blocks.slice(index + 1).find(block => block.type === 'scene' || block.type === 'act');
            const end = boundary?.pos ?? editor.state.doc.content.size;
            const target = beforeBlockId === null ? editor.state.doc.content.size : blocks.find(block => block.id === beforeBlockId)?.pos;

            if (target === undefined || (target >= start && target <= end)) {
                return false;
            }

            const content = editor.state.doc.slice(start, end).content;
            const tr = editor.state.tr.delete(start, end);

            tr.insert(target > end ? target - (end - start) : target, content);
            dispatch(editor, tr);

            return true;
        },
    };
};
