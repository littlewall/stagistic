import type {ScriptDocument} from '@stagistic/script';

import type {CharacterFilterValue} from './config';
import {
    groupScenes,
    sceneMentionsCharacter,
} from './scenes';
import type {ExportCharacter} from './scriptData';

export const filterScriptByCharacter = (
    doc: ScriptDocument,
    filter: CharacterFilterValue,
    characters: ExportCharacter[],
): ScriptDocument => {
    if (filter.mode === 'all') {
        return doc;
    }

    const selected = characters.filter(character => filter.characterIds.includes(character.id));

    if (selected.length === 0) {
        return {...doc, content: []};
    }

    const groups = groupScenes(doc);
    const keptSceneGroups = groups.filter(group => group.sceneBlockId !== null)
        .filter(group => selected.some(character => sceneMentionsCharacter(group, character)));
    const keptActIds = new Set(keptSceneGroups.map(group => group.actBlockId).filter(Boolean));
    const keptGroups = groups.filter(group => {
        if (group.sceneBlockId !== null) {
            return keptSceneGroups.includes(group);
        }

        return group.actBlockId !== null && keptActIds.has(group.actBlockId);
    });

    return {
        ...doc,
        content: keptGroups.flatMap(group => group.blocks),
    };
};
