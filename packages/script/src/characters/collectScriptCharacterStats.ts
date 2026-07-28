import {
    getScriptBlockNodeType,
    isScriptBlockNode,
    type ScriptDocument,
    type ScriptNode,
} from '../document';
import {
    extractCharacterKeys,
} from '../syntax';
import {collectCharacterTags} from './characterTagMarks';
import {
    getCharacterRefByKey,
    getNodeTextContent,
    isCharacterBlockType,
} from './documentHelpers';
import type {ScriptCharacterStats} from './types';

export const collectScriptCharacterStats = (
    documentValue: ScriptDocument | null | undefined,
    confirmedCharacterIdSet: ReadonlySet<string>,
): ScriptCharacterStats => {
    const countsByKey = new Map<string, number>();
    const confirmedCountsById = new Map<string, number>();
    const unconfirmedCountsByKey = new Map<string, number>();
    const walkNodes = (nodes?: ScriptNode[]) => {
        if (!Array.isArray(nodes)) {
            return;
        }

        nodes.forEach(node => {
            if (!node || typeof node !== 'object') {
                return;
            }

            if (isScriptBlockNode(node)) {
                const blockType = getScriptBlockNodeType(node);

                if (isCharacterBlockType(blockType)) {
                    const text = getNodeTextContent(node);
                    const characterRefByKey = getCharacterRefByKey(node.attrs);

                    extractCharacterKeys(text).forEach(key => {
                        countsByKey.set(key, (countsByKey.get(key) ?? 0) + 1);

                        const characterId = characterRefByKey[key];

                        if (characterId && confirmedCharacterIdSet.has(characterId)) {
                            confirmedCountsById.set(characterId, (confirmedCountsById.get(characterId) ?? 0) + 1);

                            return;
                        }

                        unconfirmedCountsByKey.set(key, (unconfirmedCountsByKey.get(key) ?? 0) + 1);
                    });
                } else {
                    collectCharacterTags(node).forEach(tag => {
                        countsByKey.set(tag.key, (countsByKey.get(tag.key) ?? 0) + 1);

                        if (tag.characterId && confirmedCharacterIdSet.has(tag.characterId)) {
                            confirmedCountsById.set(
                                tag.characterId,
                                (confirmedCountsById.get(tag.characterId) ?? 0) + 1,
                            );

                            return;
                        }

                        unconfirmedCountsByKey.set(tag.key, (unconfirmedCountsByKey.get(tag.key) ?? 0) + 1);
                    });
                }
            }

            walkNodes(node.content);
        });
    };

    walkNodes(documentValue?.content);

    return {
        countsByKey,
        confirmedCountsById,
        unconfirmedCountsByKey,
    };
};
