import {collectCharacterTags} from '../characters/characterTagMarks';
import type {ScriptNode} from '../document';
import type {IndexedScriptCharacterRef} from './scriptBlockIndex';

export const indexCharacterTags = (node: ScriptNode): IndexedScriptCharacterRef[] | null => {
    const idByKey = new Map<string, string | null>();

    collectCharacterTags(node).forEach(tag => {
        const existing = idByKey.get(tag.key);

        if (existing === undefined || (existing === null && tag.characterId)) {
            idByKey.set(tag.key, tag.characterId);
        }
    });

    if (idByKey.size === 0) {
        return null;
    }

    return Array.from(idByKey.entries())
        .toSorted((a, b) => a[0].localeCompare(b[0]))
        .map(([key, characterId]) => ({key, characterId}));
};
