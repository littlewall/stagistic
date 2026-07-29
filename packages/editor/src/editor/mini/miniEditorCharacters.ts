import {
    CHARACTER_COLOR_SATURATION_MAX,
    collectScriptCharacterStats,
    extractCharacterKeys,
    type ScriptDocument,
    type ScriptNode,
} from '@stagistic/script';

import {getConfirmedCharacterColor} from '../characters/colorResolver';
import type {
    EditorLiveCharacterSnapshot,
    PersistentCharacterRef,
} from '../contracts';
import type {CharacterColorRefsBundle} from '../surface/editorSurfaceCache';

export const MINI_EDITOR_CHARACTER_SATURATION = CHARACTER_COLOR_SATURATION_MAX;

const getTextContent = (node: ScriptNode): string => {
    if (node.type === 'text') {
        return node.text ?? '';
    }

    return node.content?.map(getTextContent).join('') ?? '';
};

export const buildMiniEditorCharacters = (
    document: ScriptDocument,
): PersistentCharacterRef[] => {
    const keys = document.content
        ?.filter(node => node.type === 'character')
        .flatMap(node => extractCharacterKeys(getTextContent(node)))
        ?? [];

    return Array.from(new Set(keys), key => ({
        id: `mini-character:${key}`,
        key,
        colorHex: null,
    }));
};

export const mergeMiniEditorCharacters = (
    current: readonly PersistentCharacterRef[],
    next: readonly PersistentCharacterRef[],
): PersistentCharacterRef[] => {
    const merged = new Map(
        current.map(character => [character.key, character]),
    );

    next.forEach(character => {
        merged.set(character.key, character);
    });

    return Array.from(merged.values());
};

export const buildMiniEditorCharacterPresentation = (
    document: ScriptDocument,
    characters: readonly PersistentCharacterRef[],
) => {
    const stats = collectScriptCharacterStats(document, new Set());
    const colorByCharacterId = new Map(
        characters.map(character => [
            character.id, getConfirmedCharacterColor(
                character.id,
                character.colorHex ?? null,
                MINI_EDITOR_CHARACTER_SATURATION,
            ),
        ]),
    );
    const displayColorByKey = new Map(
        characters.map(character => [character.key, colorByCharacterId.get(character.id)!]),
    );
    const snapshot: EditorLiveCharacterSnapshot = {
        countsByKey: stats.countsByKey,
        countsByCharacterId: new Map(
            characters.map(character => [character.id, stats.countsByKey.get(character.key) ?? 0]),
        ),
        keyByCharacterId: new Map(
            characters.map(character => [character.id, character.key]),
        ),
        displayColorByKey,
    };

    return {
        colorByCharacterId,
        displayColorByKey,
        snapshot,
    };
};

export const syncMiniEditorCharacterRefs = (
    refs: CharacterColorRefsBundle,
    characters: readonly PersistentCharacterRef[],
    document: ScriptDocument,
) => {
    const presentation = buildMiniEditorCharacterPresentation(
        document,
        characters,
    );

    refs.persistentCharactersRef.current = characters;
    refs.colorByCharacterIdRef.current = presentation.colorByCharacterId;
    refs.rememberedColorByKeyRef.current = presentation.displayColorByKey;
    refs.rememberedColorSaturationRef.current = MINI_EDITOR_CHARACTER_SATURATION;

    return presentation;
};
