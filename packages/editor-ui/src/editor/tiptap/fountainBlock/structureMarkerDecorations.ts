import {
    type FountainJSONContent,
    type MusicType,
    normalizeScriptStructure,
    resolveStructureSettings,
    type StructureSettings,
} from '@stagistic/script-core';
import {type Node as ProseMirrorNode} from '@tiptap/pm/model';
import {
    Plugin,
    PluginKey,
} from '@tiptap/pm/state';
import {
    Decoration,
    DecorationSet,
} from '@tiptap/pm/view';

import {isFountainBlockNodeName} from '../fountainCore';
import styles from './StructureMarkerDecorations.module.css';

type MarkerKind = 'music-start' | 'music-end';

type MarkerDecoration = {
    pos: number,
    kind: MarkerKind,
    label: string,
    order: number,
};

interface StructureMarkerDecorationState {
    decorations: DecorationSet,
    structureRef: unknown,
}

const structureMarkerDecorationsKey = new PluginKey<StructureMarkerDecorationState>('fountain-structure-marker-decorations');

type StructureMarkerDecorationsPluginOptions = {
    structureSettings?: Partial<StructureSettings>,
};

const formatMarkerLabel = (prefix: string, name: string) => {
    const normalizedPrefix = prefix.trim();
    const normalizedName = name.trim();

    if (normalizedPrefix && normalizedName) {
        return `${normalizedPrefix} ${normalizedName}`;
    }

    if (normalizedPrefix) {
        return normalizedPrefix;
    }

    return normalizedName;
};

const getMusicPrefix = (
    settings: StructureSettings,
    musicType: MusicType,
    kind: 'start' | 'end',
) => {
    return settings.musicPrefixes[musicType][kind];
};

const createMarkerElement = (marker: MarkerDecoration) => {
    const {
        kind,
        label,
    } = marker;
    const element = document.createElement('div');
    const kindClass = kind === 'music-start'
        ? styles.markerMusicStart
        : styles.markerMusicEnd;

    element.className = `${styles.marker} ${kindClass}`;
    element.setAttribute('contenteditable', 'false');
    element.setAttribute('data-structure-marker', kind);
    element.textContent = label;

    return element;
};

const toDecoration = (marker: MarkerDecoration) => {
    return Decoration.widget(
        marker.pos,
        () => createMarkerElement(marker),
        {
            side: marker.order,
            key: `${marker.kind}:${marker.pos}:${marker.label}:${marker.order}`,
        },
    );
};

const getDocumentContent = (doc: ProseMirrorNode): FountainJSONContent[] => {
    const json = doc.toJSON() as {content?: unknown};

    if (!Array.isArray(json.content)) {
        return [];
    }

    return json.content as FountainJSONContent[];
};

const buildStructureMarkerDecorations = (
    doc: ProseMirrorNode,
    structureSettings?: Partial<StructureSettings>,
) => {
    const resolvedSettings = resolveStructureSettings(structureSettings);
    const normalizedStructure = normalizeScriptStructure((doc.attrs as {structure?: unknown}).structure, {
        content: getDocumentContent(doc),
    });

    if (normalizedStructure.musicSegments.length === 0) {
        return DecorationSet.empty;
    }

    const blockPosById = new Map<string, number>();

    doc.descendants((node, pos) => {
        if (!isFountainBlockNodeName(node.type.name)) {
            return true;
        }

        const blockId = typeof node.attrs.id === 'string' ? node.attrs.id : '';

        if (blockId) {
            blockPosById.set(blockId, pos);
        }

        return false;
    });

    const markers: MarkerDecoration[] = [];

    normalizedStructure.musicSegments.forEach((segment, index) => {
        const startPos = blockPosById.get(segment.startBlockId);

        if (startPos !== undefined) {
            markers.push({
                pos: startPos,
                kind: 'music-start',
                label: formatMarkerLabel(
                    getMusicPrefix(resolvedSettings, segment.musicType, 'start'),
                    segment.name,
                ),
                order: -100 + index,
            });
        }

        if (segment.end.anchor === 'eof') {
            markers.push({
                pos: doc.content.size,
                kind: 'music-end',
                label: formatMarkerLabel(
                    getMusicPrefix(resolvedSettings, segment.musicType, 'end'),
                    segment.name,
                ),
                order: 100 + index,
            });

            return;
        }

        if (!segment.end.blockId) {
            return;
        }

        const endPos = blockPosById.get(segment.end.blockId);

        if (endPos === undefined) {
            return;
        }

        markers.push({
            pos: endPos,
            kind: 'music-end',
            label: formatMarkerLabel(
                getMusicPrefix(resolvedSettings, segment.musicType, 'end'),
                segment.name,
            ),
            order: -200 + index,
        });
    });

    if (markers.length === 0) {
        return DecorationSet.empty;
    }

    const decorations = markers.map(toDecoration);

    return DecorationSet.create(doc, decorations);
};

export const createStructureMarkerDecorationsPlugin = (options?: StructureMarkerDecorationsPluginOptions) => new Plugin({
    key: structureMarkerDecorationsKey,
    state: {
        init: (_config, state): StructureMarkerDecorationState => ({
            decorations: buildStructureMarkerDecorations(
                state.doc,
                options?.structureSettings,
            ),
            structureRef: (state.doc.attrs as {structure?: unknown}).structure,
        }),
        apply: (tr, pluginState, oldState): StructureMarkerDecorationState => {
            const nextStructureRef = (tr.doc.attrs as {structure?: unknown}).structure;
            const previousStructureRef = (oldState.doc.attrs as {structure?: unknown}).structure;
            const structureChanged = previousStructureRef !== nextStructureRef;

            if (!tr.docChanged && !structureChanged) {
                return pluginState;
            }

            if (!structureChanged && tr.docChanged) {
                return {
                    decorations: pluginState.decorations.map(tr.mapping, tr.doc),
                    structureRef: nextStructureRef,
                };
            }

            return {
                decorations: buildStructureMarkerDecorations(
                    tr.doc,
                    options?.structureSettings,
                ),
                structureRef: nextStructureRef,
            };
        },
    },
    props: {
        decorations: state => {
            return structureMarkerDecorationsKey.getState(state)?.decorations ?? DecorationSet.empty;
        },
    },
});
