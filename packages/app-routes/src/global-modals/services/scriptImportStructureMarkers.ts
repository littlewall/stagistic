import type {ScriptDocument} from '@stagistic/script';
import {
    ELEMENT_SCENE_HEADING,
    getScriptBlockId,
    getScriptBlockLegacyType,
    isScriptBlockNode,
    type ScriptImportedSceneSynopsis,
    type ScriptImportedTitlePageField,
} from '@stagistic/script';

import {
    IMPORT_MARKER_TOKEN_PREFIX,
    type PendingSynopsisMarker,
} from './scriptImportMarkerParser';

export {parseImportedSourceWithMarkers} from './scriptImportMarkerParser';

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

const resolveNearestSceneHeadingBlockId = (
    targetBlockIndex: number,
    blockAnchors: Array<{id: string, node: ScriptDocument['content'][number]}>,
): string | null => {
    for (let index = targetBlockIndex - 1; index >= 0; index -= 1) {
        const candidate = blockAnchors[index];

        if (getScriptBlockLegacyType(candidate.node) === ELEMENT_SCENE_HEADING) {
            return candidate.id;
        }
    }

    for (let index = targetBlockIndex; index < blockAnchors.length; index += 1) {
        const candidate = blockAnchors[index];

        if (getScriptBlockLegacyType(candidate.node) === ELEMENT_SCENE_HEADING) {
            return candidate.id;
        }
    }

    return null;
};

export const attachStructureFromMarkers = (
    value: ScriptDocument,
    pendingSynopsisMarkers: PendingSynopsisMarker[],
    pendingTitlePageFields: ScriptImportedTitlePageField[],
): ScriptDocument => {
    const hasPendingSynopsis = pendingSynopsisMarkers.length > 0;
    const hasPendingTitlePage = pendingTitlePageFields.length > 0;

    if (!hasPendingSynopsis && !hasPendingTitlePage) {
        return value;
    }

    const synopsisByToken = new Map(pendingSynopsisMarkers.map(marker => [marker.token, marker]));
    const filteredContent: ScriptDocument['content'] = [];
    const blockAnchors: Array<{id: string, node: ScriptDocument['content'][number]}> = [];
    const synopsisAnchors: Array<{synopsisText: string, targetBlockIndex: number}> = [];

    value.content.forEach(node => {
        if (!isScriptBlockNode(node)) {
            filteredContent.push(node);

            return;
        }

        const text = getNodeTextContent(node).trim();

        if (text.startsWith(IMPORT_MARKER_TOKEN_PREFIX)) {
            const token = text.slice(IMPORT_MARKER_TOKEN_PREFIX.length);
            const synopsisMarker = synopsisByToken.get(token);

            if (synopsisMarker) {
                synopsisAnchors.push({
                    synopsisText: synopsisMarker.synopsisText,
                    targetBlockIndex: blockAnchors.length,
                });

                return;
            }
        }

        filteredContent.push(node);

        const id = getScriptBlockId(node);

        if (id) {
            blockAnchors.push({
                id,
                node,
            });
        }
    });

    const synopsisChunksByHeadingBlockId = new Map<string, string[]>();

    synopsisAnchors.forEach(anchor => {
        const headingBlockId = resolveNearestSceneHeadingBlockId(anchor.targetBlockIndex, blockAnchors);

        if (!headingBlockId) {
            return;
        }

        const chunks = synopsisChunksByHeadingBlockId.get(headingBlockId) ?? [];

        chunks.push(anchor.synopsisText);
        synopsisChunksByHeadingBlockId.set(headingBlockId, chunks);
    });

    const sceneSynopses: ScriptImportedSceneSynopsis[] = Array.from(synopsisChunksByHeadingBlockId.entries())
        .map(([headingBlockId, chunks]) => ({
            headingBlockId,
            synopsis: chunks.join('\n').trim(),
        }))
        .filter(item => item.synopsis.length > 0);
    const hasSceneSynopses = sceneSynopses.length > 0;
    const importMeta = hasPendingTitlePage || hasSceneSynopses
        ? {
            titlePageFields: hasPendingTitlePage
                ? pendingTitlePageFields
                : undefined,
            sceneSynopses: hasSceneSynopses
                ? sceneSynopses
                : undefined,
        }
        : undefined;

    return {
        ...value,
        content: filteredContent,
        attrs: {
            ...value.attrs,
            importMeta,
        },
    };
};
