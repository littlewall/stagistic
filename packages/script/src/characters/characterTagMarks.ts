import type {ScriptNode} from '../document';
import {normalizeCharacterKey} from '../syntax';

export const CHARACTER_TAG_MARK_NAME = 'characterTag';
export const CHARACTER_TAG_KEY_ATTR = 'characterKey';
export const CHARACTER_TAG_ID_ATTR = 'characterId';

/**
 * Block types whose inline content can carry `characterTag` marks. Tags are
 * authored only in stage directions today; character blocks contribute to the
 * roster via cue refs (text + `characterRefs`), not tag marks. Extend this list
 * if tag authoring opens up to other block types.
 */
export const CHARACTER_TAG_BLOCK_TYPES = ['stageDirection'] as const;

const CHARACTER_TAG_BLOCK_TYPE_SET: ReadonlySet<string> = new Set(CHARACTER_TAG_BLOCK_TYPES);

export const canBlockTypeHaveCharacterTags = (blockType: string): boolean => {
    return CHARACTER_TAG_BLOCK_TYPE_SET.has(blockType);
};

export interface CharacterTagRef {
    key: string,
    characterId: string | null,
    text: string,
}

type InlineMark = NonNullable<ScriptNode['marks']>[number];

const EMPTY_TAG_PLACEHOLDER_PATTERN = /\u200b/gu;

const normalizeCharacterTagKey = (value: string) => {
    return normalizeCharacterKey(value.replace(EMPTY_TAG_PLACEHOLDER_PATTERN, ''));
};

const findTagMark = (node: ScriptNode): InlineMark | undefined => {
    if (!Array.isArray(node.marks)) {
        return undefined;
    }

    return node.marks.find(mark => mark.type === CHARACTER_TAG_MARK_NAME);
};

const readTagCharacterId = (mark: InlineMark | undefined): string | null => {
    const raw = mark?.attrs?.[CHARACTER_TAG_ID_ATTR];

    return typeof raw === 'string' && raw.length > 0 ? raw : null;
};

/**
 * Collects each tagged span in a block as one per-occurrence tag.
 * Consecutive text nodes that carry a characterTag mark with the same
 * characterId are coalesced into a single tag; the key is re-derived from
 * the visible text (the name is the source of truth, not the stale attr).
 */
export const collectCharacterTags = (blockNode: ScriptNode): CharacterTagRef[] => {
    const content = Array.isArray(blockNode.content) ? blockNode.content : [];
    const tags: CharacterTagRef[] = [];
    let runText = '';
    let runCharacterId: string | null = null;
    let inRun = false;

    const flush = () => {
        if (!inRun) {
            return;
        }

        const key = normalizeCharacterTagKey(runText);

        if (key.length > 0) {
            tags.push({
                key, characterId: runCharacterId, text: runText,
            });
        }

        runText = '';
        runCharacterId = null;
        inRun = false;
    };

    content.forEach(child => {
        const mark = findTagMark(child);

        if (!mark || typeof child.text !== 'string') {
            flush();

            return;
        }

        const characterId = readTagCharacterId(mark);

        if (inRun && characterId !== runCharacterId) {
            flush();
        }

        inRun = true;
        runCharacterId = characterId;
        runText += child.text;
    });

    flush();

    return tags;
};

export const countCharacterTagsByKey = (blockNode: ScriptNode): Map<string, number> => {
    const counts = new Map<string, number>();

    collectCharacterTags(blockNode).forEach(tag => {
        counts.set(tag.key, (counts.get(tag.key) ?? 0) + 1);
    });

    return counts;
};

export const collectCharacterTagRefByKey = (blockNode: ScriptNode): Record<string, string> => {
    const refByKey: Record<string, string> = {};

    collectCharacterTags(blockNode).forEach(tag => {
        if (tag.characterId) {
            refByKey[tag.key] = tag.characterId;
        }
    });

    return refByKey;
};

/**
 * Returns a new block node with each characterTag mark's attrs patched by
 * `patch(tag)`. Returning null leaves that mark unchanged. Immutable.
 */
export const mapCharacterTagMarks = (
    blockNode: ScriptNode,
    patch: (tag: CharacterTagRef) => Partial<{characterId: string | null}> | null,
): ScriptNode => {
    if (!Array.isArray(blockNode.content)) {
        return blockNode;
    }

    let changed = false;
    const nextContent = blockNode.content.map(child => {
        const mark = findTagMark(child);

        if (!mark || typeof child.text !== 'string') {
            return child;
        }

        const tag: CharacterTagRef = {
            key: normalizeCharacterTagKey(child.text),
            characterId: readTagCharacterId(mark),
            text: child.text,
        };
        const result = patch(tag);

        if (!result || !('characterId' in result) || result.characterId === tag.characterId) {
            return child;
        }

        changed = true;

        const nextMarks = (child.marks ?? []).map(existing => {
            if (existing.type !== CHARACTER_TAG_MARK_NAME) {
                return existing;
            }

            return {...existing, attrs: {...existing.attrs, [CHARACTER_TAG_ID_ATTR]: result.characterId}};
        });

        return {...child, marks: nextMarks};
    });

    return changed ? {...blockNode, content: nextContent} : blockNode;
};

interface RenameCharacterTagsArgs {
    /** Normalized old key. */
    fromKey: string,
    /** Display name to write into the matching spans. */
    newName: string,
    /** When set, match confirmed tags by id (and unconfirmed ones by key). */
    characterId?: string,
}

/**
 * Rewrites the text + key of characterTag-marked spans that match the
 * renamed character. The editor commits each tag as one contiguous marked
 * text node, so a per-text-node rewrite is correct. Immutable.
 */
export const renameCharacterTagsInNode = (
    blockNode: ScriptNode,
    {
        fromKey, newName, characterId,
    }: RenameCharacterTagsArgs,
): ScriptNode => {
    if (!Array.isArray(blockNode.content) || newName.length === 0) {
        return blockNode;
    }

    const newKey = normalizeCharacterKey(newName);
    let changed = false;

    const nextContent = blockNode.content.map(child => {
        const mark = findTagMark(child);

        if (!mark || typeof child.text !== 'string') {
            return child;
        }

        const tagCharacterId = readTagCharacterId(mark);
        const tagKey = normalizeCharacterTagKey(child.text);
        const matches = characterId
            ? tagCharacterId === characterId || (!tagCharacterId && tagKey === fromKey)
            : tagKey === fromKey;

        if (!matches) {
            return child;
        }

        changed = true;

        const nextMarks = (child.marks ?? []).map(existing => {
            if (existing.type !== CHARACTER_TAG_MARK_NAME) {
                return existing;
            }

            return {...existing, attrs: {...existing.attrs, [CHARACTER_TAG_KEY_ATTR]: newKey}};
        });

        return {
            ...child, text: newName, marks: nextMarks,
        };
    });

    return changed ? {...blockNode, content: nextContent} : blockNode;
};
