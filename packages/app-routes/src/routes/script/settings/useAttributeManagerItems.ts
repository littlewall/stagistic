import {
    useEditorLiveCharacters,
    useEditorLiveMusic,
    useEditorLiveStructure,
} from '@stagistic/editor';
import {buildScriptStructureOutline} from '@stagistic/script';
import type {
    AttributeManagerCharacter,
    AttributeManagerListItem,
} from '@stagistic/ui';
import {useMemo} from 'react';

import type {useScriptMusicState} from '../editor/music';
import type {useScriptCharactersContextValue} from '../useScriptCharactersContextValue';
import {
    buildAttributeManagerMusicItems,
    buildAttributeManagerMusicItemsFromLive,
} from './attributeManagerMusicItems';

interface UseAttributeManagerItemsArgs {
    isOpen: boolean,
    initialValue: Parameters<typeof buildAttributeManagerMusicItems>[0],
    characters: ReturnType<typeof useScriptCharactersContextValue>['contextValue'],
    music: ReturnType<typeof useScriptMusicState>['music'],
    getMusicTitleDraft: (musicId: string, confirmedTitle: string) => string,
}

export const useAttributeManagerItems = ({
    isOpen,
    initialValue,
    characters,
    music,
    getMusicTitleDraft,
}: UseAttributeManagerItemsArgs) => {
    const liveCharacters = useEditorLiveCharacters();
    const liveMusic = useEditorLiveMusic();
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
    const musicItems = useMemo<AttributeManagerListItem[]>(() => {
        const items = liveStructure.rows.length > 0 || liveMusic.length > 0
            ? buildAttributeManagerMusicItemsFromLive(liveMusic, liveStructure, music)
            : buildAttributeManagerMusicItems(initialValue, music);

        return items.map(item => ({
            ...item,
            title: getMusicTitleDraft(item.id, item.title),
        }));
    }, [
        music,
        getMusicTitleDraft,
        initialValue,
        liveMusic,
        liveStructure,
    ]);

    return {
        characterItems,
        sceneItems,
        musicItems,
    };
};
