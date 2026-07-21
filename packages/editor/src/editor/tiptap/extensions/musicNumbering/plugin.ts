import {
    collectMusicAtoms,
    deriveMusic,
    MUSIC_DRAFT_ATTR,
    MUSIC_ID_ATTR,
    MUSIC_KIND_ATTR,
    MUSIC_MODE_ATTR,
    MUSIC_OUT_NODE_NAME,
    MUSIC_START_NODE_NAME,
    MUSIC_TITLE_ATTR,
    type MusicBlockInput,
    resolveScriptBlockNodeType,
    type ScriptNode,
} from '@stagistic/script';
import type {Node as ProseMirrorNode} from '@tiptap/pm/model';
import {
    Plugin, PluginKey,
} from '@tiptap/pm/state';
import {
    Decoration, DecorationSet,
} from '@tiptap/pm/view';

import {
    isScriptBlockNodeName, normalizeBlockNodeType,
} from '../../scriptCore';
import {buildMusicLabelMap} from './musicLabels';

interface MusicNumberingState {
    signature: string,
    decorations: DecorationSet,
    decorationCount: number,
}

export const musicNumberingPluginKey = new PluginKey<MusicNumberingState>('musicNumbering');

const readBlockId = (node: ProseMirrorNode): string => {
    const attrs = node.attrs as Record<string, unknown>;
    const id = attrs.id;

    return typeof id === 'string' && id.trim().length > 0 ? id.trim() : '';
};

const resolveBlockType = (node: ProseMirrorNode): string => {
    const attrs = node.attrs as Record<string, unknown>;

    return normalizeBlockNodeType(resolveScriptBlockNodeType(node.type.name) ?? attrs.blockType ?? 'stageDirection');
};

const computeSignature = (doc: ProseMirrorNode): string => {
    const parts: string[] = [];

    doc.descendants(node => {
        const name = node.type.name;

        if (isScriptBlockNodeName(name) && resolveBlockType(node) === 'scene') {
            parts.push('S');
        } else if (name === MUSIC_START_NODE_NAME) {
            parts.push(`s:${String(node.attrs[MUSIC_ID_ATTR] ?? '')}:${String(node.attrs[MUSIC_TITLE_ATTR] ?? '')}:${String(node.attrs[MUSIC_MODE_ATTR] ?? '')}`);
        } else if (name === MUSIC_OUT_NODE_NAME) {
            parts.push('o');
        }

        return true;
    });

    return parts.join('|');
};

const buildDecorations = (doc: ProseMirrorNode): DecorationSet => {
    const musicBlockInputs: MusicBlockInput[] = [];
    const atomSites: {
        pos: number, size: number, name: string, musicId: string, blockId: string,
    }[] = [];
    let currentBlockId = '';

    doc.descendants((node, pos) => {
        if (isScriptBlockNodeName(node.type.name)) {
            currentBlockId = readBlockId(node);

            const musicAtoms = collectMusicAtoms(node.toJSON() as ScriptNode);

            node.forEach(child => {
                if (child.type.name !== MUSIC_START_NODE_NAME || child.attrs[MUSIC_DRAFT_ATTR] !== true) {
                    return;
                }

                musicAtoms.push({
                    role: 'start',
                    musicId: String(child.attrs[MUSIC_ID_ATTR] ?? ''),
                    mode: child.attrs[MUSIC_MODE_ATTR] === 'hit' ? 'hit' : 'open',
                    title: String(child.attrs[MUSIC_TITLE_ATTR] ?? ''),
                    kind: typeof child.attrs[MUSIC_KIND_ATTR] === 'string' ? child.attrs[MUSIC_KIND_ATTR] : null,
                });
            });

            musicBlockInputs.push({
                blockId: currentBlockId,
                blockType: resolveBlockType(node),
                musicAtoms,
            });
        }

        if (node.type.name === MUSIC_START_NODE_NAME || node.type.name === MUSIC_OUT_NODE_NAME) {
            atomSites.push({
                pos,
                size: node.nodeSize,
                name: node.type.name,
                musicId: String(node.attrs[MUSIC_ID_ATTR] ?? ''),
                blockId: currentBlockId,
            });
        }

        return true;
    });

    const labels = buildMusicLabelMap(deriveMusic(musicBlockInputs));
    const decorations = atomSites.map(site => {
        if (site.name === MUSIC_START_NODE_NAME) {
            return Decoration.node(site.pos, site.pos + site.size, {}, {musicNumber: labels.byMusicId.get(site.musicId) ?? ''});
        }

        const outParts = labels.outPartsByEndBlockId.get(site.blockId);

        return Decoration.node(site.pos, site.pos + site.size, {}, {
            musicId: outParts?.musicId ?? '',
            outLabel: labels.outByEndBlockId.get(site.blockId) ?? 'out',
            outNumber: outParts?.number ?? '',
            outTitle: outParts?.title ?? '',
        });
    });

    return DecorationSet.create(doc, decorations);
};

const createMusicNumberingState = (
    doc: ProseMirrorNode,
    signature = computeSignature(doc),
): MusicNumberingState => {
    const decorations = buildDecorations(doc);

    return {
        signature,
        decorations,
        decorationCount: decorations.find().length,
    };
};

export const musicNumberingPlugin = () => new Plugin<MusicNumberingState>({
    key: musicNumberingPluginKey,
    state: {
        init: (_config, state) => createMusicNumberingState(state.doc),
        apply: (tr, prev) => {
            if (!tr.docChanged) {
                return prev;
            }

            const signature = computeSignature(tr.doc);

            if (signature !== prev.signature) {
                return createMusicNumberingState(tr.doc, signature);
            }

            const decorations = prev.decorations.map(tr.mapping, tr.doc);

            if (decorations.find().length !== prev.decorationCount) {
                return createMusicNumberingState(tr.doc, signature);
            }

            return {
                signature,
                decorations,
                decorationCount: prev.decorationCount,
            };
        },
    },
    props: {
        decorations: state => musicNumberingPluginKey.getState(state)?.decorations,
    },
});
