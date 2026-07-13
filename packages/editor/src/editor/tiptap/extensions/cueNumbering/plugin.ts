import {
    collectCueAtoms,
    CUE_DRAFT_ATTR,
    CUE_ID_ATTR,
    CUE_KIND_ATTR,
    CUE_MODE_ATTR,
    CUE_OUT_NODE_NAME,
    CUE_START_NODE_NAME,
    CUE_TITLE_ATTR,
    type CueBlockInput,
    deriveCues,
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
import {buildCueLabelMap} from './cueLabels';

interface CueNumberingState {
    signature: string,
    decorations: DecorationSet,
    decorationCount: number,
}

export const cueNumberingPluginKey = new PluginKey<CueNumberingState>('cueNumbering');

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
        } else if (name === CUE_START_NODE_NAME) {
            parts.push(`s:${String(node.attrs[CUE_ID_ATTR] ?? '')}:${String(node.attrs[CUE_TITLE_ATTR] ?? '')}:${String(node.attrs[CUE_MODE_ATTR] ?? '')}`);
        } else if (name === CUE_OUT_NODE_NAME) {
            parts.push('o');
        }

        return true;
    });

    return parts.join('|');
};

const buildDecorations = (doc: ProseMirrorNode): DecorationSet => {
    const cueBlockInputs: CueBlockInput[] = [];
    const atomSites: {
        pos: number, size: number, name: string, cueId: string, blockId: string,
    }[] = [];
    let currentBlockId = '';

    doc.descendants((node, pos) => {
        if (isScriptBlockNodeName(node.type.name)) {
            currentBlockId = readBlockId(node);

            const cueAtoms = collectCueAtoms(node.toJSON() as ScriptNode);

            node.forEach(child => {
                if (child.type.name !== CUE_START_NODE_NAME || child.attrs[CUE_DRAFT_ATTR] !== true) {
                    return;
                }

                cueAtoms.push({
                    role: 'start',
                    cueId: String(child.attrs[CUE_ID_ATTR] ?? ''),
                    mode: child.attrs[CUE_MODE_ATTR] === 'hit' ? 'hit' : 'open',
                    title: String(child.attrs[CUE_TITLE_ATTR] ?? ''),
                    kind: typeof child.attrs[CUE_KIND_ATTR] === 'string' ? child.attrs[CUE_KIND_ATTR] : null,
                });
            });

            cueBlockInputs.push({
                blockId: currentBlockId,
                blockType: resolveBlockType(node),
                cueAtoms,
            });
        }

        if (node.type.name === CUE_START_NODE_NAME || node.type.name === CUE_OUT_NODE_NAME) {
            atomSites.push({
                pos,
                size: node.nodeSize,
                name: node.type.name,
                cueId: String(node.attrs[CUE_ID_ATTR] ?? ''),
                blockId: currentBlockId,
            });
        }

        return true;
    });

    const labels = buildCueLabelMap(deriveCues(cueBlockInputs));
    const decorations = atomSites.map(site => {
        if (site.name === CUE_START_NODE_NAME) {
            return Decoration.node(site.pos, site.pos + site.size, {}, {cueNumber: labels.byCueId.get(site.cueId) ?? ''});
        }

        const outParts = labels.outPartsByEndBlockId.get(site.blockId);

        return Decoration.node(site.pos, site.pos + site.size, {}, {
            cueId: outParts?.cueId ?? '',
            outLabel: labels.outByEndBlockId.get(site.blockId) ?? 'out',
            outNumber: outParts?.number ?? '',
            outTitle: outParts?.title ?? '',
        });
    });

    return DecorationSet.create(doc, decorations);
};

const createCueNumberingState = (
    doc: ProseMirrorNode,
    signature = computeSignature(doc),
): CueNumberingState => {
    const decorations = buildDecorations(doc);

    return {
        signature,
        decorations,
        decorationCount: decorations.find().length,
    };
};

export const cueNumberingPlugin = () => new Plugin<CueNumberingState>({
    key: cueNumberingPluginKey,
    state: {
        init: (_config, state) => createCueNumberingState(state.doc),
        apply: (tr, prev) => {
            if (!tr.docChanged) {
                return prev;
            }

            const signature = computeSignature(tr.doc);

            if (signature !== prev.signature) {
                return createCueNumberingState(tr.doc, signature);
            }

            const decorations = prev.decorations.map(tr.mapping, tr.doc);

            if (decorations.find().length !== prev.decorationCount) {
                return createCueNumberingState(tr.doc, signature);
            }

            return {
                signature,
                decorations,
                decorationCount: prev.decorationCount,
            };
        },
    },
    props: {
        decorations: state => cueNumberingPluginKey.getState(state)?.decorations,
    },
});
