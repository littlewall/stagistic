import {
    MUSIC_OUT_NODE_NAME,
    MUSIC_START_NODE_NAME,
    type ScriptBlockIndexSnapshot,
} from '@stagistic/script';
import {Extension} from '@tiptap/core';
import type {Node as ProseMirrorNode} from '@tiptap/pm/model';
import {
    Plugin,
    PluginKey,
    type Transaction,
} from '@tiptap/pm/state';

import {
    buildMusicRailBoundaries,
    type MusicRailBoundary,
    type MusicRailBoundarySite,
} from '../../../components/musicRange/musicRangeModel';
import {buildIndexSnapshotFromPmDoc} from '../../../runtime/buildIndexSnapshotFromPmDoc';
import {
    transactionMayAffectBlockStructure,
    transactionTouchesMusic,
    transactionTouchesStructureBlocks,
} from '../../../runtime/transactionGuards';
import {isScriptBlockNodeName} from '../../scriptCore';

export interface MusicRailPluginState {
    boundaries: MusicRailBoundary[],
    rebuildCount: number,
    snapshot: ScriptBlockIndexSnapshot,
}

export const musicRailPluginKey = new PluginKey<MusicRailPluginState>('music-rail');

const collectBoundarySites = (doc: ProseMirrorNode): MusicRailBoundarySite[] => {
    const sites: MusicRailBoundarySite[] = [];

    doc.descendants((node, pos) => {
        if (!isScriptBlockNodeName(node.type.name)) {
            return true;
        }

        let hasMusicStart = false;
        let hasMusicOut = false;

        node.forEach(child => {
            hasMusicStart ||= child.type.name === MUSIC_START_NODE_NAME;
            hasMusicOut ||= child.type.name === MUSIC_OUT_NODE_NAME;
        });

        sites.push({
            blockId: String(node.attrs.id ?? ''),
            pos: pos + node.nodeSize - 1,
            hasMusicStart,
            hasMusicOut,
        });

        return false;
    });

    return sites;
};

const buildBoundaries = (
    doc: ProseMirrorNode,
    snapshot: ScriptBlockIndexSnapshot,
) => {
    return buildMusicRailBoundaries(snapshot, collectBoundarySites(doc));
};

const createPluginState = (
    doc: ProseMirrorNode,
    rebuildCount: number,
): MusicRailPluginState => {
    const snapshot = buildIndexSnapshotFromPmDoc(doc);

    return {
        boundaries: buildBoundaries(doc, snapshot),
        rebuildCount,
        snapshot,
    };
};

const transactionTouchesRail = (
    transaction: Transaction,
    oldDoc: ProseMirrorNode,
    newDoc: ProseMirrorNode,
) => {
    return transactionTouchesMusic(transaction, oldDoc, newDoc)
        || transactionTouchesStructureBlocks(transaction, oldDoc, newDoc)
        || transactionMayAffectBlockStructure(transaction);
};

export const MusicRailExtension = Extension.create({
    name: 'MusicRail',

    addProseMirrorPlugins() {
        return [
            new Plugin<MusicRailPluginState>({
                key: musicRailPluginKey,
                state: {
                    init: (_config, state) => createPluginState(state.doc, 1),
                    apply: (transaction, previous, oldState, newState) => {
                        if (!transaction.docChanged) {
                            return previous;
                        }

                        if (transactionTouchesRail(transaction, oldState.doc, newState.doc)) {
                            return createPluginState(newState.doc, previous.rebuildCount + 1);
                        }

                        return previous;
                    },
                },
            }),
        ];
    },
});
