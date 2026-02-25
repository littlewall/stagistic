import {Extension} from '@tiptap/core';
import {Plugin, PluginKey} from '@tiptap/pm/state';
import {Decoration, DecorationSet} from '@tiptap/pm/view';

import {isFountainBlockNodeName} from '../fountainCore';

const annotationDecorationsPluginKey = new PluginKey('annotation-decorations');

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
            new Plugin({
                key: annotationDecorationsPluginKey,
                props: {
                    decorations: state => {
                        const annotations = this.options.annotations;

                        if (!annotations || annotations.length === 0) {
                            return null;
                        }

                        const visibleLayerSet = this.options.visibleLayerIds
                            ? new Set(this.options.visibleLayerIds)
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
                            return null;
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

                        if (decorations.length === 0) {
                            return null;
                        }

                        return DecorationSet.create(state.doc, decorations);
                    },
                },
            }),
        ];
    },
});
