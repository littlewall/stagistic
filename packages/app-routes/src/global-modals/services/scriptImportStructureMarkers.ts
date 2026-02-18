import type {ScriptDocument} from '@stagistic/script-core';
import {
    createNodeId,
    DEFAULT_EDITOR_SETTINGS,
    detectSectionMarker,
    type StructureSettings,
} from '@stagistic/script-core';

const STRUCTURE_MARKER_TOKEN_PREFIX = '__STAGISTIC_STRUCTURE_MARKER__:';

type PendingMarker =
    {
        kind: 'music-start',
        token: string,
        musicType: 'song' | 'reprise' | 'underscore',
        name: string,
    }
    | {
        kind: 'music-end',
        token: string,
        musicType: 'song' | 'reprise' | 'underscore',
        name: string,
    };

const markerTokenText = (token: string) => `${STRUCTURE_MARKER_TOKEN_PREFIX}${token}`;
const ACT_IMPORT_PREFIX = DEFAULT_EDITOR_SETTINGS.structure.actPrefix.trim() || 'ACT:';
const buildNormalizedActImportLine = (name: string) => {
    const trimmedName = name.trim();

    if (!trimmedName) {
        return `# ${ACT_IMPORT_PREFIX}`;
    }

    return `# ${ACT_IMPORT_PREFIX} ${trimmedName}`;
};

const getNodeTextContent = (node: unknown): string => {
    if (!node || typeof node !== 'object') {
        return '';
    }

    const text = (node as {text?: unknown}).text;

    if (typeof text === 'string') {
        return text;
    }

    const content = (node as {content?: unknown}).content;

    if (!Array.isArray(content)) {
        return '';
    }

    return content.map(getNodeTextContent).join('');
};

export const parseImportedSourceWithMarkers = (
    source: string,
    settings?: Partial<StructureSettings>,
) => {
    const pendingMarkers: PendingMarker[] = [];
    const transformedLines: string[] = [];
    let markerIndex = 0;

    for (const line of source.split('\n')) {
        const marker = detectSectionMarker(line, {settings});

        if (!marker) {
            transformedLines.push(line);
            continue;
        }

        if (marker.kind === 'unknown-section') {
            transformedLines.push(`[[${marker.rawLine}]]`);
            continue;
        }

        if (marker.kind === 'act') {
            transformedLines.push(buildNormalizedActImportLine(marker.name));
            continue;
        }

        const token = `m${markerIndex += 1}`;

        if (marker.kind === 'music-start') {
            pendingMarkers.push({
                kind: 'music-start',
                musicType: marker.musicType,
                name: marker.name,
                token,
            });
        }

        if (marker.kind === 'music-end') {
            pendingMarkers.push({
                kind: 'music-end',
                musicType: marker.musicType,
                name: marker.name,
                token,
            });
        }

        transformedLines.push(`!${markerTokenText(token)}`);
    }

    return {
        transformedSource: transformedLines.join('\n'),
        pendingMarkers,
    };
};

export const attachStructureFromMarkers = (
    value: ScriptDocument,
    pendingMarkers: PendingMarker[],
): ScriptDocument => {
    if (pendingMarkers.length === 0) {
        return value;
    }

    const markerByToken = new Map(pendingMarkers.map(marker => [marker.token, marker]));
    const filteredContent: ScriptDocument['content'] = [];
    const blockAnchors: Array<{id: string, node: ScriptDocument['content'][number]}> = [];
    const markerAnchors: Array<{
        marker: PendingMarker, targetBlockIndex: number, anchorBlockId: string | null,
    }> = [];

    value.content.forEach(node => {
        if (node.type !== 'fountainBlock') {
            filteredContent.push(node);

            return;
        }

        const text = getNodeTextContent(node).trim();

        if (text.startsWith(STRUCTURE_MARKER_TOKEN_PREFIX)) {
            const token = text.slice(STRUCTURE_MARKER_TOKEN_PREFIX.length);
            const marker = markerByToken.get(token);

            if (marker) {
                markerAnchors.push({
                    marker,
                    targetBlockIndex: blockAnchors.length,
                    anchorBlockId: null,
                });

                return;
            }
        }

        filteredContent.push(node);

        const id = typeof node.attrs?.id === 'string' ? node.attrs.id : '';

        if (id) {
            blockAnchors.push({
                id,
                node,
            });
        }
    });

    markerAnchors.forEach(anchor => {
        const next = blockAnchors[anchor.targetBlockIndex] ?? null;

        if (next) {
            anchor.anchorBlockId = next.id;
        }
    });

    const musicSegments: Array<{
        id: string,
        kind: 'music',
        musicType: 'song' | 'reprise' | 'underscore',
        name: string,
        startBlockId: string,
        end: {
            anchor: 'block' | 'eof',
            blockId?: string,
            source: 'explicit' | 'auto-open-next' | 'auto-scene-boundary' | 'auto-eof',
        },
    }> = [];
    let activeSegment: typeof musicSegments[number] | null = null;

    for (const {marker, anchorBlockId} of markerAnchors) {
        if (marker.kind === 'music-start') {
            if (!anchorBlockId) {
                continue;
            }

            if (activeSegment) {
                activeSegment.end = {
                    anchor: 'block',
                    blockId: anchorBlockId,
                    source: 'auto-open-next',
                };
            }

            const segment = {
                id: createNodeId(),
                kind: 'music' as const,
                musicType: marker.musicType,
                name: marker.name,
                startBlockId: anchorBlockId,
                end: {
                    anchor: 'eof' as const,
                    source: 'auto-eof' as const,
                },
            };

            musicSegments.push(segment);
            activeSegment = segment;

            continue;
        }

        if (marker.kind === 'music-end') {
            if (!activeSegment || activeSegment.musicType !== marker.musicType) {
                continue;
            }

            if (anchorBlockId) {
                activeSegment.end = {
                    anchor: 'block',
                    blockId: anchorBlockId,
                    source: 'explicit',
                };

                activeSegment = null;

                continue;
            }

            activeSegment.end = {
                anchor: 'eof',
                source: 'explicit',
            };
            activeSegment = null;
        }
    }

    if (activeSegment) {
        activeSegment.end = {
            anchor: 'eof',
            source: 'auto-eof',
        };
    }

    return {
        ...value,
        content: filteredContent,
        attrs: {
            ...value.attrs,
            structure: {
                version: 1,
                musicSegments,
            },
        },
    };
};
