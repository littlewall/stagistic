import type {ScriptDocument} from '@stagistic/script';
import {
    DEFAULT_EDITOR_SETTINGS,
    detectSectionMarker,
    ELEMENT_SCENE_HEADING,
    getScriptBlockId,
    getScriptBlockLegacyType,
    isScriptBlockNode,
    type ScriptImportedSceneSynopsis,
    type ScriptImportedTitlePageField,
    type StructureSettings,
} from '@stagistic/script';

const IMPORT_MARKER_TOKEN_PREFIX = '__STAGISTIC_IMPORT_MARKER__:';
const TITLE_PAGE_FIELD_PATTERN = /^([^:\n][^:\n]*):\s*(.*)$/;
const TITLE_PAGE_CONTINUATION_PATTERN = /^\s+(.+)$/;
const PAGE_BREAK_PATTERN = /^={3,}\s*$/;
const KNOWN_TITLE_PAGE_FIELD_KEYS = new Set([
    'title',
    'credit',
    'author',
    'authors',
    'source',
    'notes',
    'draft date',
    'date',
    'contact',
    'copyright',
]);

type PendingSynopsisMarker = {
    token: string,
    synopsisText: string,
};

const importTokenText = (token: string) => `${IMPORT_MARKER_TOKEN_PREFIX}${token}`;
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

const extractTitlePageFields = (
    lines: string[],
): {
    bodyLines: string[],
    titlePageFields: ScriptImportedTitlePageField[],
} => {
    const parsedFields: Array<{fieldKey: string, values: string[]}> = [];
    let currentField: {fieldKey: string, values: string[]} | null = null;
    let cursor = 0;
    let terminatedByBlank = false;
    let foundTitleField = false;

    while (cursor < lines.length) {
        const line = lines[cursor];
        const trimmed = line.trim();

        if (!foundTitleField && trimmed.length === 0) {
            cursor += 1;
            continue;
        }

        const fieldMatch = TITLE_PAGE_FIELD_PATTERN.exec(line);

        if (fieldMatch) {
            const fieldKey = fieldMatch[1]?.trim() ?? '';
            const value = fieldMatch[2]?.trim() ?? '';
            const parsedField = {
                fieldKey,
                values: value.length > 0 ? [value] : [],
            };

            parsedFields.push(parsedField);
            currentField = parsedField;
            foundTitleField = true;
            cursor += 1;

            continue;
        }

        const continuationMatch = currentField
            ? TITLE_PAGE_CONTINUATION_PATTERN.exec(line)
            : null;

        if (continuationMatch && currentField) {
            const value = continuationMatch[1]?.trim() ?? '';

            if (value.length > 0) {
                currentField.values.push(value);
            }

            cursor += 1;
            continue;
        }

        if (foundTitleField && trimmed.length === 0) {
            cursor += 1;
            terminatedByBlank = true;
            break;
        }

        if (foundTitleField) {
            return {
                bodyLines: lines,
                titlePageFields: [],
            };
        }

        break;
    }

    if (!foundTitleField || (!terminatedByBlank && cursor < lines.length)) {
        return {
            bodyLines: lines,
            titlePageFields: [],
        };
    }

    const hasKnownFieldKey = parsedFields.some(field => {
        return KNOWN_TITLE_PAGE_FIELD_KEYS.has(field.fieldKey.trim().toLowerCase());
    });

    if (!hasKnownFieldKey && parsedFields.length < 2) {
        return {
            bodyLines: lines,
            titlePageFields: [],
        };
    }

    const titlePageFields = parsedFields
        .map((field, orderNo) => ({
            fieldKey: field.fieldKey,
            value: field.values.join('\n').trim(),
            orderNo,
        }))
        .filter(field => field.fieldKey.length > 0);

    return {
        bodyLines: lines.slice(cursor),
        titlePageFields,
    };
};

const isSynopsisLine = (line: string) => {
    const trimmed = line.trim();

    if (!trimmed.startsWith('=')) {
        return false;
    }

    if (PAGE_BREAK_PATTERN.test(trimmed)) {
        return false;
    }

    return true;
};

export const parseImportedSourceWithMarkers = (
    source: string,
    settings?: Partial<StructureSettings>,
) => {
    const pendingSynopsisMarkers: PendingSynopsisMarker[] = [];
    const transformedLines: string[] = [];
    const sourceLines = source.split('\n');
    const {
        bodyLines,
        titlePageFields: pendingTitlePageFields,
    } = extractTitlePageFields(sourceLines);
    let markerIndex = 0;

    for (const line of bodyLines) {
        const marker = detectSectionMarker(line, {settings});

        if (marker) {
            if (marker.kind === 'unknown-section') {
                if (marker.depth === 1) {
                    transformedLines.push(line);
                    continue;
                }

                transformedLines.push(`[[${marker.rawLine}]]`);
                continue;
            }

            if (marker.kind === 'act') {
                transformedLines.push(buildNormalizedActImportLine(marker.name));
                continue;
            }

            transformedLines.push(line);
            continue;
        }

        if (isSynopsisLine(line)) {
            const synopsisText = line.trim().replace(/^=\s*/, '').trim();

            if (synopsisText.length === 0) {
                continue;
            }

            const token = `s${markerIndex += 1}`;

            pendingSynopsisMarkers.push({
                token,
                synopsisText,
            });
            transformedLines.push(`!${importTokenText(token)}`);
            continue;
        }

        transformedLines.push(line);
    }

    return {
        transformedSource: transformedLines.join('\n'),
        pendingSynopsisMarkers,
        pendingTitlePageFields,
    };
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
