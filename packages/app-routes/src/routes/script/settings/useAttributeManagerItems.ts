import {
    useEditorLiveCharacters,
    useEditorLiveCues,
    useEditorLiveStructure,
} from '@stagistic/editor';
import {buildScriptStructureOutline} from '@stagistic/script';
import type {
    AttributeManagerCharacter,
    AttributeManagerListItem,
} from '@stagistic/ui';
import {useMemo} from 'react';

import type {useScriptCuesState} from '../editor/cues';
import type {useScriptCharactersContextValue} from '../useScriptCharactersContextValue';
import {
    buildAttributeManagerCueItems,
    buildAttributeManagerCueItemsFromLive,
} from './attributeManagerCueItems';

interface UseAttributeManagerItemsArgs {
    isOpen: boolean,
    initialValue: Parameters<typeof buildAttributeManagerCueItems>[0],
    characters: ReturnType<typeof useScriptCharactersContextValue>['contextValue'],
    cues: ReturnType<typeof useScriptCuesState>['cues'],
    getCueTitleDraft: (cueId: string, confirmedTitle: string) => string,
}

export const useAttributeManagerItems = ({
    isOpen,
    initialValue,
    characters,
    cues,
    getCueTitleDraft,
}: UseAttributeManagerItemsArgs) => {
    const liveCharacters = useEditorLiveCharacters();
    const liveCues = useEditorLiveCues();
    const liveStructure = useEditorLiveStructure();
    const characterItems = useMemo<AttributeManagerCharacter[]>(() => {
        return characters.confirmedCharacterRecords.map(character => ({
            id: character.id,
            name: liveCharacters.keyByCharacterId.get(character.id) ?? character.key,
            color: character.colorHex ?? null,
            outline: character.outline ?? null,
        })).sort((left, right) => left.name.localeCompare(right.name));
    }, [characters.confirmedCharacterRecords, liveCharacters.keyByCharacterId]);
    const sceneItems = useMemo<AttributeManagerListItem[]>(() => {
        if (!isOpen) {
            return [];
        }

        if (liveStructure.rows.length === 0) {
            const outline = buildScriptStructureOutline(initialValue?.content);
            let sceneNumber = 0;

            return outline.acts.flatMap(act => act.items.map(scene => {
                sceneNumber += 1;

                return {
                    id: scene.blockId,
                    number: `${sceneNumber}.`,
                    title: scene.title,
                    group: {
                        id: act.actId,
                        label: act.actName,
                    },
                };
            }));
        }

        let activeAct: {id: string, label: string} | undefined;
        let sceneNumber = 0;

        return liveStructure.rows.flatMap(row => {
            if (row.kind === 'act') {
                activeAct = {
                    id: row.blockId,
                    label: row.name,
                };

                return [];
            }

            sceneNumber += 1;

            return [
                {
                    id: row.blockId,
                    number: `${sceneNumber}.`,
                    title: row.title,
                    group: activeAct,
                },
            ];
        });
    }, [
        initialValue?.content,
        isOpen,
        liveStructure.rows,
    ]);
    const cueItems = useMemo<AttributeManagerListItem[]>(() => {
        const items = liveStructure.rows.length > 0 || liveCues.length > 0
            ? buildAttributeManagerCueItemsFromLive(liveCues, liveStructure, cues)
            : buildAttributeManagerCueItems(initialValue, cues);

        return items.map(item => ({
            ...item,
            title: getCueTitleDraft(item.id, item.title),
        }));
    }, [
        cues,
        getCueTitleDraft,
        initialValue,
        liveCues,
        liveStructure,
    ]);

    return {
        characterItems,
        sceneItems,
        cueItems,
    };
};
