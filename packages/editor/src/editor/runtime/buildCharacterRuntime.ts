import {normalizeCharacterKey} from '@stagistic/script';
import type {Node as ProseMirrorNode} from '@tiptap/pm/model';
import {
    Decoration,
    DecorationSet,
} from '@tiptap/pm/view';

import {
    getCharacterTagIdClassName,
    getCharacterTagKeyClassName,
} from '../characters/characterColors';
import {
    type CharacterTokenEntry,
    scanCharacterTokensFromDoc,
} from '../characters/characterTokenScan';
import {
    buildCharacterDocColorStateFromTokenScan,
} from '../characters/colorResolver';
import type {
    EditorLiveCharacterSnapshot,
    PersistentCharacterRef,
} from '../contracts';
import {isScriptBlockNodeName} from '../tiptap/scriptCore';
import type {EditorCharacterRuntime} from './editorRuntimeTypes';

const EMPTY_CHARACTERS: EditorLiveCharacterSnapshot = {
    countsByKey: new Map<string, number>(),
    countsByCharacterId: new Map<string, number>(),
    keyByCharacterId: new Map<string, string>(),
    displayColorByKey: new Map<string, string>(),
};

interface BuildCharacterRuntimeArgs {
    doc: ProseMirrorNode,
    selectionFrom?: number | null,
    persistentCharacters?: readonly PersistentCharacterRef[],
    colorByCharacterId?: ReadonlyMap<string, string>,
    rememberedColorByKey?: ReadonlyMap<string, string>,
    characterTagClassNames?: CharacterTagClassNames,
}

interface CharacterTagClassNames {
    tag: string,
    separator: string,
    /** Dialogue/lyrics block spoken by the preceding cue's first character. */
    line?: string,
}

/** Blocks tinted with their speaker's color. */
const SPEAKER_LINE_BLOCK_TYPES = new Set(['dialogue', 'lyrics']);

/** Blocks that sit inside a speech without ending it (parentheticals). */
const SPEAKER_PASSTHROUGH_BLOCK_TYPES = new Set(['aside']);

const joinClassNames = (...classNames: Array<string | undefined>) => classNames
    .filter(Boolean)
    .join(' ');

const resolveIdentityClassName = (tokenEntry: CharacterTokenEntry) => {
    if (tokenEntry.characterId) {
        return getCharacterTagIdClassName(tokenEntry.characterId);
    }

    return tokenEntry.key ? getCharacterTagKeyClassName(tokenEntry.key) : undefined;
};

const resolveCharacterTagDecorationAttributes = (
    tokenEntry: CharacterTokenEntry,
    characterTagClassNames?: CharacterTagClassNames,
) => {
    const identityClassName = resolveIdentityClassName(tokenEntry);
    const attributes: Record<string, string> = {
        class: joinClassNames(characterTagClassNames?.tag ?? 'characterTag', identityClassName),
    };

    if (tokenEntry.characterId) {
        attributes['data-character-id'] = tokenEntry.characterId;
    }

    if (tokenEntry.key) {
        attributes['data-character-key'] = tokenEntry.key;
    }

    return attributes;
};

/**
 * While the caret sits in a token's trailing-whitespace gap (`valueEnd..end`,
 * e.g. mid-typing "THOMAS "), the space should read as still inside the pill —
 * mirroring the stage-direction tag. We extend the decoration up to the caret
 * (never past `end`), but only for the token the caret is trailing. Trailing
 * whitespace before a delimiter (or when the caret is elsewhere) stays out of
 * the pill and is trimmed on commit.
 */
const resolveNameDecorationEnd = (
    tokenEntry: CharacterTokenEntry,
    selectionFrom: number | null | undefined,
): number => {
    if (typeof selectionFrom !== 'number' || tokenEntry.end <= tokenEntry.valueEnd) {
        return tokenEntry.valueEnd;
    }

    const caretOffset = selectionFrom - tokenEntry.blockStart;

    if (caretOffset <= tokenEntry.valueEnd || caretOffset > tokenEntry.end) {
        return tokenEntry.valueEnd;
    }

    return caretOffset;
};

/**
 * Marks every dialogue/lyrics block with its speaker's identity class so the
 * palette's `--character-tag-color` reaches it. A speech runs from a cue
 * through dialogue, lyrics and asides; any other block ends it. Multi-character
 * cues use the first character. Styling is opt-in via the highlight mode CSS.
 */
