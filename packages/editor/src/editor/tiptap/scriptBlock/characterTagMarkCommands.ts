/*
 * Live-editor mutations of `characterTag` marks, mirroring the document-level
 * ref-ops in `@stagistic/script` so a sidebar link / unlink / replace / rename
 * updates the open editor's stage-direction tag pills immediately.
 *
 * All helpers map their collected (original-doc) positions through
 * `tr.mapping`, so they compose safely with character-block edits already
 * staged on the same transaction regardless of order.
 */
import {
    CHARACTER_TAG_ID_ATTR,
    CHARACTER_TAG_KEY_ATTR,
    CHARACTER_TAG_MARK_NAME,
    normalizeCharacterKey,
} from '@stagistic/script';
import type {
    Mark,
    MarkType,
    Node as ProseMirrorNode,
    Schema,
} from '@tiptap/pm/model';
import type {Transaction} from '@tiptap/pm/state';

interface TagSpan {
    pos: number,
    end: number,
    text: string,
    key: string,
    characterId: string | null,
    otherMarks: Mark[],
}

export const getCharacterTagMarkType = (schema: Schema): MarkType | null => {
    return schema.marks[CHARACTER_TAG_MARK_NAME] ?? null;
};

const readTagCharacterId = (mark: Mark): string | null => {
    const raw: unknown = mark.attrs[CHARACTER_TAG_ID_ATTR];

    return typeof raw === 'string' && raw.length > 0 ? raw : null;
};

const getCharacterTagMark = (node: ProseMirrorNode, markType: MarkType): Mark | undefined => {
    return node.marks.find(candidate => candidate.type === markType);
};

const collectTagSpans = (doc: ProseMirrorNode, markType: MarkType): TagSpan[] => {
    const spans: TagSpan[] = [];

    doc.descendants((node, pos) => {
        if (!node.isText) {
            return true;
        }

        const mark = getCharacterTagMark(node, markType);

        if (!mark) {
            return true;
        }

        const text = node.text ?? '';
        const characterId = readTagCharacterId(mark);
        const previous = spans[spans.length - 1];

        if (previous && previous.end === pos && previous.characterId === characterId) {
            previous.end = pos + node.nodeSize;
            previous.text += text;
            previous.key = normalizeCharacterKey(previous.text);

            return true;
        }

        spans.push({
            pos,
            end: pos + node.nodeSize,
            text,
            key: normalizeCharacterKey(text),
            characterId,
            otherMarks: node.marks.filter(candidate => candidate.type !== markType),
        });

        return true;
    });

    return spans;
};

/**
 * Rewrites the `characterId` attr of matching tag marks. `resolveNextId`
 * returns the new id (or null to clear), or `undefined` to leave the span
 * unchanged. Attr-only, so doc size is unchanged. Returns whether anything
 * changed.
 */
export const applyTagMarkIdChange = (
    tr: Transaction,
    doc: ProseMirrorNode,
    markType: MarkType,
    resolveNextId: (span: {key: string, characterId: string | null}) => string | null | undefined,
): boolean => {
    let changed = false;

    collectTagSpans(doc, markType).forEach(span => {
        const nextId = resolveNextId({key: span.key, characterId: span.characterId});

        if (nextId === undefined || nextId === span.characterId) {
            return;
        }

        const from = tr.mapping.map(span.pos);
        const to = tr.mapping.map(span.end);

        tr.removeMark(from, to, markType);
        tr.addMark(from, to, markType.create({
            [CHARACTER_TAG_KEY_ATTR]: span.key,
            [CHARACTER_TAG_ID_ATTR]: nextId,
        }));
        changed = true;
    });

    return changed;
};

interface ApplyTagMarkRenameArgs {
    characterId: string,
    canonicalOldKey: string | null,
    newName: string,
}

/**
 * Rewrites the text and key of tag marks belonging to `characterId` (confirmed
 * tags) or, for unconfirmed tags, those whose key matches `canonicalOldKey`.
 * Each tag's existing confirmation state (its `characterId`) is preserved,
 * matching the script-side `renameCharacterTagsInNode`.
 */
export const applyTagMarkRename = (
    tr: Transaction,
    doc: ProseMirrorNode,
    schema: Schema,
    markType: MarkType,
    {
        characterId, canonicalOldKey, newName,
    }: ApplyTagMarkRenameArgs,
): boolean => {
    const normalizedNewName = newName.trim();
    const newKey = normalizeCharacterKey(normalizedNewName);

    if (newKey.length === 0) {
        return false;
    }

    let changed = false;

    collectTagSpans(doc, markType).forEach(span => {
        const matches = span.characterId === characterId
            || (!span.characterId && canonicalOldKey !== null && span.key === canonicalOldKey);

        if (!matches || (span.text === normalizedNewName && span.key === newKey)) {
            return;
        }

        const from = tr.mapping.map(span.pos);
        const to = tr.mapping.map(span.end);
        const nextTagMark = markType.create({
            [CHARACTER_TAG_KEY_ATTR]: newKey,
            [CHARACTER_TAG_ID_ATTR]: span.characterId,
        });

        tr.replaceWith(from, to, schema.text(normalizedNewName, [...span.otherMarks, nextTagMark]));
        changed = true;
    });

    return changed;
};
