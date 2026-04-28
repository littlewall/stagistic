import {dbQueries} from '@stagistic/db';
import {
    type EditorSettingsOverride,
    type FountainElementType,
} from '@stagistic/script-core';
import {
    isObjectRecord,
    uuidv7,
} from '@stagistic/shared';

import {
    isBlockCasing,
    isBlockShortcut,
    isBlockTextAlign,
    normalizeSettingsBlockType,
} from './configBlockTypes';
import {
    fromMillis,
    toMillis,
} from './documentCodec';

type ScriptConfigBlockRow = Awaited<ReturnType<typeof dbQueries.listScriptConfigBlocks>>[number];
type ScriptConfigReplacementRow = Parameters<typeof dbQueries.replaceScriptConfigBlocks>[1]['rows'][number];

export const isScriptSettingsPayload = (
    value: unknown,
): value is Pick<EditorSettingsOverride, 'page' | 'typography' | 'visual' | 'structure'> => {
    if (!isObjectRecord(value)) {
        return false;
    }

    const page = value.page;
    const typography = value.typography;
    const visual = value.visual;
    const structure = value.structure;

    return (page === undefined || isObjectRecord(page))
        && (typography === undefined || isObjectRecord(typography))
        && (visual === undefined || isObjectRecord(visual))
        && (structure === undefined || isObjectRecord(structure));
};

export const hydrateBlockSettings = (
    settings: EditorSettingsOverride,
    row: ScriptConfigBlockRow,
) => {
    const blockType = normalizeSettingsBlockType(row.blockType);

    if (!blockType) {
        return;
    }

    const nextBlockSettings = {
        ...settings.blocks![blockType],
    };
    const spacingBeforeEm = fromMillis(row.spacingBeforeMillis);
    const lineHeight = fromMillis(row.lineHeightMillis);
    const nextElement = normalizeSettingsBlockType(row.nextElement);

    if (spacingBeforeEm !== undefined) {
        nextBlockSettings.spacingBeforeEm = spacingBeforeEm;
    }

    if (lineHeight !== undefined) {
        nextBlockSettings.lineHeight = lineHeight;
    }

    if (row.indentLeftChars !== null && row.indentLeftChars !== undefined) {
        nextBlockSettings.indentLeftChars = row.indentLeftChars;
    }

    if (row.indentRightChars !== null && row.indentRightChars !== undefined) {
        nextBlockSettings.indentRightChars = row.indentRightChars;
    }

    if (isBlockShortcut(row.shortcut)) {
        nextBlockSettings.shortcut = row.shortcut;
    }

    if (nextElement) {
        nextBlockSettings.nextElement = nextElement;
    }

    if (isBlockTextAlign(row.textAlign)) {
        nextBlockSettings.textAlign = row.textAlign;
    }

    if (isBlockCasing(row.casing)) {
        nextBlockSettings.casing = row.casing;
    }

    if (typeof row.isBold === 'boolean') {
        nextBlockSettings.isBold = row.isBold;
    }

    if (typeof row.isItalic === 'boolean') {
        nextBlockSettings.isItalic = row.isItalic;
    }

    if (typeof row.isUnderline === 'boolean') {
        nextBlockSettings.isUnderline = row.isUnderline;
    }

    if (Object.keys(nextBlockSettings).length === 0) {
        return;
    }

    settings.blocks![blockType] = nextBlockSettings;
};

export const buildConfigRows = (
    settings: EditorSettingsOverride,
    now: number,
): ScriptConfigReplacementRow[] => {
    const normalizedRows = new Map<FountainElementType, ScriptConfigReplacementRow>();

    Object.entries(settings.blocks ?? {}).forEach(([blockType, blockSettings]) => {
        const normalizedBlockType = normalizeSettingsBlockType(blockType);

        if (!normalizedBlockType) {
            return;
        }

        normalizedRows.set(normalizedBlockType, {
            id: uuidv7(),
            blockType: normalizedBlockType,
            spacingBeforeMillis: toMillis(blockSettings?.spacingBeforeEm),
            lineHeightMillis: toMillis(blockSettings?.lineHeight),
            indentLeftChars: blockSettings?.indentLeftChars ?? null,
            indentRightChars: blockSettings?.indentRightChars ?? null,
            shortcut: blockSettings?.shortcut ?? null,
            nextElement: normalizeSettingsBlockType(blockSettings?.nextElement) ?? null,
            textAlign: blockSettings?.textAlign ?? null,
            casing: blockSettings?.casing ?? null,
            isBold: blockSettings?.isBold ?? null,
            isItalic: blockSettings?.isItalic ?? null,
            isUnderline: blockSettings?.isUnderline ?? null,
            createdAt: now,
            updatedAt: now,
        });
    });

    return Array.from(normalizedRows.values());
};
