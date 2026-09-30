import {MUSIC_ID_ATTR, MUSIC_KIND_ATTR, MUSIC_OUT_NODE_NAME, MUSIC_START_NODE_NAME, MUSIC_TITLE_ATTR, type MusicMode} from '@stagistic/script';
import {Extension} from '@tiptap/core';

import {buildIndexSnapshotFromPmDoc} from '../../../runtime/buildIndexSnapshotFromPmDoc';
import {IMMEDIATE_SAVE_META_KEY} from '../../../saveMeta';
import {findMusicStartPositionById} from './musicAtomSelection';
import {createMusicBoundaryPlugin} from './musicBoundaryPlugin';
import {
    blockHasMusicStart,
    buildDeleteMusicStart,
    buildInsertMusicStart,
    buildUpdateMusicMode,
    focusMusicTitle,
    resolveMusicTargetBlock,
    resolveScriptTargetBlock,
} from './musicCommands';
import {buildMoveOrphanMusicOut, buildRemoveMusicOutAtBlock, buildSetMusicOutAtBlock, findMusicAtomRange, resolveMusicOutCandidate} from './musicOutCommands';

interface MusicCommandsExtensionOptions {
    onMusicUnassigned?: (musicId: string) => void;
}

declare module '@tiptap/core' {
    interface Commands<ReturnType> {
        music: {
            insertMusicStart: (
                blockId: string | null,
                title: string,
                mode?: MusicMode,
                options?: {
                    musicId?: string;
                    kind?: string | null;
                    isDraft?: boolean;
                },
            ) => ReturnType;
            insertMusicOut: (blockId: string | null) => ReturnType;
            insertMusicDraft: (blockId: string | null) => ReturnType;
            setMusicOutAtBlock: (blockId: string | null) => ReturnType;
            removeMusicOutAtBlock: (blockId: string) => ReturnType;
            moveOrphanMusicOut: (sourceBlockId: string, targetBlockId: string) => ReturnType;
            deleteMusicStart: (pos: number) => ReturnType;
            updateMusicMode: (pos: number, mode: MusicMode) => ReturnType;
            unassignMusic: (musicId: string) => ReturnType;
            updateMusicMetadata: (musicId: string, title: string, kind: 'song' | 'instrumental') => ReturnType;
        };
    }
}

export const MusicCommandsExtension = Extension.create<MusicCommandsExtensionOptions>({
    name: 'musicCommands',

    addOptions() {
        return {};
    },

    addCommands() {
        return {
            insertMusicStart:
                (blockId, title, mode = 'open', options) =>
                ({state, dispatch}) => {
                    const block = resolveMusicTargetBlock(state, blockId);

                    if (!block || blockHasMusicStart(block)) {
                        return false;
                    }

                    if (dispatch) {
                        dispatch(buildInsertMusicStart(state, block, title, mode, options));
                    }

                    return true;
                },
            insertMusicDraft:
                blockId =>
                ({state, dispatch}) => {
                    const block = resolveMusicTargetBlock(state, blockId);

                    if (!block || blockHasMusicStart(block)) {
                        return false;
                    }

                    if (dispatch) {
                        dispatch(buildInsertMusicStart(state, block, '', 'open', {isDraft: true}));
                        focusMusicTitle(this.editor.view.dom, block.id);
                    }

                    return true;
                },
            insertMusicOut:
                blockId =>
                ({commands}) =>
                    commands.setMusicOutAtBlock(blockId),
            setMusicOutAtBlock:
                blockId =>
                ({state, dispatch}) => {
                    const block = resolveScriptTargetBlock(state, blockId);

                    if (!block) {
                        return false;
                    }

                    if (findMusicAtomRange(block, MUSIC_OUT_NODE_NAME)) {
                        return true;
                    }

                    const snapshot = buildIndexSnapshotFromPmDoc(state.doc);

                    if (!resolveMusicOutCandidate(snapshot, block.id)) {
                        return false;
                    }

                    const tr = buildSetMusicOutAtBlock(state, block.id);

                    if (dispatch && tr) {
                        dispatch(tr);
                    }

                    return true;
                },
            removeMusicOutAtBlock:
                blockId =>
                ({state, dispatch}) => {
                    const tr = buildRemoveMusicOutAtBlock(state, blockId);

                    if (!tr) {
                        return false;
                    }

                    dispatch?.(tr);

                    return true;
                },
            moveOrphanMusicOut:
                (sourceBlockId, targetBlockId) =>
                ({state, dispatch}) => {
                    const transaction = buildMoveOrphanMusicOut(state, sourceBlockId, targetBlockId);

                    if (!transaction) {
                        return false;
                    }

                    dispatch?.(transaction);

                    return true;
                },
            deleteMusicStart:
                pos =>
                ({state, dispatch}) => {
                    const node = state.doc.nodeAt(pos);

                    if (!node || node.type.name !== MUSIC_START_NODE_NAME) {
                        return false;
                    }

                    if (dispatch) {
                        dispatch(buildDeleteMusicStart(state, pos, node));

                        const musicId = String(node.attrs[MUSIC_ID_ATTR] ?? '');

                        if (musicId) {
                            this.options.onMusicUnassigned?.(musicId);
                        }
                    }

                    return true;
                },
            updateMusicMode:
                (pos, mode) =>
                ({state, dispatch}) => {
                    const node = state.doc.nodeAt(pos);

                    if (!node || node.type.name !== MUSIC_START_NODE_NAME) {
                        return false;
                    }

                    dispatch?.(buildUpdateMusicMode(state, pos, node, mode));

                    return true;
                },
            unassignMusic:
                musicId =>
                ({state, dispatch}) => {
                    const pos = findMusicStartPositionById(state, musicId);

                    if (pos === null) {
                        return false;
                    }

                    const node = state.doc.nodeAt(pos);

                    if (!node || node.type.name !== MUSIC_START_NODE_NAME) {
                        return false;
                    }

                    if (dispatch) {
                        dispatch(buildDeleteMusicStart(state, pos, node));
                        this.options.onMusicUnassigned?.(musicId);
                    }

                    return true;
                },
            updateMusicMetadata:
                (musicId, title, kind) =>
                ({state, dispatch}) => {
                    const pos = findMusicStartPositionById(state, musicId);
                    const normalizedTitle = title.trim();

                    if (pos === null || !normalizedTitle) {
                        return false;
                    }

                    const node = state.doc.nodeAt(pos);

                    if (!node || node.type.name !== MUSIC_START_NODE_NAME) {
                        return false;
                    }

                    if (dispatch) {
                        dispatch(
                            state.tr
                                .setNodeMarkup(pos, undefined, {
                                    ...node.attrs,
                                    [MUSIC_TITLE_ATTR]: normalizedTitle,
                                    [MUSIC_KIND_ATTR]: kind,
                                })
                                .setMeta(IMMEDIATE_SAVE_META_KEY, true),
                        );
                    }

                    return true;
                },
        };
    },

    addProseMirrorPlugins() {
        return [createMusicBoundaryPlugin()];
    },
});
