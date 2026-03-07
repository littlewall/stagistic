import {Extension} from '@tiptap/core';
import {
    type EditorState,
    Plugin,
    PluginKey,
} from '@tiptap/pm/state';
import {
    Decoration,
    DecorationSet,
} from '@tiptap/pm/view';

import {incrementAnnotationDecorationRebuildCount} from '../../perf/editorPerfMetrics';
import {transactionMayAffectBlockStructure} from '../../runtime/transactionGuards';
import {isFountainBlockNodeName} from '../fountainCore';

const annotationDecorationsPluginKey = new PluginKey<DecorationSet>('annotation-decorations');

export interface EditorBlockAnnotation {
    id: string,
    blockId: string,
    layerId: string,
    annotationType: string,
    startOffset: number | null,
    endOffset: number | null,
    status: string,
}

const isVisibleAnnotation = (
    annotation: EditorBlockAnnotation,
    visibleLayerSet: ReadonlySet<string> | null,
) => {
    if (annotation.status !== 'active') {
        return false;
    }

    if (!visibleLayerSet) {
        return true;
    }

    return visibleLayerSet.has(annotation.layerId);
};

const toOffsetRange = (
    annotation: EditorBlockAnnotation,
    textLength: number,
): {
    fromOffset: number,
    toOffset: number,
} | null => {
    if (annotation.startOffset === null || annotation.endOffset === null) {
        return null;
    }

    const fromOffset = Math.max(0, Math.min(annotation.startOffset, textLength));
    const toOffset = Math.max(0, Math.min(annotation.endOffset, textLength));

    if (toOffset <= fromOffset) {
        return null;
    }

    return {
        fromOffset,
        toOffset,
    };
};

const buildDecorations = (
    state: EditorState,
    annotations?: readonly EditorBlockAnnotation[],
    visibleLayerIds?: readonly string[],
) => {
    try {
        if (!annotations || annotations.length === 0) {
            return DecorationSet.empty;
        }

        const visibleLayerSet = visibleLayerIds
            ? new Set(visibleLayerIds)
            : null;
        const annotationsByBlockId = new Map<string, EditorBlockAnnotation[]>();

        annotations.forEach(annotation => {
            if (!isVisibleAnnotation(annotation, visibleLayerSet)) {
                return;
            }

            const bucket = annotationsByBlockId.get(annotation.blockId) ?? [];

            bucket.push(annotation);
            annotationsByBlockId.set(annotation.blockId, bucket);
        });

        if (annotationsByBlockId.size === 0) {
            return DecorationSet.empty;
        }

        const decorations: Decoration[] = [];

        state.doc.descendants((node, pos) => {
            if (!isFountainBlockNodeName(node.type.name)) {
                return true;
            }

            const rawBlockId = typeof node.attrs?.id === 'string'
                ? node.attrs.id.trim()
                : '';

            if (!rawBlockId) {
                return false;
            }

            const blockAnnotations = annotationsByBlockId.get(rawBlockId);

            if (!blockAnnotations || blockAnnotations.length === 0) {
                return false;
            }

            const textLength = node.textContent.length;

            blockAnnotations.forEach(annotation => {
                const offsetRange = toOffsetRange(annotation, textLength);

                if (!offsetRange) {
                    return;
                }

                decorations.push(
                    Decoration.inline(
                        pos + 1 + offsetRange.fromOffset,
                        pos + 1 + offsetRange.toOffset,
                        {
                            class: 'fountain-annotation-decoration',
                            'data-annotation-id': annotation.id,
                            'data-annotation-layer-id': annotation.layerId,
                            'data-annotation-type': annotation.annotationType,
                        },
                    ),
                );
            });

            return false;
        });

        incrementAnnotationDecorationRebuildCount();

        return decorations.length > 0
            ? DecorationSet.create(state.doc, decorations)
            : DecorationSet.empty;
    } catch {
        return DecorationSet.empty;
    }
};

export const AnnotationDecorationsExtension = Extension.create<{
    annotations?: readonly EditorBlockAnnotation[],
    visibleLayerIds?: readonly string[],
}>({
    name: 'AnnotationDecorations',

    addOptions() {
        return {
            annotations: undefined,
            visibleLayerIds: undefined,
        };
    },

    addProseMirrorPlugins() {
        return [
            new Plugin<DecorationSet>({
                key: annotationDecorationsPluginKey,
                state: {
                    init: (_config, state) => buildDecorations(
                        state,
                        this.options.annotations,
                        this.options.visibleLayerIds,
                    ),
                    apply: (tr, pluginState, _oldState, newState) => {
                        if (!tr.docChanged) {
                            return pluginState;
                        }

                        if (!transactionMayAffectBlockStructure(tr)) {
                            return pluginState.map(tr.mapping, tr.doc);
                        }

                        return buildDecorations(
                            newState,
                            this.options.annotations,
                            this.options.visibleLayerIds,
                        );
                    },
                },
                props: {
                    decorations: state => annotationDecorationsPluginKey.getState(state) ?? DecorationSet.empty,
                },
            }),
        ];
    },
});
