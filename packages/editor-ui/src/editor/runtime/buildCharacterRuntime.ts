import {normalizeCharacterKey} from '@stagistic/script-core';
import type {Node as ProseMirrorNode} from '@tiptap/pm/model';
import {
    Decoration,
    DecorationSet,
} from '@tiptap/pm/view';

import {
    getCharacterTagIdClassName,
    getCharacterTagKeyClassName,
} from '../characterColors';
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
    characterColorSaturation?: number,
    colorByCharacterId?: ReadonlyMap<string, string>,
    rememberedColorByKey?: ReadonlyMap<string, string>,
    characterTagClassNames?: {
        tag: string,
        separator: string,
    },
}

const joinClassNames = (...classNames: Array<string | undefined>) => classNames
    .filter(Boolean)
    .join(' ');

const resolveCharacterTagDecorationAttributes = (
    tokenEntry: CharacterTokenEntry,
    characterTagClassNames?: {
        tag: string,
        separator: string,
    },
) => {
    let identityClassName: string | undefined;

    if (tokenEntry.characterId) {
        identityClassName = getCharacterTagIdClassName(tokenEntry.characterId);
    }

    if (!identityClassName && tokenEntry.key) {
        identityClassName = getCharacterTagKeyClassName(tokenEntry.key);
    }

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

const buildCharacterDecorations = (
    doc: ProseMirrorNode,
    tokenEntries: readonly CharacterTokenEntry[],
    characterTagClassNames?: {
        tag: string,
        separator: string,
    },
) => {
    if (tokenEntries.length === 0) {
        return DecorationSet.empty;
    }

    const decorations: Decoration[] = [];

    tokenEntries.forEach((tokenEntry, index) => {
        if (tokenEntry.valueStart < tokenEntry.valueEnd) {
            const decorationEnd = Math.max(tokenEntry.valueEnd, tokenEntry.end);

            decorations.push(Decoration.inline(
                tokenEntry.blockStart + tokenEntry.valueStart,
                tokenEntry.blockStart + decorationEnd,
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

    return DecorationSet.create(doc, decorations);
};

export const buildCharacterRuntime = ({
    doc,
    selectionFrom,
    persistentCharacters,
    characterColorSaturation,
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
        characterColorSaturation,
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
            characterTagClassNames,
        ),
    };
};