const pushSpeakerLineDecorations = (
    doc: ProseMirrorNode,
    tokenEntries: readonly CharacterTokenEntry[],
    decorations: Decoration[],
    lineClassName: string,
) => {
    const speakerClassByBlockStart = new Map<number, string>();

    tokenEntries.forEach(tokenEntry => {
        if (tokenEntry.source !== 'cue' || speakerClassByBlockStart.has(tokenEntry.blockStart)) {
            return;
        }

        const identityClassName = resolveIdentityClassName(tokenEntry);

        if (identityClassName) {
            speakerClassByBlockStart.set(tokenEntry.blockStart, identityClassName);
        }
    });

    if (speakerClassByBlockStart.size === 0) {
        return;
    }

    let speakerClassName: string | null = null;

    doc.descendants((node, pos) => {
        if (!isScriptBlockNodeName(node.type.name)) {
            return true;
        }

        const blockType = String(node.attrs.blockType ?? node.type.name);

        if (blockType === 'character') {
            speakerClassName = speakerClassByBlockStart.get(pos + 1) ?? null;
        } else if (SPEAKER_LINE_BLOCK_TYPES.has(blockType)) {
            if (speakerClassName) {
                decorations.push(Decoration.node(pos, pos + node.nodeSize, {
                    class: joinClassNames(lineClassName, speakerClassName),
                }));
            }
        } else if (!SPEAKER_PASSTHROUGH_BLOCK_TYPES.has(blockType)) {
            speakerClassName = null;
        }

        return false;
    });
};

const buildCharacterDecorations = (
    doc: ProseMirrorNode,
    tokenEntries: readonly CharacterTokenEntry[],
    selectionFrom: number | null | undefined,
    characterTagClassNames?: CharacterTagClassNames,
) => {
    if (tokenEntries.length === 0) {
        return DecorationSet.empty;
    }

    const decorations: Decoration[] = [];

    tokenEntries.forEach((tokenEntry, index) => {
        if (tokenEntry.source === 'tag') {
            // characterTag marks render their own DOM; never decorate them.
            return;
        }

        const nameDecorationEnd = resolveNameDecorationEnd(tokenEntry, selectionFrom);

        if (tokenEntry.valueStart < nameDecorationEnd) {
            decorations.push(Decoration.inline(
                tokenEntry.blockStart + tokenEntry.valueStart,
                tokenEntry.blockStart + nameDecorationEnd,
                resolveCharacterTagDecorationAttributes(tokenEntry, characterTagClassNames),
            ));
        }

        const nextToken = tokenEntries[index + 1];

        if (
            !nextToken
            || nextToken.blockId !== tokenEntry.blockId
            || tokenEntry.end <= tokenEntry.valueStart
        ) {
            return;
        }

        decorations.push(Decoration.inline(
            tokenEntry.blockStart + tokenEntry.end,
            tokenEntry.blockStart + tokenEntry.end + 1,
            {
                class: characterTagClassNames?.separator ?? 'characterSeparator',
            },
        ));
    });

    pushSpeakerLineDecorations(doc, tokenEntries, decorations, characterTagClassNames?.line ?? 'characterLine');

    return DecorationSet.create(doc, decorations);
};

export const buildCharacterRuntime = ({
    doc,
    selectionFrom,
    persistentCharacters,
    colorByCharacterId,
    rememberedColorByKey,
    characterTagClassNames,
}: BuildCharacterRuntimeArgs): EditorCharacterRuntime => {
    const tokenScan = scanCharacterTokensFromDoc({
        doc,
        selectionFrom,
    });
    const colorState = buildCharacterDocColorStateFromTokenScan({
        tokenScan,
        persistentCharacters,
        colorByCharacterId,
        rememberedColorByKey,
    });
    const countsByKey = new Map<string, number>();
    const countsByCharacterId = new Map<string, number>();
    const keyByCharacterId = new Map<string, string>();

    tokenScan.tokenEntries.forEach(tokenEntry => {
        if (tokenEntry.key) {
            countsByKey.set(tokenEntry.key, (countsByKey.get(tokenEntry.key) ?? 0) + 1);
        }

        if (!tokenEntry.characterId) {
            return;
        }

        countsByCharacterId.set(
            tokenEntry.characterId,
            (countsByCharacterId.get(tokenEntry.characterId) ?? 0) + 1,
        );

        if (tokenEntry.key) {
            keyByCharacterId.set(tokenEntry.characterId, normalizeCharacterKey(tokenEntry.key));
        }
    });

    const snapshot: EditorLiveCharacterSnapshot = countsByKey.size === 0 && countsByCharacterId.size === 0
        ? EMPTY_CHARACTERS
        : {
            countsByKey,
            countsByCharacterId,
            keyByCharacterId,
            displayColorByKey: colorState.displayColorByKey,
        };

    return {
        snapshot,
        decorations: buildCharacterDecorations(
            doc,
            tokenScan.tokenEntries,
            selectionFrom,
            characterTagClassNames,
        ),
    };
};
