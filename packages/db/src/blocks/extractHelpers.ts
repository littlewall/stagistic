import type {ScriptDocument, ScriptNode} from '@stagistic/script';
import {collectCharacterTagRefByKey} from '@stagistic/script';
import {collapseWhitespace, isObjectRecord} from '@stagistic/shared';

import type {
    ExtractedImportMetadata,
    ExtractedImportTitlePageField,
} from './types';

export const normalizeCharacterKey = (rawValue: string): string => {
    const collapsed = collapseWhitespace(rawValue);

    if (collapsed.length === 0) {
        return '';
    }

    let base = collapsed;
    let next = base.replace(/\s*\([^()]*\)\s*$/, '').trimEnd();

    while (next !== base) {
        base = next;
        next = base.replace(/\s*\([^()]*\)\s*$/, '').trimEnd();
    }

    return collapseWhitespace(base).toUpperCase();
};

export const getNodeTextContent = (node: ScriptNode): string => {
    if (typeof node.text === 'string') {
        return node.text;
    }

    if (!Array.isArray(node.content)) {
        return '';
    }

    return node.content.map(getNodeTextContent).join('');
};

export const toCharacterRefByKey = (attrs: Record<string, unknown> | undefined): Record<string, string> => {
    if (!attrs || !isObjectRecord(attrs.characterRefs)) {
        return {};
    }

    const characterRefByKey: Record<string, string> = {};

    Object.entries(attrs.characterRefs).forEach(([rawKey, rawCharacterId]) => {
        if (typeof rawCharacterId !== 'string' || rawCharacterId.length === 0) {
            return;
        }

        const key = normalizeCharacterKey(rawKey);

        if (key.length === 0) {
            return;
        }

        characterRefByKey[key] = rawCharacterId;
    });

    return characterRefByKey;
};

/**
 * Confirmed character refs for a block, merging music-block attr refs with
 * stage-direction characterTag mark refs. Attr refs win on key collisions.
 */
export const toCharacterRefByKeyWithTags = (node: ScriptNode): Record<string, string> => {
    const attrs = isObjectRecord(node.attrs) ? node.attrs : undefined;
    const fromAttrs = toCharacterRefByKey(attrs);
    const fromTags = collectCharacterTagRefByKey(node);

    return {...fromTags, ...fromAttrs};
};

export const toExtractedImportMetadata = (
    scriptId: string,
    sourceDocument: ScriptDocument,
): ExtractedImportMetadata => {
    const warnings: string[] = [];
    const attrs = isObjectRecord(sourceDocument.attrs)
        ? sourceDocument.attrs
        : {};
    const importMeta = isObjectRecord(attrs.importMeta)
        ? attrs.importMeta
        : null;

    if (!importMeta) {
        return {
            titlePageFields: null,
            sceneSynopsisByHeadingBlockId: new Map(),
            warnings,
        };
    }

    const titlePageFieldsRaw = importMeta.titlePageFields;
    const titlePageFields = Array.isArray(titlePageFieldsRaw)
        ? titlePageFieldsRaw
            .map((field, index) => {
                if (!isObjectRecord(field)) {
                    warnings.push(`Script ${scriptId}: invalid title page field at index ${index}.`);

                    return null;
                }

                const fieldKey = typeof field.fieldKey === 'string'
                    ? field.fieldKey.trim()
                    : '';
                const fieldValue = typeof field.value === 'string'
                    ? field.value.trim()
                    : '';
                const orderNo = typeof field.orderNo === 'number' && Number.isFinite(field.orderNo)
                    ? Math.max(0, Math.floor(field.orderNo))
                    : index;

                if (fieldKey.length === 0) {
                    warnings.push(`Script ${scriptId}: skipped title page field with empty key at index ${index}.`);

                    return null;
                }

                return {
                    fieldKey,
                    fieldValue,
                    orderNo,
                };
            })
            .filter((field): field is ExtractedImportTitlePageField => Boolean(field))
            .sort((a, b) => a.orderNo - b.orderNo)
            .map((field, index) => ({
                ...field,
                orderNo: index,
            }))
        : null;
    const sceneSynopsisByHeadingBlockId = new Map<string, string>();

    if (Array.isArray(importMeta.sceneSynopses)) {
        importMeta.sceneSynopses.forEach((entry, index) => {
            if (!isObjectRecord(entry)) {
                warnings.push(`Script ${scriptId}: invalid scene synopsis at index ${index}.`);

                return;
            }

            const headingBlockId = typeof entry.headingBlockId === 'string'
                ? entry.headingBlockId.trim()
                : '';
            const synopsis = typeof entry.synopsis === 'string'
                ? entry.synopsis.trim()
                : '';

            if (headingBlockId.length === 0 || synopsis.length === 0) {
                return;
            }

            const currentSynopsis = sceneSynopsisByHeadingBlockId.get(headingBlockId);

            if (!currentSynopsis) {
                sceneSynopsisByHeadingBlockId.set(headingBlockId, synopsis);

                return;
            }

            sceneSynopsisByHeadingBlockId.set(headingBlockId, `${currentSynopsis}\n${synopsis}`);
        });
    }

    return {
        titlePageFields,
        sceneSynopsisByHeadingBlockId,
        warnings,
    };
};

export const sanitizeInlineContentNode = (node: unknown): ScriptNode | null => {
    if (!isObjectRecord(node)) {
        return null;
    }

    const result: ScriptNode = {};

    if (typeof node.type === 'string') {
        result.type = node.type;
    }

    if (typeof node.text === 'string') {
        result.text = node.text;
    }

    if (isObjectRecord(node.attrs)) {
        result.attrs = node.attrs;
    }

    if (Array.isArray(node.content)) {
        const sanitizedChildren = node.content
            .map(sanitizeInlineContentNode)
            .filter((item): item is ScriptNode => Boolean(item));

        result.content = sanitizedChildren;
    }

    if (Array.isArray(node.marks)) {
        const marks = node.marks
            .filter((mark): mark is {type: string, attrs?: Record<string, unknown>} => {
                return isObjectRecord(mark) && typeof mark.type === 'string';
            })
            .map(mark => {
                if (!isObjectRecord(mark.attrs)) {
                    return {type: mark.type};
                }

                return {
                    type: mark.type,
                    attrs: mark.attrs,
                };
            });

        if (marks.length > 0) {
            result.marks = marks;
        }
    }

    return result;
};
