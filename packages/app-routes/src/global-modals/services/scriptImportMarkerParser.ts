import {
    detectSectionMarker,
    type ScriptImportedTitlePageField,
} from '@stagistic/script';

export const IMPORT_MARKER_TOKEN_PREFIX = '__STAGISTIC_IMPORT_MARKER__:';

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

export type PendingSynopsisMarker = {
    token: string,
    synopsisText: string,
};

const importTokenText = (token: string) => `${IMPORT_MARKER_TOKEN_PREFIX}${token}`;
const buildNormalizedActImportLine = (name: string) => {
    const trimmedName = name.trim();

    return trimmedName ? `# ${trimmedName}` : '#';
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
        const marker = detectSectionMarker(line);

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
