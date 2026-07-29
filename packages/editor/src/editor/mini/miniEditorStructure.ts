import {
    getScriptBlockNodeType,
    isScriptBlockNode,
    MUSIC_ID_ATTR,
    MUSIC_START_NODE_NAME,
    type ScriptDocument,
    type ScriptNode,
} from '@stagistic/script';
import type {Node as ProseMirrorNode} from '@tiptap/pm/model';
import type {Transaction} from '@tiptap/pm/state';

import {isScriptBlockNodeName} from '../tiptap/scriptCore';

export type MiniEditorStructureSignature = {
    blocks: readonly {
        id: string,
        type: string,
    }[],
    music: {
        blockId: string,
        musicId: string,
    },
};

const readProseMirrorMusic = (
    block: ProseMirrorNode,
    blockId: string,
) => {
    const music: MiniEditorStructureSignature['music'][] = [];

    block.descendants(node => {
        if (node.type.name !== MUSIC_START_NODE_NAME) {
            return true;
        }

        const musicId: unknown = node.attrs[MUSIC_ID_ATTR];

        if (typeof musicId === 'string' && musicId.length > 0) {
            music.push({blockId, musicId});
        }

        return false;
    });

    return music;
};

const collectJsonMusic = (
    nodes: readonly ScriptNode[] | undefined,
    blockId: string,
    result: MiniEditorStructureSignature['music'][],
) => {
    nodes?.forEach(node => {
        if (node.type === MUSIC_START_NODE_NAME) {
            const musicId: unknown = node.attrs?.[MUSIC_ID_ATTR];

            if (typeof musicId === 'string' && musicId.length > 0) {
                result.push({blockId, musicId});
            }
        }

        collectJsonMusic(node.content, blockId, result);
    });
};

export const buildMiniEditorDocumentStructureSignature = (
    documentValue: ScriptDocument,
): MiniEditorStructureSignature | null => {
    const blocks: MiniEditorStructureSignature['blocks'][number][] = [];
    const music: MiniEditorStructureSignature['music'][] = [];

    documentValue.content.forEach(block => {
        if (!isScriptBlockNode(block)) {
            return;
        }

        const id: unknown = block.attrs?.id;
        const type = getScriptBlockNodeType(block);

        if (typeof id !== 'string' || id.length === 0 || !type) {
            return;
        }

        blocks.push({id, type});
        collectJsonMusic(block.content, id, music);
    });

    if (
        blocks.length !== documentValue.content.length
        || music.length !== 1
    ) {
        return null;
    }

    return {
        blocks,
        music: music[0],
    };
};

export const buildMiniEditorStructureSignature = (
    doc: ProseMirrorNode,
): MiniEditorStructureSignature | null => {
    const blocks: MiniEditorStructureSignature['blocks'][number][] = [];
    const music: MiniEditorStructureSignature['music'][] = [];

    doc.forEach(block => {
        if (!isScriptBlockNodeName(block.type.name)) {
            return;
        }

        const id: unknown = block.attrs.id;

        if (typeof id !== 'string' || id.length === 0) {
            return;
        }

        blocks.push({
            id,
            type: block.type.name,
        });
        music.push(...readProseMirrorMusic(block, id));
    });

    if (blocks.length !== doc.childCount || music.length !== 1) {
        return null;
    }

    return {
        blocks,
        music: music[0],
    };
};

export const matchesMiniEditorStructureSignature = (
    doc: ProseMirrorNode,
    signature: MiniEditorStructureSignature,
) => {
    const candidate = buildMiniEditorStructureSignature(doc);

    if (!candidate || candidate.blocks.length !== signature.blocks.length) {
        return false;
    }

    const blocksMatch = candidate.blocks.every((block, index) => {
        const expected = signature.blocks[index];

        return block.id === expected.id && block.type === expected.type;
    });

    return blocksMatch
        && candidate.music.blockId === signature.music.blockId
        && candidate.music.musicId === signature.music.musicId;
};

export const shouldApplyMiniEditorTransaction = (
    transaction: Transaction,
    signature: MiniEditorStructureSignature,
) => {
    return !transaction.docChanged
        || matchesMiniEditorStructureSignature(transaction.doc, signature);
};
