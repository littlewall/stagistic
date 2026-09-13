import {Extension} from '@tiptap/core';
import type {EditorState} from '@tiptap/pm/state';
import {
    Plugin,
    PluginKey,
    TextSelection,
} from '@tiptap/pm/state';
import {
    Decoration,
    DecorationSet,
} from '@tiptap/pm/view';

import {
    buildSceneCollapseRanges,
    findCollapsedSceneContainingPosition,
    reconcileCollapsedSceneIds,
    type SceneCollapseRange,
} from './sceneCollapseModel';

export interface SceneCollapseSnapshot {
    collapsedSceneIds: readonly string[],
    ranges: readonly SceneCollapseRange[],
    decorations: DecorationSet,
}

type SceneCollapseMeta =
    | {type: 'set', sceneBlockIds: readonly string[]}
    | {type: 'toggle', sceneBlockId: string}
    | {type: 'expand', sceneBlockId: string};

const sceneCollapseKey = new PluginKey<SceneCollapseSnapshot>('scene-collapse');

const buildSnapshot = (
    state: Pick<EditorState, 'doc'>,
    requestedIds: Iterable<string>,
): SceneCollapseSnapshot => {
    const ranges = buildSceneCollapseRanges(state.doc);
    const collapsedSceneIds = reconcileCollapsedSceneIds(ranges, requestedIds);
    const collapsedSet = new Set(collapsedSceneIds);
    const decorations: Decoration[] = [];

    ranges.forEach(range => {
        if (!collapsedSet.has(range.sceneBlockId)) {
            return;
        }

        decorations.push(Decoration.node(
            range.headingFrom,
            range.headingTo,
            {'data-scene-collapsed': 'true'},
        ));
        range.bodyBlocks.forEach(block => {
            decorations.push(Decoration.node(
                block.from,
                block.to,
                {'data-scene-content-collapsed': 'true'},
            ));
        });
    });

    return {
        collapsedSceneIds,
        ranges,
        decorations: DecorationSet.create(state.doc, decorations),
    };
};

const applyMeta = (
    previousIds: readonly string[],
    meta: SceneCollapseMeta,
) => {
    if (meta.type === 'set') {
        return meta.sceneBlockIds;
    }

    const nextIds = new Set(previousIds);

    if (meta.type === 'expand') {
        nextIds.delete(meta.sceneBlockId);

        return nextIds;
    }

    if (nextIds.has(meta.sceneBlockId)) {
        nextIds.delete(meta.sceneBlockId);
    } else {
        nextIds.add(meta.sceneBlockId);
    }

    return nextIds;
};

export const getSceneCollapseSnapshot = (state: EditorState) => {
    return sceneCollapseKey.getState(state) ?? buildSnapshot(state, []);
};

declare module '@tiptap/core' {
    interface Commands<ReturnType> {
        sceneCollapse: {
            setCollapsedScenes: (sceneBlockIds: readonly string[]) => ReturnType,
            toggleSceneCollapsed: (sceneBlockId: string) => ReturnType,
            expandScene: (sceneBlockId: string) => ReturnType,
        },
    }
}

export const SceneCollapseExtension = Extension.create({
    name: 'sceneCollapse',

    addCommands() {
        return {
            setCollapsedScenes: sceneBlockIds => ({tr, dispatch}) => {
                if (dispatch) {
                    tr
                        .setMeta(sceneCollapseKey, {
                            type: 'set',
                            sceneBlockIds,
                        } satisfies SceneCollapseMeta)
                        .setMeta('addToHistory', false);
                }

                return true;
            },
            toggleSceneCollapsed: sceneBlockId => ({tr, dispatch}) => {
                const ranges = buildSceneCollapseRanges(tr.doc);
                const range = ranges.find(candidate => candidate.sceneBlockId === sceneBlockId);

                if (!range) {
                    return false;
                }

                if (dispatch) {
                    const previous = getSceneCollapseSnapshot(this.editor.state);
                    const isCollapsing = !previous.collapsedSceneIds.includes(sceneBlockId);
                    const selectionOwner = findCollapsedSceneContainingPosition(
                        ranges,
                        new Set([sceneBlockId]),
                        tr.selection.from,
                    );

                    if (isCollapsing && selectionOwner) {
                        tr.setSelection(TextSelection.create(tr.doc, range.headingTo - 1));
                    }

                    tr
                        .setMeta(sceneCollapseKey, {
                            type: 'toggle',
                            sceneBlockId,
                        } satisfies SceneCollapseMeta)
                        .setMeta('addToHistory', false);
                }

                return true;
            },
            expandScene: sceneBlockId => ({tr, dispatch}) => {
                const snapshot = getSceneCollapseSnapshot(this.editor.state);

                if (!snapshot.collapsedSceneIds.includes(sceneBlockId)) {
                    return false;
                }

                if (dispatch) {
                    tr
                        .setMeta(sceneCollapseKey, {
                            type: 'expand',
                            sceneBlockId,
                        } satisfies SceneCollapseMeta)
                        .setMeta('addToHistory', false);
                }

                return true;
            },
        };
    },

    addProseMirrorPlugins() {
        return [
            new Plugin<SceneCollapseSnapshot>({
                key: sceneCollapseKey,
                state: {
                    init: (_config, state) => buildSnapshot(state, []),
                    apply: (tr, previous) => {
                        const meta = tr.getMeta(sceneCollapseKey) as SceneCollapseMeta | undefined;

                        if (!meta && !tr.docChanged && !tr.selectionSet) {
                            return previous;
                        }

                        const requestedIds = meta
                            ? applyMeta(previous.collapsedSceneIds, meta)
                            : previous.collapsedSceneIds;
                        const ranges = buildSceneCollapseRanges(tr.doc);
                        const collapsedSceneIds = reconcileCollapsedSceneIds(ranges, requestedIds);
                        const selectionOwner = meta
                            ? null
                            : findCollapsedSceneContainingPosition(
                                ranges,
                                new Set(collapsedSceneIds),
                                tr.selection.from,
                            );

                        return buildSnapshot(
                            {doc: tr.doc},
                            selectionOwner
                                ? collapsedSceneIds.filter(id => id !== selectionOwner.sceneBlockId)
                                : collapsedSceneIds,
                        );
                    },
                },
                props: {
                    decorations: state => sceneCollapseKey.getState(state)?.decorations,
                },
            }),
        ];
    },
});
