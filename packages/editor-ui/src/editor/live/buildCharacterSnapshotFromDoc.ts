import {
    extractCharacterKeys,
} from '@stagistic/script-core';
import type {Node as ProseMirrorNode} from '@tiptap/pm/model';

import {
    readNormalizedRefsFromAttrs,
    visitCharacterBlocks,
} from '../characters/characterRefUtils';
import {buildCharacterDocColorState} from '../characters/colorResolver';
import type {PersistentCharacterRef} from '../contracts';
import type {EditorLiveCharacterSnapshot} from '../contracts';

const EMPTY_CHARACTERS: EditorLiveCharacterSnapshot = {
    countsByKey: new Map<string, number>(),
    countsByCharacterId: new Map<string, number>(),
    keyByCharacterId: new Map<string, string>(),
    displayColorByKey: new Map<string, string>(),
};

/**
 * Scans a ProseMirror document directly for character blocks
 * and builds a character snapshot with occurrence counts.
 *
 * This is intentionally independent of any ProseMirror plugin state
 * to avoid plugin initialization ordering issues.
 */
interface BuildCharacterSnapshotOptions {
    selectionFrom?: number | null,
    persistentCharacters?: readonly PersistentCharacterRef[],
    characterColorSaturation?: number,
    colorByCharacterId?: ReadonlyMap<string, string>,
    rememberedColorByKey?: ReadonlyMap<string, string>,
}

export const buildCharacterSnapshotFromDoc = (
    doc: ProseMirrorNode,
    options?: BuildCharacterSnapshotOptions,
): EditorLiveCharacterSnapshot => {
    const countsByKey = new Map<string, number>();
    const countsByCharacterId = new Map<string, number>();
    const keyByCharacterId = new Map<string, string>();
    const colorState = buildCharacterDocColorState({
        doc,
        selectionFrom: options?.selectionFrom,
        persistentCharacters: options?.persistentCharacters,
        characterColorSaturation: options?.characterColorSaturation,
        colorByCharacterId: options?.colorByCharacterId,
        rememberedColorByKey: options?.rememberedColorByKey,
    });

    visitCharacterBlocks({
        doc,
        onCharacterBlock: node => {
            const textContent = node.textContent.trim();

            if (!textContent) {
                return false;
            }

            const refsByKey = readNormalizedRefsFromAttrs(node.attrs as Record<string, unknown>);

            extractCharacterKeys(textContent).forEach(key => {
                countsByKey.set(key, (countsByKey.get(key) ?? 0) + 1);

                const characterId = refsByKey[key];

                if (characterId) {
                    countsByCharacterId.set(characterId, (countsByCharacterId.get(characterId) ?? 0) + 1);
                    keyByCharacterId.set(characterId, key);
                }
            });

            return false;
        },
    });

    if (countsByKey.size === 0 && countsByCharacterId.size === 0) {
        return EMPTY_CHARACTERS;
    }

    return {
        countsByKey,
        countsByCharacterId,
        keyByCharacterId,
        displayColorByKey: colorState.displayColorByKey,
    };
};
