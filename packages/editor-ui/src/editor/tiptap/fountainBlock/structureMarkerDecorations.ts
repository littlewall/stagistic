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

import {FOUNTAIN_BLOCK_NODE_NAME} from '../fountainCore';
import styles from './StructureMarkerDecorations.module.css';

type MarkerKind = 'music-start' | 'music-end';

type MarkerDecoration = {
    pos: number,
    kind: MarkerKind,
    label: string,
    order: number,
};

const structureMarkerDecorationsKey = new PluginKey('fountain-structure-marker-decorations');

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
        if (node.type.name !== FOUNTAIN_BLOCK_NODE_NAME) {
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
    props: {
        decorations: state => buildStructureMarkerDecorations(
            state.doc,
            options?.structureSettings,
        ),
    },
});
