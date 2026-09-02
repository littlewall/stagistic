import {
    getConfirmedCharacterColor,
    useEditorLiveCharacters,
    useEditorLiveMusic,
    useEditorLiveStructure,
} from '@stagistic/editor';
import {
    buildScriptStructureOutline,
    normalizeCharacterColorHex,
} from '@stagistic/script';
import type {
    AttributeManagerCharacter,
    AttributeManagerGroup,
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
    characterColorSaturation?: number,
}

export const useAttributeManagerItems = ({
    isOpen,
    initialValue,
    characters,
    music,
    getMusicTitleDraft,
    characterColorSaturation,
}: UseAttributeManagerItemsArgs) => {
    const liveCharacters = useEditorLiveCharacters();
    const liveMusic = useEditorLiveMusic();
    const liveStructure = useEditorLiveStructure();
    const characterItems = useMemo<AttributeManagerCharacter[]>(() => {
        return characters.confirmedCharacterRecords.map(character => ({
            id: character.id,
            name: liveCharacters.keyByCharacterId.get(character.id) ?? character.key,
            color: getConfirmedCharacterColor(
                character.id,
                normalizeCharacterColorHex(character.colorHex),
                characterColorSaturation,
            ),
            outline: character.outline ?? null,
            groupNames: characters.confirmedGroupRecords
                .filter(group => group.memberIds.includes(character.id))
                .map(group => liveCharacters.keyByCharacterId.get(group.id) ?? group.key)
                .sort((left, right) => left.localeCompare(right)),
        })).sort((left, right) => left.name.localeCompare(right.name));
    }, [
        characters.confirmedCharacterRecords,
        characters.confirmedGroupRecords,
        characterColorSaturation,
        liveCharacters.keyByCharacterId,
    ]);
    const groupItems = useMemo<AttributeManagerGroup[]>(() => {
        return characters.confirmedGroupRecords.map(group => ({
            id: group.id,
            name: liveCharacters.keyByCharacterId.get(group.id) ?? group.key,
            color: getConfirmedCharacterColor(
                group.id,
                normalizeCharacterColorHex(group.colorHex),
                characterColorSaturation,
            ),
            memberIds: group.memberIds,
            usageCount: liveCharacters.countsByCharacterId.get(group.id) ?? 0,
        })).sort((left, right) => left.name.localeCompare(right.name));
    }, [
        characters.confirmedGroupRecords,
        characterColorSaturation,
        liveCharacters.countsByCharacterId,
        liveCharacters.keyByCharacterId,
    ]);
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
        groupItems,
        sceneItems,
        musicItems,
    };
};
