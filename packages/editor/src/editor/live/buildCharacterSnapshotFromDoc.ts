import {
    type Node as ProseMirrorNode,
} from '@tiptap/pm/model';

import type {PersistentCharacterRef} from '../contracts';
import type {EditorLiveCharacterSnapshot} from '../contracts';
import {buildCharacterRuntime} from '../runtime/buildCharacterRuntime';

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
    return buildCharacterRuntime({
        doc,
        selectionFrom: options?.selectionFrom,
        persistentCharacters: options?.persistentCharacters,
        characterColorSaturation: options?.characterColorSaturation,
        colorByCharacterId: options?.colorByCharacterId,
        rememberedColorByKey: options?.rememberedColorByKey,
    }).snapshot ?? EMPTY_CHARACTERS;
};
