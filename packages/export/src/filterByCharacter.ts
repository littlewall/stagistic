import type {ScriptDocument} from '@stagistic/script';

import type {CharacterFilterValue} from './config';
import {
    groupScenes,
    sceneMentionsCharacter,
} from './scenes';
import type {
    ExportCharacter,
    ExportCharacterGroup,
} from './scriptData';

export const filterScriptByCharacter = (
    doc: ScriptDocument,
    filter: CharacterFilterValue,
    characters: ExportCharacter[],
    characterGroups: ExportCharacterGroup[] = [],
): ScriptDocument => {
    if (filter.mode === 'all') {
        return doc;
    }

    const selected = characters.filter(character => filter.characterIds.includes(character.id));

    if (selected.length === 0) {
        return {...doc, content: []};
    }

    const selectedIds = new Set(selected.map(character => character.id));
    const matchingGroups = characterGroups.filter(group => group.memberIds.some(id => selectedIds.has(id)));
    const selectedEntities = [...selected, ...matchingGroups];
    const groups = groupScenes(doc);
    const keptSceneGroups = groups.filter(group => group.sceneBlockId !== null)
        .filter(group => selectedEntities.some(entity => sceneMentionsCharacter(group, entity)));
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
