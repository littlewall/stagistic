import {
    type EditorSettingsOverride,
    type ScriptBlockType,
} from '@stagistic/script';
import {requireValue, uuidv7} from '@stagistic/shared';

import type * as dbQueries from '../../queries';
import {
    fromMillis,
    toMillis,
} from '../document/documentCodec';
import {
    isBlockCasing,
    isBlockShortcut,
    isBlockTextAlign,
    normalizeSettingsBlockType,
} from './configBlockTypes';

type ScriptConfigBlockRow = Awaited<ReturnType<typeof dbQueries.listScriptBlockSettings>>[number];
type ScriptConfigReplacementRow = Parameters<typeof dbQueries.replaceScriptConfigBlocks>[1]['rows'][number];

export const hydrateBlockSettings = (
    settings: EditorSettingsOverride,
    row: ScriptConfigBlockRow,
) => {
    const blockType = normalizeSettingsBlockType(row.blockType);

    if (!blockType) {
        return;
    }

    const nextBlockSettings = {
        ...requireValue(settings.blocks)[blockType],
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

    requireValue(settings.blocks)[blockType] = nextBlockSettings;
};

export const buildConfigRows = (
    scriptId: string,
    settings: EditorSettingsOverride,
    now: number,
): ScriptConfigReplacementRow[] => {
    const normalizedRows = new Map<ScriptBlockType, ScriptConfigReplacementRow>();

    Object.entries(settings.blocks ?? {}).forEach(([blockType, blockSettings]) => {
        const normalizedBlockType = normalizeSettingsBlockType(blockType);

        if (!normalizedBlockType) {
            return;
        }

        const block = blockSettings ?? {};

        normalizedRows.set(normalizedBlockType, {
            id: uuidv7(),
            scriptId,
            blockType: normalizedBlockType,
            spacingBeforeMillis: toMillis(block.spacingBeforeEm),
            lineHeightMillis: toMillis(block.lineHeight),
            indentLeftChars: block.indentLeftChars ?? null,
            indentRightChars: block.indentRightChars ?? null,
            shortcut: block.shortcut ?? null,
            nextElement: normalizeSettingsBlockType(block.nextElement) ?? null,
            textAlign: block.textAlign ?? null,
            casing: block.casing ?? null,
            isBold: block.isBold ?? null,
            isItalic: block.isItalic ?? null,
            isUnderline: block.isUnderline ?? null,
            createdAt: now,
            updatedAt: now,
        });
    });

    return Array.from(normalizedRows.values());
};
